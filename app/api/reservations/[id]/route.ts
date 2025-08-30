// app/api/reservations/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { updateReservation, deleteReservation } from "@/core/usecases";
import { requireUserIdFromSession } from "@/lib/user";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserIdFromSession();
    const body = await req.json();
    const updated = await updateReservation(userId, params.id, body);
    return NextResponse.json(updated);
  } catch (e: any) {
    const status = e?.status || 400;
    return NextResponse.json({ error: e.message || "Invalid" }, { status });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserIdFromSession();
    await deleteReservation(userId, params.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const status = e?.status || 400;
    return NextResponse.json({ error: e.message || "Invalid" }, { status });
  }
}