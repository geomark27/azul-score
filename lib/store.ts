import { Err, Room, isErr } from './room';
import { upstashStore } from './store-upstash';

/**
 * Contrato de persistencia de salas.
 *
 * `memoryStore` vale para un único proceso (next dev / next start / Render).
 * En serverless cada petición puede atenderla otra instancia, así que la memoria
 * no sirve: ahí hace falta un almacén externo (`store-upstash.ts`).
 */
export interface Store {
  /** `true` si el almacén puede avisar de los cambios (habilita SSE). */
  readonly push: boolean;
  /** Nombre del almacén activo, para el diagnóstico de /api/health. */
  readonly name: 'memoria' | 'redis';
  get(code: string): Promise<Room | null>;
  create(room: Room): Promise<void>;
  /** Lee, aplica `fn` y guarda de forma atómica. Un Err no persiste nada. */
  mutate(code: string, fn: (r: Room) => Room | Err): Promise<Room | Err>;
  /** Avisa de cada cambio. Devuelve la función para cancelar. */
  subscribe(code: string, cb: (r: Room) => void): () => void;
}

/** Una sala muere 12 h después del último cambio. */
export const TTL_MS = 12 * 60 * 60 * 1000;

type Mem = {
  rooms: Map<string, Room>;
  subs: Map<string, Set<(r: Room) => void>>;
  queue: Map<string, Promise<unknown>>;
};

// `globalThis` para sobrevivir al hot-reload de Next en desarrollo.
const g = globalThis as unknown as { __azulStore?: Mem };
const mem: Mem = (g.__azulStore ??= { rooms: new Map(), subs: new Map(), queue: new Map() });

function sweep() {
  const cutoff = Date.now() - TTL_MS;
  for (const [code, room] of mem.rooms)
    if (room.updatedAt < cutoff && !mem.subs.get(code)?.size) mem.rooms.delete(code);
}

function emit(room: Room) {
  for (const cb of mem.subs.get(room.code) ?? []) {
    try { cb(room); } catch {}
  }
}

export const memoryStore: Store = {
  push: true,
  name: 'memoria',

  async get(code) {
    sweep();
    return mem.rooms.get(code) ?? null;
  },

  async create(room) {
    mem.rooms.set(room.code, room);
  },

  // Serializa las escrituras por sala: dos jugadores tocando a la vez no se pisan.
  mutate(code, fn) {
    const prev = mem.queue.get(code) ?? Promise.resolve();
    const next = prev.then(async (): Promise<Room | Err> => {
      const room = mem.rooms.get(code);
      if (!room) return { error: 'Esa sala no existe o ya caducó.' };
      const out = fn(room);
      if (isErr(out)) return out;
      mem.rooms.set(code, out);
      emit(out);
      return out;
    });
    mem.queue.set(code, next.catch(() => {}));
    return next;
  },

  subscribe(code, cb) {
    let set = mem.subs.get(code);
    if (!set) mem.subs.set(code, (set = new Set()));
    set.add(cb);
    return () => {
      set!.delete(cb);
      if (!set!.size) mem.subs.delete(code);
    };
  },
};

/**
 * Si hay credenciales de Upstash (las inyecta la integración de Vercel), se usa
 * Redis; si no, la memoria del proceso.
 */
export const store: Store = upstashStore ?? memoryStore;
