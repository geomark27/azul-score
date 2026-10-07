import { NextRequest, NextResponse } from 'next/server';
import { cleanName, newCode, newRoom } from '@/lib/room';
import { store } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/rooms — el anfitrión abre una sala nueva. */
export async function POST(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Falta la identidad del cliente.' }, { status: 400 });

  let name = '';
  try {
    const body = await req.json();
    name = cleanName(body?.name);
  } catch {}

  // Reintenta por si el código ya está ocupado.
  for (let i = 0; i < 20; i++) {
    const code = newCode();
    if (await store.get(code)) continue;
    const room = newRoom(code, clientId, name);
    await store.create(room);
    return NextResponse.json({ room });
  }
  return NextResponse.json({ error: 'No se pudo crear la sala, inténtalo otra vez.' }, { status: 503 });
}
