import { Err, Room, isErr } from './room';
import type { Store } from './store';

/**
 * Salas guardadas en Upstash Redis por su API REST.
 *
 * En serverless (Vercel) cada petición puede caer en una instancia distinta, así
 * que el estado no puede vivir en la memoria del proceso. Aquí vive en Redis y lo
 * ven todas las instancias por igual.
 *
 * Se usa `fetch` directo en vez del SDK para no añadir dependencias al proyecto.
 */

// La integración de Upstash en Vercel inyecta UPSTASH_*; Vercel KV inyecta KV_*.
const URL_ = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? '';
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? '';

const TTL_S = 12 * 60 * 60; // se renueva en cada escritura
const RETRIES = 6;

const key = (code: string) => `azul:room:${code}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const GONE: Err = { error: 'Esa sala no existe o ya caducó.' };

async function cmd<T>(args: (string | number)[]): Promise<T> {
  const res = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args.map(String)),
    cache: 'no-store',
  });
  const body = (await res.json().catch(() => null)) as { result?: T; error?: string } | null;
  if (!res.ok || body?.error) throw new Error(body?.error ?? `Redis respondió ${res.status}`);
  return body?.result as T;
}

/**
 * Escribe solo si la versión en Redis sigue siendo la que leímos (compare-and-set).
 * Evita que dos jugadores que tocan a la vez se pisen, sin necesidad de bloqueos.
 *   1 = escrito · 0 = otro escribió antes, hay que reintentar · -1 = la sala no está
 */
const CAS = `
local cur = redis.call('GET', KEYS[1])
if not cur then return -1 end
local ok, obj = pcall(cjson.decode, cur)
if not ok then return -1 end
if obj.version ~= tonumber(ARGV[1]) then return 0 end
redis.call('SET', KEYS[1], ARGV[2], 'EX', tonumber(ARGV[3]))
return 1
`.trim();

const impl: Store = {
  // La API REST no da pub/sub, así que el cliente sondea en vez de usar SSE.
  push: false,
  name: 'redis',

  async get(code) {
    const raw = await cmd<string | null>(['GET', key(code)]);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Room;
    } catch {
      return null;
    }
  },

  async create(room) {
    const ok = await cmd<string | null>([
      'SET', key(room.code), JSON.stringify(room), 'EX', TTL_S, 'NX',
    ]);
    if (ok === null) throw new Error('Ese código de sala ya está en uso.');
  },

  async mutate(code, fn) {
    for (let i = 0; i < RETRIES; i++) {
      const room = await this.get(code);
      if (!room) return GONE;

      const out = fn(room);
      if (isErr(out)) return out;

      const r = await cmd<number>([
        'EVAL', CAS, 1, key(code), room.version, JSON.stringify(out), TTL_S,
      ]);
      if (r === 1) return out;
      if (r === -1) return GONE;
      await sleep(25 + i * 35); // otro jugador escribió primero: releer y reintentar
    }
    return { error: 'La sala recibió muchos cambios a la vez. Inténtalo otra vez.' };
  },

  // Sin pub/sub por REST no hay nada a lo que suscribirse.
  subscribe() {
    return () => {};
  },
};

export const upstashStore: Store | null = URL_ && TOKEN ? impl : null;
