import { NextRequest, NextResponse } from 'next/server';
import { apply, isErr, parseAction } from '@/lib/room';
import { store } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ code: string }> };

const norm = (c: string) => c.toUpperCase().trim();

/** GET /api/rooms/[code] — estado actual (respaldo si el SSE no llega). */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { code } = await ctx.params;
  const room = await store.get(norm(code));
  if (!room) return NextResponse.json({ error: 'Esa sala no existe o ya caducó.' }, { status: 404 });
  return NextResponse.json({ room });
}

/** POST /api/rooms/[code] — aplica una acción del jugador. */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { code } = await ctx.params;
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Falta la identidad del cliente.' }, { status: 400 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 }); }

  const action = parseAction(body);
  if (isErr(action)) return NextResponse.json(action, { status: 400 });

  const out = await store.mutate(norm(code), (room) => apply(room, clientId, action));
  if (isErr(out)) return NextResponse.json(out, { status: 409 });
  return NextResponse.json({ room: out });
}
