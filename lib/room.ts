import { PEN, Player, Standing, closeRoundFor, hasFullRow, newPlayer, standings } from './azul';

export const MAX_SEATS = 4;
export const MIN_SEATS = 2;

export type Seat = {
  name: string;
  clientId: string | null; // null = asiento abandonado, se puede reclamar
  ready: boolean;
  player: Player;
};

export type Room = {
  code: string;
  hostId: string;
  view: 'lobby' | 'game' | 'final';
  seats: Seat[];
  round: number;
  starter: number; // asiento que abre la ronda en curso
  first: number | null; // asiento que tomó la ficha de jugador inicial
  history: string[];
  version: number;
  updatedAt: number;
};

export type Action =
  | { t: 'join'; name: string }
  | { t: 'rename'; name: string }
  | { t: 'leave' }
  | { t: 'start' }
  | { t: 'tap'; r: number; c: number }
  | { t: 'floor'; delta: number }
  | { t: 'first' }
  | { t: 'ready'; value: boolean }
  | { t: 'close' }
  | { t: 'undo' }
  | { t: 'finish' }
  | { t: 'reopen' };

/** Error de aplicación: el reducer devuelve esto en vez de lanzar. */
export type Err = { error: string };
export const isErr = (x: unknown): x is Err =>
  typeof x === 'object' && x !== null && 'error' in x;

// Sin caracteres ambiguos (0/O, 1/I, 5/S).
const ALPHABET = 'ABCDEFGHJKLMNPQRTUVWXY2346789';

export function newCode(rnd: () => number = Math.random) {
  let s = '';
  for (let i = 0; i < 4; i++) s += ALPHABET[Math.floor(rnd() * ALPHABET.length)];
  return s;
}

export const cleanName = (n: unknown) =>
  typeof n === 'string' ? n.replace(/\s+/g, ' ').trim().slice(0, 14) : '';

export function newRoom(code: string, hostId: string, hostName: string): Room {
  const name = cleanName(hostName) || 'Anfitrión';
  return {
    code,
    hostId,
    view: 'lobby',
    seats: [{ name, clientId: hostId, ready: false, player: newPlayer(name) }],
    round: 1,
    starter: 0,
    first: null,
    history: [],
    version: 1,
    updatedAt: Date.now(),
  };
}

export const seatOf = (room: Room, clientId: string) =>
  room.seats.findIndex((s) => s.clientId === clientId);

export const isHost = (room: Room, clientId: string) => room.hostId === clientId;

/** Valida la forma de una acción recibida por la red. */
export function parseAction(raw: unknown): Action | Err {
  if (typeof raw !== 'object' || raw === null) return { error: 'Acción inválida.' };
  const a = raw as Record<string, unknown>;
  switch (a.t) {
    case 'join':
    case 'rename':
      return { t: a.t, name: cleanName(a.name) };
    case 'tap': {
      const r = Number(a.r), c = Number(a.c);
      if (!Number.isInteger(r) || !Number.isInteger(c) || r < 0 || r > 4 || c < 0 || c > 4)
        return { error: 'Casilla fuera de rango.' };
      return { t: 'tap', r, c };
    }
    case 'floor': {
      const delta = Number(a.delta);
      if (delta !== 1 && delta !== -1) return { error: 'Paso de suelo inválido.' };
      return { t: 'floor', delta };
    }
    case 'ready':
      return { t: 'ready', value: !!a.value };
    case 'leave': case 'start': case 'first': case 'close': case 'undo':
    case 'finish': case 'reopen':
      return { t: a.t };
    default:
      return { error: 'Acción desconocida.' };
  }
}

/**
 * Aplica una acción. Devuelve la sala nueva o un Err.
 * No muta `room`: el llamador decide si persiste el resultado.
 */
