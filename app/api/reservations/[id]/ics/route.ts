// app/api/reservations/[id]/ics/route.ts
import { NextResponse } from "next/server";
import { getJson } from "@/lib/s3";
import { reservationToICS } from "@/utils/ics";
import type { Reservation } from "@/core/entities";
import { requireUserIdFromSession } from "@/lib/user";

function prefix(userId: string) {
  return `users/${userId}/reservations/`;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserIdFromSession();
    const res = await getJson<Reservation>(`${prefix(userId)}${params.id}.json`);
    if (!res) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const ics = reservationToICS(res);
    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename=reservation-${res.id}.ics`,
      },
    });
  } catch (e: any) {
    const status = e?.status || 401;
    return NextResponse.json({ error: e.message || "Unauthorized" }, { status });
  }
}