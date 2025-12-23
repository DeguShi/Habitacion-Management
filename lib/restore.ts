/**
 * Restore Import Utilities
 *
 * Provides functions for parsing NDJSON backups and restoring reservations.
 * Supports dry-run, create-only, and overwrite modes with strong safety gates.
 *
 * SAFETY:
 * - Dry-run performs ZERO writes
 * - Create-only skips existing records
 * - Overwrite requires explicit confirmation
 * - All operations are scoped to the authenticated user's prefix
 */

import { keyExists, putJson } from "@/lib/s3";
import { detectSchemaVersion, normalizeV1ToV2 } from "@/lib/normalize";

// Maximum file size (10MB)
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Safe ID pattern: letters, numbers, underscores, and hyphens only.
 * - Explicitly supports UUID v4 format (e.g., "550e8400-e29b-41d4-a716-446655440000")
 * - The hyphen is at the END of the character class, which is valid regex syntax
 * - Rejects "/" and ".." to prevent path traversal/key injection
 */
const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

/**
 * Modes for restore operation
 */
export type RestoreMode = "dry-run" | "create-only" | "overwrite";

/**
 * Target prefix mode for restore
 */
export type TargetPrefixMode = "default" | "restore-sandbox";

/**
 * Represents a parsed record from NDJSON
 */
export interface ParsedRecord {
    line: number;
    valid: boolean;
    data?: unknown;
    id?: string;
    error?: string;
}

/**
 * Result of NDJSON parsing
 */
export interface ParseResult {
    records: ParsedRecord[];
    validRecords: Map<string, { line: number; data: unknown }>;
    parseErrorsCount: number;
    invalidRecordsCount: number;
    invalidSamples: Array<{ line: number; error: string }>;
    duplicateIdsCount: number;
    duplicateSamples: string[];
}

/**
 * Dry-run summary result
 */
export interface DryRunResult {
    mode: "dry-run";
    totalLines: number;
    validRecords: number;
    parseErrorsCount: number;
    invalidRecordsCount: number;
    invalidSamples: Array<{ line: number; error: string }>;
    duplicateIdsCount: number;
    duplicateSamples: string[];
    wouldCreateCount: number;
    wouldSkipCount: number;
    wouldOverwriteCount: number;
    conflicts: string[];
    targetPrefix: string;
    v1RecordsCount: number;
    v2RecordsCount: number;
    wouldNormalizeCount: number;
}

/**
 * Restore execution result
 */
export interface RestoreResult {
    mode: "create-only" | "overwrite";
    totalLines: number;
    validRecords: number;
    createdCount: number;
    skippedCount: number;
    overwrittenCount: number;
    errorCount: number;
    errors: Array<{ id: string; error: string }>;
    targetPrefix: string;
    normalizedCount: number;
}

/**
 * Validates that an ID is safe for use as an S3 key component.
 * Rejects IDs containing "/" or ".." to prevent key injection.
 */
export function isValidId(id: unknown): id is string {
    if (typeof id !== "string" || !id) return false;
    if (id.includes("/") || id.includes("..")) return false;
    return SAFE_ID_PATTERN.test(id);
}

/**
 * Parses NDJSON content line by line.
 * Handles duplicate IDs (last occurrence wins) and validates each record.
 */
export function parseNDJSON(content: string): ParseResult {
    const lines = content.split("\n").filter((line) => line.trim().length > 0);
    const records: ParsedRecord[] = [];
    const validRecords = new Map<string, { line: number; data: unknown }>();
    const invalidSamples: Array<{ line: number; error: string }> = [];
    const duplicateIds = new Set<string>();
    let parseErrorsCount = 0;
    let invalidRecordsCount = 0;

    for (let i = 0; i < lines.length; i++) {
        const lineNum = i + 1;
        const line = lines[i];

        try {
            const data = JSON.parse(line);

            // Must be an object
            if (!data || typeof data !== "object" || Array.isArray(data)) {
                invalidRecordsCount++;
                records.push({ line: lineNum, valid: false, error: "not an object" });
                if (invalidSamples.length < 5) {
                    invalidSamples.push({ line: lineNum, error: "not an object" });
                }
                continue;
            }

            const id = (data as Record<string, unknown>).id;

            // Validate ID
            if (!isValidId(id)) {
                invalidRecordsCount++;
                const error = !id
                    ? "missing id"
                    : typeof id !== "string"
                        ? "id must be string"
                        : "unsafe id (contains / or ..)";
                records.push({ line: lineNum, valid: false, error });
                if (invalidSamples.length < 5) {
                    invalidSamples.push({ line: lineNum, error });
                }
                continue;
            }

            // Check for duplicate - last occurrence wins
            if (validRecords.has(id)) {
                duplicateIds.add(id);
            }

            records.push({ line: lineNum, valid: true, data, id });
            validRecords.set(id, { line: lineNum, data });
        } catch {
            parseErrorsCount++;
            records.push({ line: lineNum, valid: false, error: "invalid JSON" });
            if (invalidSamples.length < 5) {
                invalidSamples.push({ line: lineNum, error: "invalid JSON" });
            }
        }
    }

    return {
        records,
        validRecords,
        parseErrorsCount,
        invalidRecordsCount,
        invalidSamples,
        duplicateIdsCount: duplicateIds.size,
        duplicateSamples: Array.from(duplicateIds).slice(0, 5),
    };
}

