'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Action, Room } from './room';

const ID_KEY = 'azul-client-id';
const NAME_KEY = 'azul-player-name';
const POLL_MS = 4000; // red de seguridad si el SSE se cae

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

async function call(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', 'x-client-id': clientId(), ...init?.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || 'No se pudo contactar con la sala.');
  return body;
}

export const createRoom = (name: string): Promise<{ room: Room }> =>
  call('/api/rooms', { method: 'POST', body: JSON.stringify({ name }) });

export const fetchRoom = (code: string): Promise<{ room: Room }> =>
  call(`/api/rooms/${encodeURIComponent(code)}`);

export const sendAction = (code: string, action: Action): Promise<{ room: Room }> =>
  call(`/api/rooms/${encodeURIComponent(code)}`, { method: 'POST', body: JSON.stringify(action) });

export type Live = {
  room: Room | null;
  error: string | null;
  connected: boolean;
  /** Error de la última acción enviada, no de la conexión. */
  actionError: string | null;
  send: (a: Action) => Promise<void>;
  clearActionError: () => void;
};

/** Suscribe a una sala por SSE, con sondeo de respaldo, y expone `send`. */
export function useRoom(code: string): Live {
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const version = useRef(-1);

  // Descarta mensajes que lleguen desordenados (SSE y sondeo compiten).
  const accept = useCallback((r: Room) => {
    if (r.version < version.current) return;
    version.current = r.version;
    setRoom(r);
    setError(null);
  }, []);

  useEffect(() => {
    if (!code) return;
    let alive = true;

    const es = new EventSource(`/api/rooms/${encodeURIComponent(code)}/stream`);
    es.addEventListener('room', (e) => {
      if (!alive) return;
      setConnected(true);
      try { accept(JSON.parse((e as MessageEvent).data)); } catch {}
    });
    es.addEventListener('ping', () => alive && setConnected(true));
    es.onopen = () => alive && setConnected(true);
    es.onerror = () => {
      if (!alive) return;
      setConnected(false); // EventSource reconecta solo
    };

    const poll = setInterval(() => {
      fetchRoom(code)
        .then(({ room: r }) => alive && accept(r))
        .catch((e: Error) => alive && !room && setError(e.message));
    }, POLL_MS);

    fetchRoom(code)
      .then(({ room: r }) => alive && accept(r))
      .catch((e: Error) => alive && setError(e.message));

    return () => { alive = false; es.close(); clearInterval(poll); };
    // `room` se omite a propósito: solo se usa para decidir si mostrar el error.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, accept]);

  const send = useCallback(
    async (a: Action) => {
      try {
        const { room: r } = await sendAction(code, a);
        accept(r);
        setActionError(null);
      } catch (e) {
        setActionError((e as Error).message);
      }
    },
    [code, accept],
  );

  return {
    room, error, connected, actionError, send,
    clearActionError: () => setActionError(null),
  };
}
