'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Action, Room } from './room';

const ID_KEY = 'azul-client-id';
const NAME_KEY = 'azul-player-name';

/** Ritmo de sondeo según lo que pueda hacer el servidor. */
const POLL_PUSH = 8000; // hay SSE: esto es solo red de seguridad
const POLL_LIVE = 2000; // sin SSE y mirando la pantalla
const POLL_IDLE = 10000; // sin SSE y con la pestaña en segundo plano

/** Identidad estable del navegador; es lo que ata a una persona con su asiento. */
export function clientId(): string {
  try {
    let id = localStorage.getItem(ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ID_KEY, id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

export const savedName = () => {
  try { return localStorage.getItem(NAME_KEY) ?? ''; } catch { return ''; }
};
export const saveName = (n: string) => {
  try { localStorage.setItem(NAME_KEY, n); } catch {}
};

/** Error de red que distingue «la sala ya no está» de un fallo pasajero. */
export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
  /** La sala no existe: caducó o nunca existió. */
  get gone() {
    return this.status === 404;
  }
}

async function call(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', 'x-client-id': clientId(), ...init?.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body?.error || 'No se pudo contactar con la sala.', res.status);
  return body;
}

export const createRoom = (name: string): Promise<{ room: Room }> =>
  call('/api/rooms', { method: 'POST', body: JSON.stringify({ name }) });

export const fetchRoom = (code: string): Promise<{ room: Room; push: boolean }> =>
  call(`/api/rooms/${encodeURIComponent(code)}`);

export const sendAction = (code: string, action: Action): Promise<{ room: Room }> =>
  call(`/api/rooms/${encodeURIComponent(code)}`, { method: 'POST', body: JSON.stringify(action) });

export type Live = {
  room: Room | null;
  error: string | null;
  connected: boolean;
  /** La sala ya no existe en el servidor: caducó o se borró. */
  gone: boolean;
  /** Error de la última acción enviada, no de la conexión. */
  actionError: string | null;
  send: (a: Action) => Promise<void>;
  clearActionError: () => void;
};

/**
 * Mantiene la sala al día y expone `send`.
 *
 * Si el servidor puede empujar cambios (almacén en memoria), usa SSE y el sondeo
 * queda de respaldo. Si no puede (Redis por REST, que es el caso en serverless),
 * sondea cada 2 s mientras se esté mirando la pantalla y cada 10 s si no.
 */
export function useRoom(code: string): Live {
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [gone, setGone] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const version = useRef(-1);
  const hasRoom = useRef(false);

  // Descarta mensajes que lleguen desordenados (SSE y sondeo compiten).
  const accept = useCallback((r: Room) => {
    if (r.version < version.current) return;
    version.current = r.version;
    hasRoom.current = true;
    setRoom(r);
    setError(null);
  }, []);

  useEffect(() => {
    if (!code) return;

    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let es: EventSource | null = null;
    let push = false;

    const delay = () =>
      push ? POLL_PUSH : document.visibilityState === 'hidden' ? POLL_IDLE : POLL_LIVE;

    const openStream = () => {
      if (es) return;
      es = new EventSource(`/api/rooms/${encodeURIComponent(code)}/stream`);
      es.addEventListener('room', (e) => {
        if (!alive) return;
        setConnected(true);
        try { accept(JSON.parse((e as MessageEvent).data)); } catch {}
      });
      es.addEventListener('ping', () => alive && setConnected(true));
      es.onerror = () => alive && setConnected(false); // EventSource reconecta solo
    };

    const tick = async () => {
      try {
        const { room: r, push: p } = await fetchRoom(code);
        if (!alive) return;
        accept(r);
        setConnected(true);
        if (p) { push = true; openStream(); }
      } catch (e) {
        if (!alive) return;
        setConnected(false);
        // Un 404 es definitivo: la sala ya no está y no va a volver.
        if (e instanceof ApiError && e.gone) {
          setGone(true);
          return; // se deja de sondear; la pantalla redirige a la portada
        }
        // Un fallo pasajero solo se muestra si aún no cargamos la sala:
        // no debe borrar una partida en curso.
        if (!hasRoom.current) setError((e as Error).message);
      }
      if (alive) timer = setTimeout(tick, delay());
    };

    // Al volver a la pestaña, refrescar ya en vez de esperar al siguiente sondeo.
    const onVisible = () => {
      if (!alive || document.visibilityState !== 'visible') return;
      if (timer) clearTimeout(timer);
      void tick();
    };
    document.addEventListener('visibilitychange', onVisible);

    void tick();

    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      es?.close();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [code, accept]);

  const send = useCallback(
    async (a: Action) => {
      try {
        const { room: r } = await sendAction(code, a);
        accept(r);
        setActionError(null);
      } catch (e) {
        if (e instanceof ApiError && e.gone) { setGone(true); return; }
        setActionError((e as Error).message);
      }
    },
    [code, accept],
  );

  return {
    room, error, connected, gone, actionError, send,
    clearActionError: () => setActionError(null),
  };
}