/**
 * Generates the target prefix for restore operations.
 */
export function getTargetPrefix(
    userId: string,
    mode: TargetPrefixMode,
    sandboxId?: string
): string {
    if (mode === "restore-sandbox") {
        const actualSandboxId = sandboxId || generateSandboxId();
        return `users/${userId}/restore_sandbox/${actualSandboxId}/reservations/`;
    }
    return `users/${userId}/reservations/`;
}

/**
 * Generates a sandbox ID from current timestamp.
 */
function generateSandboxId(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    return `${yyyy}${mm}${dd}_${hh}${min}${ss}`;
}

/**
 * Performs a dry-run analysis without writing anything.
 * Checks for conflicts with existing records and detects schema versions.
 */
export async function performDryRun(
    parseResult: ParseResult,
    targetPrefix: string
): Promise<DryRunResult> {
    const conflicts: string[] = [];
    let wouldCreateCount = 0;
    let wouldOverwriteCount = 0;
    let v1RecordsCount = 0;
    let v2RecordsCount = 0;

    // Check each valid record for conflicts and detect schema versions
    for (const [id, { data }] of parseResult.validRecords) {
        const key = `${targetPrefix}${id}.json`;
        const exists = await keyExists(key);
        if (exists) {
            wouldOverwriteCount++;
            if (conflicts.length < 20) {
                conflicts.push(id);
            }
        } else {
            wouldCreateCount++;
        }

        // Detect schema version
        const detection = detectSchemaVersion(data);
        if (detection.valid && detection.version === 2) {
            v2RecordsCount++;
        } else {
            v1RecordsCount++;
        }
    }

    return {
        mode: "dry-run",
        totalLines: parseResult.records.length,
        validRecords: parseResult.validRecords.size,
        parseErrorsCount: parseResult.parseErrorsCount,
        invalidRecordsCount: parseResult.invalidRecordsCount,
        invalidSamples: parseResult.invalidSamples,
        duplicateIdsCount: parseResult.duplicateIdsCount,
        duplicateSamples: parseResult.duplicateSamples,
        wouldCreateCount,
        wouldSkipCount: 0, // dry-run doesn't skip
        wouldOverwriteCount,
        conflicts,
        targetPrefix,
        v1RecordsCount,
        v2RecordsCount,
        wouldNormalizeCount: v1RecordsCount, // All v1 records would be normalized
    };
}

/**
 * Executes the restore operation.
 * - create-only: Only writes records that don't exist
 * - overwrite: Writes all records, overwriting existing
 *
 * V2 NORMALIZATION:
 * - When normalize=true (default): v1 records are normalized to v2 before writing
 * - When normalize=false: writes raw objects as-is (dangerous, use in sandbox only)
 *
 * IMPORTANT: RAW OBJECT PRESERVATION (when not normalizing)
 * - Writes objects EXACTLY as parsed from NDJSON
 * - NO Zod validation/parsing (would strip unknown keys)
 * - NO type coercion (preserves exact values)
 * - NO pricing recalculation
 */
export async function executeRestore(
    parseResult: ParseResult,
    targetPrefix: string,
    mode: "create-only" | "overwrite",
    normalize: boolean = true
): Promise<RestoreResult> {
    let createdCount = 0;
    let skippedCount = 0;
    let overwrittenCount = 0;
    let errorCount = 0;
    let normalizedCount = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const [id, { data }] of parseResult.validRecords) {
        const key = `${targetPrefix}${id}.json`;

        try {
            const exists = await keyExists(key);

            if (mode === "create-only" && exists) {
                skippedCount++;
                continue;
            }

            // Determine what to write
            let dataToWrite = data as Record<string, unknown>;

            if (normalize) {
                // Detect version and normalize v1 to v2
                const detection = detectSchemaVersion(data);
                if (detection.valid && detection.version === 1) {
                    dataToWrite = normalizeV1ToV2(data as Record<string, unknown>);
                    normalizedCount++;
                }
                // v2 records pass through unchanged
            }

            // Write the record
            await putJson(key, dataToWrite);

            if (exists) {
                overwrittenCount++;
            } else {
                createdCount++;
            }
        } catch (e: unknown) {
            errorCount++;
            const errorMsg = e instanceof Error ? e.message : "unknown error";
            if (errors.length < 10) {
                errors.push({ id, error: errorMsg });
            }
        }
    }

    return {
        mode,
        totalLines: parseResult.records.length,
        validRecords: parseResult.validRecords.size,
        createdCount,
        skippedCount,
        overwrittenCount,
        errorCount,
        errors,
        targetPrefix,
        normalizedCount,
    };
}

/**
 * Validates overwrite confirmation.
 * Requires both confirmOverwrite=true AND confirmText="OVERWRITE".
 */
export function validateOverwriteConfirmation(
    confirmOverwrite: unknown,
    confirmText: unknown
): { valid: boolean; error?: string } {
    if (confirmOverwrite !== "true" && confirmOverwrite !== true) {
        return { valid: false, error: "confirmOverwrite must be true for overwrite mode" };
    }
    if (confirmText !== "OVERWRITE") {
        return { valid: false, error: 'confirmText must be exactly "OVERWRITE"' };
    }
    return { valid: true };
}
