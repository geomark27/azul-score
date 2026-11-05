import {
  PEN, Player, Standing, closeRoundFor, hasFullRow, newPlayer, roundEndsGame, standings,
} from './azul';
import {
  Clock, closeRoundClock, endOffer, isClockMinutes, newClock, passTurn, startOffer, togglePause,
} from './clock';
import { JournalSource, RoundRecord, markUndone, roundPlayer } from './registro';

export const MAX_SEATS = 4;
export const MIN_SEATS = 2;

export type Seat = {
  name: string;
  clientId: string | null; // null = asiento abandonado, se puede reclamar
  ready: boolean;
  player: Player;
  /**
   * Momento del último aviso del anfitrión («te estamos esperando»). Su móvil
   * lo detecta como nuevo al cambiar el valor y le salta el aviso.
   */
  nudgedAt?: number;
};

/** Tiempo mínimo entre dos avisos a la misma persona: evita bombardearla. */
export const NUDGE_GAP_MS = 10_000;

export type Room = {
  code: string;
  hostId: string;
  /** `closed`: el anfitrión cerró la sala; los móviles vuelven a la portada. */
  view: 'lobby' | 'game' | 'final' | 'closed';
  seats: Seat[];
  round: number;
  starter: number; // asiento que abre la ronda en curso (el de la ficha 1; en la 1.ª, sorteado)
  /**
   * La ronda espera a que quien la abre pulse «Empezar ronda». Mientras tanto
   * nadie puede anotar. Ausente en salas anteriores a esta regla: no esperan.
   */
  waiting?: boolean;
  first: number | null; // asiento que tomó la ficha de jugador inicial
  /** Modo competitivo elegido en el lobby: minutos por jugador, o null para jugar sin reloj. */
  clockMinutes?: number | null;
  /** Reloj de la partida en curso; null o ausente = modo normal. */
  clock?: Clock | null;
  history: string[];
  /** Momento en que empezó la partida. Ausente en salas anteriores al registro. */
  startedAt?: number;
  /**
   * Registro de movimientos: cada ronda cerrada, también las deshechas (marcadas).
   * A diferencia de `history`, no se vacía al terminar: es lo que se descarga.
   */
  journal?: RoundRecord[];
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
  | { t: 'nudge' }
  | { t: 'clock_config'; minutes: number | null }
  | { t: 'round_start' }
  | { t: 'turn_pass' }
  | { t: 'turn_stop' }
  | { t: 'clock_pause' }
  | { t: 'close' }
  | { t: 'undo' }
  | { t: 'finish' }
  | { t: 'close_room' };

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

/**
 * Saca el código de sala de lo que lea el escáner: el enlace del QR
 * (`https://…/sala/ABCD`) o el código suelto. Solo se usa el código, así que
 * un QR ajeno nunca lleva a otra web.
 */
export function codeFromScan(text: string): string | null {
  const t = text.trim();
  const m = /\/sala\/([A-Za-z0-9]{4})(?:[/?#]|$)/.exec(t) ?? /^([A-Za-z0-9]{4})$/.exec(t);
  if (!m) return null;
  const code = m[1].toUpperCase();
  return [...code].every((ch) => ALPHABET.includes(ch)) ? code : null;
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
    case 'clock_config': {
      if (a.minutes === null) return { t: 'clock_config', minutes: null };
      const m = Number(a.minutes);
      return isClockMinutes(m) ? { t: 'clock_config', minutes: m } : { error: 'Tiempo de reloj inválido.' };
    }
    case 'turn_start': // nombre antiguo, solo existía con reloj
    case 'round_start':
      return { t: 'round_start' };
    case 'turn_pass': case 'turn_stop': case 'clock_pause':
      return { t: a.t };
    case 'leave': case 'start': case 'first': case 'close': case 'undo':
    case 'finish': case 'close_room': case 'nudge':
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

  // Una sala cerrada no acepta nada más: es un estado terminal.
  if (d.view === 'closed') return { error: 'El anfitrión cerró esta sala.' };

  const hostOnly = () => (host ? null : { error: 'Solo el anfitrión puede hacer esto.' });
  const seated = () => (mine ? null : { error: 'No estás sentado en esta partida.' });
  const inGame = () => (d.view === 'game' ? null : { error: 'La partida no está en curso.' });
  const withClock = () => (d.clock ? null : { error: 'Esta partida se juega sin reloj.' });
  const started = () =>
    d.waiting ? { error: `Espera a que ${d.seats[d.starter]?.name ?? 'quien abre'} empiece la ronda.` } : null;
  const now = Date.now();

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
      // Solo desde el lobby. Una partida terminada no se reinicia en la misma sala.
      if (d.view === 'game') return { error: 'La partida ya está en curso.' };
      if (d.view !== 'lobby') return { error: 'La partida ya terminó. Para jugar otra, abrid una sala nueva.' };
      if (d.seats.length < MIN_SEATS) return { error: 'Hacen falta al menos 2 jugadores.' };
      d.view = 'game';
      d.round = 1;
      // Reglamento: el jugador inicial de la primera ronda se sortea.
      d.starter = Math.floor(Math.random() * d.seats.length);
      d.waiting = true;
      d.first = null;
      d.history = [];
      d.startedAt = now;
      d.journal = [];
      d.clock = d.clockMinutes ? newClock(d.clockMinutes, d.seats.length) : null;
      d.seats.forEach((s) => { s.ready = false; s.player = newPlayer(s.name); });
      break;
    }

    case 'clock_config': {
      const e = hostOnly(); if (e) return e;
      if (d.view !== 'lobby') return { error: 'El modo de juego se elige antes de empezar.' };
      d.clockMinutes = action.minutes;
      break;
    }

    case 'round_start': {
      const e = seated() ?? inGame(); if (e) return e;
      if (!d.waiting) return { error: 'La ronda ya empezó.' };
      // La abre quien tiene la ficha 1; el anfitrión puede hacerlo por él si se despista o se desconecta.
      if (!host && i !== d.starter) return { error: `Empieza la ronda ${d.seats[d.starter].name} o el anfitrión.` };
      d.waiting = false;
      if (d.clock) startOffer(d.clock, d.starter, now); // en competitivo, arranca su reloj
      break;
    }

    case 'turn_pass':
    case 'turn_stop': {
      const e = seated() ?? inGame() ?? withClock(); if (e) return e;
      const c = d.clock!;
      if (c.phase !== 'offer' || c.turn === null) return { error: 'No hay ningún turno en marcha.' };
      // Solo quien tiene el turno, o el anfitrión por él (si se le olvida pulsar).
      if (!host && i !== c.turn) return { error: `Es el turno de ${d.seats[c.turn].name}.` };
      if (action.t === 'turn_pass') passTurn(c, (c.turn + 1) % d.seats.length, now);
      else endOffer(c, now);
      break;
    }

    case 'clock_pause': {
      const e = hostOnly() ?? inGame() ?? withClock(); if (e) return e;
      if (d.clock!.phase !== 'offer') return { error: 'El reloj no está corriendo.' };
      togglePause(d.clock!, now);
      break;
    }

    case 'tap': {
      const e = seated() ?? inGame() ?? started(); if (e) return e;
      const w = mine!.player;
      if (w.wall[action.r][action.c]) return { error: 'Ese azulejo ya está colocado.' };
      w.pending[action.r] = w.pending[action.r] === action.c ? -1 : action.c;
      mine!.ready = false;
      break;
    }

    case 'floor': {
      const e = seated() ?? inGame() ?? started(); if (e) return e;
      mine!.player.floor = Math.max(0, Math.min(PEN.length, mine!.player.floor + action.delta));
      mine!.ready = false;
      break;
    }

    case 'first': {
      const e = seated() ?? inGame() ?? started(); if (e) return e;
      // La ficha es única: tomarla se la quita a quien la tuviera.
      d.first = d.first === i ? null : i;
      break;
    }

    case 'ready': {
      const e = seated() ?? inGame() ?? started(); if (e) return e;
      mine!.ready = action.value;
      if (action.value) delete mine!.nudgedAt; // ya respondió al aviso
      break;
    }

    case 'nudge': {
      const e = hostOnly() ?? inGame() ?? started(); if (e) return e;
      // Solo a los demás que están conectados y sin «listo». Los asientos sin
      // conexión no tienen un móvil al que avisar.
      const pendientes = d.seats.filter((s, k) => k !== i && !s.ready && s.clientId !== null);
      if (!pendientes.length) return { error: 'No hay nadie a quien avisar: los demás ya están listos.' };
      const avisables = pendientes.filter((s) => !s.nudgedAt || now - s.nudgedAt >= NUDGE_GAP_MS);
      if (!avisables.length) return { error: 'Acabas de avisarles. Espera unos segundos.' };
      avisables.forEach((s) => { s.nudgedAt = now; });
      break;
    }

    case 'close': {
      const e = hostOnly() ?? inGame() ?? started(); if (e) return e;
      d.history.push(JSON.stringify({
        seats: d.seats.map((s) => s.player),
        round: d.round, starter: d.starter, first: d.first, clock: d.clock ?? null,
      }));
      // Tiempo extra: se cobra al cerrar, sobre los puntos ya calculados de la ronda.
      const multas = d.clock ? closeRoundClock(d.clock, now) : [];
      const record: RoundRecord = {
        round: d.round, at: now, starter: d.seats[d.starter]?.name ?? '', by: mine?.name, players: [],
      };
      d.seats.forEach((s, k) => {
        const before = s.player;
        s.player = closeRoundFor(s.player, k === d.first);
        const multa = Math.min(multas[k] ?? 0, s.player.score);
        if (multa > 0) {
          s.player.score -= multa;
          s.player.log[s.player.log.length - 1] -= multa;
          s.player.timeLost = (s.player.timeLost ?? 0) + multa;
        }
        record.players.push(roundPlayer(before, k === d.first, multa, s.ready));
        s.ready = false;
        delete s.nudgedAt; // un aviso es de una ronda: no reaparece en la siguiente
      });
      (d.journal ??= []).push(record);
      if (d.first !== null) d.starter = d.first;
      d.first = null;
      d.round += 1;
      // Reglamento: la partida acaba al cerrar la ronda en que alguien completa
      // una fila. Se pasa directo al resultado, sin vuelta atrás.
      if (hasFullRow(d.seats.map((s) => s.player))) {
        d.view = 'final';
        d.history = [];
        d.waiting = false;
      } else {
        d.waiting = true; // la siguiente espera a quien se llevó la ficha 1
      }
      break;
    }

    case 'undo': {
      const e = hostOnly(); if (e) return e;
      if (d.view !== 'game') return { error: 'La partida ya terminó: no se puede deshacer.' };
      const h = d.history.pop();
      if (!h) return { error: 'No hay ninguna ronda que deshacer.' };
      const o = JSON.parse(h) as {
        seats: Player[]; round: number; starter: number; first: number | null; clock?: Clock | null;
      };
      d.seats.forEach((s, k) => { if (o.seats[k]) s.player = o.seats[k]; s.ready = false; });
      // El cierre deshecho no se borra del registro: queda a la vista como corrección.
      if (d.journal) markUndone(d.journal, now, mine?.name);
      d.round = o.round;
      d.starter = o.starter;
      d.first = o.first;
      // El reloj vuelve a como estaba, pero parado: nadie pierde tiempo mientras se corrige.
      if (o.clock) {
        d.clock = o.clock;
        endOffer(d.clock, now);
      }
      d.waiting = false; // se vuelve a la ronda ya empezada, para corregirla
      d.view = 'game';
      break;
    }

    case 'finish': {
      const e = hostOnly(); if (e) return e;
      if (d.view === 'lobby') return { error: 'La partida no ha empezado.' };
      if (d.clock) endOffer(d.clock, now); // el reloj no sigue corriendo en el resultado
      d.view = 'final';
      break;
    }

    case 'close_room': {
      const e = hostOnly(); if (e) return e;
      // No se borra la sala: queda marcada para que los demás móviles se
      // enteren y vuelvan solos a la portada. El TTL la limpia después.
      d.view = 'closed';
      d.seats.forEach((s) => { s.ready = false; });
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

/** Asientos que aún no marcaron «listo», en orden de mesa. */
export const notReady = (room: Room) => room.seats.filter((s) => !s.ready);

/**
 * Este asiento es el único que falta por marcar «listo» (y hay más jugadores).
 * Su móvil le recuerda solo, sin que el anfitrión tenga que pulsar nada.
 */
export const onlyOneMissing = (room: Room, seat: number) =>
  room.seats.length > 1 && !room.seats[seat]?.ready &&
  room.seats.every((s, k) => k === seat || s.ready);

/** Cerrar la ronda en curso termina la partida (alguien completa una fila). */
export const lastRound = (room: Room) =>
  roundEndsGame(room.seats.map((s) => s.player));

export const roomStandings = (room: Room): Standing[] =>
  standings(room.seats.map((s) => s.player));

/** Lo que necesita el registro de movimientos de esta sala. */
export const roomJournal = (room: Room): Omit<JournalSource, 'version' | 'now'> => ({
  code: room.code,
  startedAt: room.startedAt,
  clockMinutes: room.clock ? room.clockMinutes ?? null : null,
  players: room.seats.map((s) => s.player),
  journal: room.journal ?? [],
  round: room.round,
  finished: room.view === 'final',
});
