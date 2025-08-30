import { NextResponse } from "next/server";
import { getJson } from "@/lib/s3";
import { reservationToICS } from "@/utils/ics";
import type { Reservation } from "@/core/entities";
import { getServerSession } from 'next-auth'
import { authOptions } from from '@/lib/auth.config'
import { userKeyFromEmail } from "@/lib/user";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uid = userKeyFromEmail(session.user.email);
  const res = await getJson<Reservation>(`users/${uid}/reservations/${params.id}.json`);
  if (!res) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ics = reservationToICS(res);
  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename=reservation-${res.id}.ics`,
    },
  });
}