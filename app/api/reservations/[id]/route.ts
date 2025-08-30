// app/api/reservations/[id]/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { updateReservation, deleteReservation } from '@/core/usecases';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { userKeyFromEmail } from '@/lib/user';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = userKeyFromEmail(session.user.email);

  const body = await req.json();
  try {
    const updated = await updateReservation(userId, params.id, body);
    return NextResponse.json(updated, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Invalid' }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = userKeyFromEmail(session.user.email);
  await deleteReservation(userId, params.id);
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}