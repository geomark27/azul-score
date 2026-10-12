import { NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { COMMIT, VERSION } from '@/lib/version';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/health — diagnóstico del despliegue.
 *
 * Sirve para comprobar de un vistazo si el entorno está usando Redis o se ha
 * quedado en la memoria del proceso (que en serverless pierde las salas).
 * No devuelve credenciales ni detalles de la conexión.
 */
export async function GET() {
  const t0 = Date.now();

  // Lectura inocua: confirma que el almacén responde de verdad, no solo que
  // existen las variables de entorno.
  let responde = false;
  try {
    await store.get('__health__');
    responde = true;
  } catch {
    responde = false;
  }

  const serverless = !!process.env.VERCEL;
  const ok = responde && !(serverless && store.name === 'memoria');

  return NextResponse.json(
    {
      ok,
      version: VERSION,
      commit: COMMIT || null,
      almacen: store.name,
      cambiosEnVivo: store.push ? 'SSE' : 'sondeo',
      responde,
      serverless,
      aviso:
        serverless && store.name === 'memoria'
          ? 'Estás en serverless con el almacén en memoria: las salas se perderán entre peticiones. Falta conectar Upstash Redis y volver a desplegar.'
          : null,
      ms: Date.now() - t0,
    },
    { status: ok ? 200 : 503 },
  );
}
