/**
 * POST /api/backup/restore
 *
 * Restores reservations from an NDJSON backup file.
 *
 * Modes:
 * - dry-run (default): Preview only, no writes
 * - create-only: Write new records, skip existing
 * - overwrite: Replace all records (requires confirmation)
 *
 * SAFETY:
 * - All operations scoped to authenticated user's prefix
 * - Overwrite requires confirmOverwrite=true AND confirmText="OVERWRITE"
 * - File size limited to 10MB
 * - No type coercion, preserves raw data
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { userKeyFromEmail } from "@/lib/user";
import {
    parseNDJSON,
    performDryRun,
    executeRestore,
    validateOverwriteConfirmation,
    getTargetPrefix,
    MAX_FILE_SIZE_BYTES,
    type RestoreMode,
    type TargetPrefixMode,
} from "@/lib/restore";

export async function POST(request: NextRequest) {
    // 1. Validate session
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;

    if (!email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Derive userId (NEVER from client)
    const userId = userKeyFromEmail(email);

    try {
        // 3. Parse multipart form data
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const modeParam = formData.get("mode") as string | null;
        const targetPrefixMode = (formData.get("targetPrefixMode") as string) || "default";
        const sandboxId = formData.get("sandboxId") as string | null;
        const confirmOverwrite = formData.get("confirmOverwrite");
        const confirmText = formData.get("confirmText");

        // 4. Validate file
        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
            return NextResponse.json(
                { error: `File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB` },
                { status: 400 }
            );
        }

        // 5. Validate mode
        const mode: RestoreMode = (modeParam as RestoreMode) || "dry-run";
        if (!["dry-run", "create-only", "overwrite"].includes(mode)) {
            return NextResponse.json(
                { error: "Invalid mode. Must be: dry-run, create-only, or overwrite" },
                { status: 400 }
            );
        }

        // 6. Validate target prefix mode
        if (!["default", "restore-sandbox"].includes(targetPrefixMode)) {
            return NextResponse.json(
                { error: "Invalid targetPrefixMode. Must be: default or restore-sandbox" },
                { status: 400 }
            );
        }

        // 7. Gate overwrite mode
        if (mode === "overwrite") {
            const confirmation = validateOverwriteConfirmation(confirmOverwrite, confirmText);
            if (!confirmation.valid) {
                return NextResponse.json(
                    { error: confirmation.error },
                    { status: 400 }
                );
            }
        }

        // 8. Read and parse file content
        const content = await file.text();
        const parseResult = parseNDJSON(content);

        // 9. Determine target prefix
        const targetPrefix = getTargetPrefix(
            userId,
            targetPrefixMode as TargetPrefixMode,
            sandboxId || undefined
        );

        // 10. Execute based on mode
        if (mode === "dry-run") {
            const result = await performDryRun(parseResult, targetPrefix);
            return NextResponse.json(result);
        }

        // create-only or overwrite
        const result = await executeRestore(parseResult, targetPrefix, mode);
        return NextResponse.json(result);
    } catch (error) {
        console.error("[backup/restore] Restore failed:", error);
        return NextResponse.json(
            { error: "Restore operation failed" },
            { status: 500 }
        );
    }
}
