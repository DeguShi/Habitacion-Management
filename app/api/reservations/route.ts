// app/api/reservations/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createReservation, listReservations } from '@/core/usecases';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { userKeyFromEmail } from '@/lib/user';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.email ? userKeyFromEmail(session.user.email) : undefined;

  const url = new URL(req.url);
  const month = url.searchParams.get('month') || undefined;

  const items = userId
    ? await listReservations(userId, month)
    : await listReservations(/* legacy global */ '' as any, month); // no-op if your signature is (month?: string)

  return NextResponse.json(items, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = userKeyFromEmail(session.user.email);

  const body = await req.json();
  try {
    const created = await createReservation(userId, body);
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Invalid' }, { status: 400 });
  }
}