/**
 * GET /api/backup/reservations.ndjson
 *
 * Exports all reservations for the authenticated user as an NDJSON file.
 * NDJSON = Newline Delimited JSON, one object per line.
 *
 * TRULY LOSSLESS: Uses raw JSON objects without type coercion,
 * preserving ALL fields including unknown keys not in current schema.
 *
 * Read-only operation; does not modify any storage.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { userKeyFromEmail } from "@/lib/user";
import { fetchAllReservationsRaw, generateNDJSONV2, getBackupTimestamp } from "@/lib/backup";

export async function GET() {
    // 1. Validate session
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;

    if (!email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Derive userId
    const userId = userKeyFromEmail(email);

    try {
        // 3. Fetch all reservations as RAW objects (lossless)
        const result = await fetchAllReservationsRaw(userId);

        // 4. Generate NDJSON from raw objects (normalizes v1 → v2 on-the-fly)
        const ndjson = generateNDJSONV2(result.rawObjects);

        // 5. Create filename with timestamp
        const timestamp = getBackupTimestamp();
        const filename = `reservations_backup_${userId}_${timestamp}.ndjson`;

        // 6. Return NDJSON with proper headers
        return new NextResponse(ndjson, {
            status: 200,
            headers: {
                "Content-Type": "application/x-ndjson; charset=utf-8",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "X-Export-Count": String(result.exportedCount),
                "X-Export-Keys-Total": String(result.keyCount),
                "X-Export-Failed-Count": String(result.failedKeys.length),
            },
        });
    } catch (error) {
        console.error("[backup/ndjson] Export failed:", error);
        return NextResponse.json(
            { error: "Export failed" },
            { status: 500 }
        );
    }
}

