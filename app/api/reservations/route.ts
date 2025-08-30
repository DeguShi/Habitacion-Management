// app/api/reservations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createReservation, listReservations } from "@/core/usecases";
import { requireUserIdFromSession } from "@/lib/user";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserIdFromSession();
    const url = new URL(req.url);
    const month = url.searchParams.get("month") || undefined;
    const items = await listReservations(userId, month);
    return NextResponse.json(items);
  } catch (e: any) {
    const status = e?.status || 401;
    return NextResponse.json({ error: e.message || "Unauthorized" }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserIdFromSession();
    const body = await req.json();
    const created = await createReservation(userId, body);
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    const status = e?.status || 400;
    return NextResponse.json({ error: e.message || "Invalid" }, { status });
  }
}