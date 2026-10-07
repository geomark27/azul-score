import { Err, Room, isErr } from './room';

/**
 * Contrato de persistencia de salas. La implementación en memoria sirve para
 * un único proceso (next dev / next start). Para desplegar en serverless hay
 * que escribir otra implementación (Supabase, Redis…) y exportarla aquí abajo:
 * nada más del proyecto depende de cuál esté activa.
 */
export interface Store {
  get(code: string): Promise<Room | null>;
  create(room: Room): Promise<void>;
  /** Lee, aplica `fn` y guarda de forma atómica. Un Err no persiste nada. */
  mutate(code: string, fn: (r: Room) => Room | Err): Promise<Room | Err>;
  /** Avisa de cada cambio. Devuelve la función para cancelar. */
  subscribe(code: string, cb: (r: Room) => void): () => void;
}

const TTL = 12 * 60 * 60 * 1000; // una sala muere 12 h después del último cambio

type Mem = {
  rooms: Map<string, Room>;
  subs: Map<string, Set<(r: Room) => void>>;
  queue: Map<string, Promise<unknown>>;
};

// `globalThis` para sobrevivir al hot-reload de Next en desarrollo.
const g = globalThis as unknown as { __azulStore?: Mem };
const mem: Mem = (g.__azulStore ??= { rooms: new Map(), subs: new Map(), queue: new Map() });

function sweep() {
  const cutoff = Date.now() - TTL;
  for (const [code, room] of mem.rooms)
    if (room.updatedAt < cutoff && !mem.subs.get(code)?.size) mem.rooms.delete(code);
}

function emit(room: Room) {
  for (const cb of mem.subs.get(room.code) ?? []) {
    try { cb(room); } catch {}
  }
}

export const memoryStore: Store = {
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

export const store: Store = memoryStore;
