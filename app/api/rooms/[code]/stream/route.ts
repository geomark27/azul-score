import { NextRequest } from 'next/server';
import { Room } from '@/lib/room';
import { store } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ code: string }> };

const PING_MS = 25_000; // mantiene viva la conexión frente a proxies

/** GET /api/rooms/[code]/stream — empuja cada cambio de la sala por SSE. */
export async function GET(req: NextRequest, ctx: Ctx) {
  const { code: raw } = await ctx.params;
  const code = raw.toUpperCase().trim();

  const room = await store.get(code);
  if (!room) return new Response('Sala no encontrada', { status: 404 });

  const enc = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let ping: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(ctrl) {
      let open = true;
      const send = (event: string, data: unknown) => {
        if (!open) return;
        try {
          ctrl.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          open = false;
        }
      };

      send('room', room);
      unsubscribe = store.subscribe(code, (r: Room) => send('room', r));
      ping = setInterval(() => send('ping', Date.now()), PING_MS);

      const close = () => {
        if (!open) return;
        open = false;
        unsubscribe?.();
        if (ping) clearInterval(ping);
        try { ctrl.close(); } catch {}
      };
      req.signal.addEventListener('abort', close);
    },
    cancel() {
      unsubscribe?.();
      if (ping) clearInterval(ping);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