export function apply(room: Room, clientId: string, action: Action): Room | Err {
  const d: Room = structuredClone(room);
  const i = seatOf(d, clientId);
  const host = isHost(d, clientId);
  const mine = i >= 0 ? d.seats[i] : null;

  const hostOnly = () => (host ? null : { error: 'Solo el anfitrión puede hacer esto.' });
  const seated = () => (mine ? null : { error: 'No estás sentado en esta partida.' });
  const inGame = () => (d.view === 'game' ? null : { error: 'La partida no está en curso.' });

  switch (action.t) {
    case 'join': {
      const name = action.name || `Jugador ${d.seats.length + 1}`;
      if (mine) { mine.name = name; mine.player.name = name; break; }
      if (d.view !== 'lobby') {
        // Partida empezada: solo se puede retomar un asiento abandonado.
        const free = d.seats.findIndex((s) => s.clientId === null && s.name === name);
        if (free < 0) return { error: 'La partida ya empezó y no hay un asiento libre con ese nombre.' };
        d.seats[free].clientId = clientId;
        break;
      }
      if (d.seats.length >= MAX_SEATS) return { error: 'La sala ya tiene 4 jugadores.' };
      if (d.seats.some((s) => s.name.toLowerCase() === name.toLowerCase()))
        return { error: 'Ya hay alguien con ese nombre en la sala.' };
      d.seats.push({ name, clientId, ready: false, player: newPlayer(name) });
      break;
    }

    case 'rename': {
      const e = seated(); if (e) return e;
      const name = action.name;
      if (!name) return { error: 'El nombre no puede quedar vacío.' };
      if (d.seats.some((s, k) => k !== i && s.name.toLowerCase() === name.toLowerCase()))
        return { error: 'Ya hay alguien con ese nombre en la sala.' };
      mine!.name = name;
      mine!.player.name = name;
      break;
    }

    case 'leave': {
      const e = seated(); if (e) return e;
      if (d.view === 'lobby') {
        d.seats.splice(i, 1);
        if (d.first !== null) d.first = d.first === i ? null : d.first > i ? d.first - 1 : d.first;
        if (d.starter >= d.seats.length) d.starter = 0;
      } else {
        mine!.clientId = null; // el asiento queda reclamable
        mine!.ready = false;
      }
      // Si se va el anfitrión, el asiento más antiguo que quede toma el relevo.
      if (host) {
        const next = d.seats.find((s) => s.clientId && s.clientId !== clientId);
        if (next) d.hostId = next.clientId!;
      }
      break;
    }

    case 'start': {
      const e = hostOnly(); if (e) return e;
      // Desde el lobby se inicia; desde el resultado final es una revancha.
      if (d.view === 'game') return { error: 'La partida ya está en curso.' };
      if (d.seats.length < MIN_SEATS) return { error: 'Hacen falta al menos 2 jugadores.' };
      d.view = 'game';
      d.round = 1;
      d.starter = 0;
      d.first = null;
      d.history = [];
      d.seats.forEach((s) => { s.ready = false; s.player = newPlayer(s.name); });
      break;
    }

    case 'tap': {
      const e = seated() ?? inGame(); if (e) return e;
      const w = mine!.player;
      if (w.wall[action.r][action.c]) return { error: 'Ese azulejo ya está colocado.' };
      w.pending[action.r] = w.pending[action.r] === action.c ? -1 : action.c;
      mine!.ready = false;
      break;
    }

    case 'floor': {
      const e = seated() ?? inGame(); if (e) return e;
      mine!.player.floor = Math.max(0, Math.min(PEN.length, mine!.player.floor + action.delta));
      mine!.ready = false;
      break;
    }

    case 'first': {
      const e = seated() ?? inGame(); if (e) return e;
      // La ficha es única: tomarla se la quita a quien la tuviera.
      d.first = d.first === i ? null : i;
      break;
    }

    case 'ready': {
      const e = seated() ?? inGame(); if (e) return e;
      mine!.ready = action.value;
      break;
    }

    case 'close': {
      const e = hostOnly() ?? inGame(); if (e) return e;
      d.history.push(JSON.stringify({
        seats: d.seats.map((s) => s.player),
        round: d.round, starter: d.starter, first: d.first,
      }));
      d.seats.forEach((s, k) => { s.player = closeRoundFor(s.player, k === d.first); s.ready = false; });
      if (d.first !== null) d.starter = d.first;
      d.first = null;
      d.round += 1;
      break;
    }

    case 'undo': {
      const e = hostOnly(); if (e) return e;
      const h = d.history.pop();
      if (!h) return { error: 'No hay ninguna ronda que deshacer.' };
      const o = JSON.parse(h) as { seats: Player[]; round: number; starter: number; first: number | null };
      d.seats.forEach((s, k) => { if (o.seats[k]) s.player = o.seats[k]; s.ready = false; });
      d.round = o.round;
      d.starter = o.starter;
      d.first = o.first;
      d.view = 'game';
      break;
    }

    case 'finish': {
      const e = hostOnly(); if (e) return e;
      if (d.view === 'lobby') return { error: 'La partida no ha empezado.' };
      d.view = 'final';
      break;
    }

    case 'reopen': {
      const e = hostOnly(); if (e) return e;
      d.view = 'game';
      break;
    }
  }

  d.version = room.version + 1;
  d.updatedAt = Date.now();
  return d;
}

/* ---------- Derivados para la interfaz ---------- */

export const allReady = (room: Room) =>
  room.seats.length > 0 && room.seats.every((s) => s.ready);

export const lastRound = (room: Room) =>
  hasFullRow(room.seats.map((s) => s.player));

export const roomStandings = (room: Room): Standing[] =>
  standings(room.seats.map((s) => s.player));
