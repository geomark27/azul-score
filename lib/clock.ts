/**
 * Reloj del modo competitivo, al estilo del ajedrez.
 *
 * Cada jugador tiene una bolsa de tiempo para toda la partida. Solo corre la de
 * quien tiene el turno durante la fase de oferta (coger azulejos de las
 * fábricas); se para al anotar. Si la bolsa baja de cero, el jugador sigue
 * jugando pero pierde puntos: 1 nada más pasarse y 1 más por cada 30 s extra.
 *
 * Todas las horas son del servidor (`Date.now()` en la acción). El cliente
 * solo las usa para pintar, corrigiendo la diferencia con su propio reloj.
 */

/** Minutos por jugador que se pueden elegir en el lobby. */
export const CLOCK_MINUTES = [5, 10, 15, 20] as const;
/** Cada tramo de tiempo extra, o parte de él, cuesta un punto. */
export const OVERTIME_STEP_MS = 30_000;

export type ClockPhase =
  /** Antes de empezar la ronda: se reparten fábricas; nadie gasta tiempo. */
  | 'ready'
  /** Fase de oferta: corre el reloj de `turn` (salvo en pausa). */
  | 'offer'
  /** Se acabaron los azulejos: se anota la ronda con el reloj parado. */
  | 'scoring';

export type Clock = {
  bankMs: number;
  /** Tiempo que le queda a cada asiento, sin contar lo que lleva el turno en curso. Negativo = tiempo extra. */
  left: number[];
  phase: ClockPhase;
  turn: number | null;
  /** Hora del servidor en que empezó a contar el tramo actual; null si no corre. */
  since: number | null;
  paused: boolean;
  /** Puntos ya descontados a cada asiento por tiempo extra. */
  charged: number[];
};

export const isClockMinutes = (m: unknown): m is number =>
  (CLOCK_MINUTES as readonly number[]).includes(m as number);

export function newClock(minutes: number, seats: number): Clock {
  const bankMs = minutes * 60_000;
  return {
    bankMs,
    left: Array(seats).fill(bankMs),
    phase: 'ready',
    turn: null,
    since: null,
    paused: false,
    charged: Array(seats).fill(0),
  };
}

/** Tiempo que le queda a un asiento en el instante `now` (hora del servidor). */
export function remaining(c: Clock, seat: number, now: number): number {
  const base = c.left[seat] ?? 0;
  return c.turn === seat && c.since !== null ? base - Math.max(0, now - c.since) : base;
}

/** El reloj de `seat` está corriendo ahora mismo. */
export const running = (c: Clock, seat: number) => c.turn === seat && c.since !== null;

/** Puntos que corresponden por un saldo de tiempo. */
export const overtimePoints = (leftMs: number) =>
  leftMs >= 0 ? 0 : Math.ceil(-leftMs / OVERTIME_STEP_MS);

/* ---------- Transiciones (mutan `c`: el reducer ya trabaja sobre una copia) ---------- */

/** Apunta lo que lleva corrido el turno actual y reinicia el tramo. */
function settle(c: Clock, now: number) {
  if (c.turn !== null && c.since !== null) {
    c.left[c.turn] -= Math.max(0, now - c.since);
    c.since = now;
  }
}

/** Empieza la oferta con el turno de `seat`. */
export function startOffer(c: Clock, seat: number, now: number) {
  c.phase = 'offer';
  c.turn = seat;
  c.since = now;
  c.paused = false;
}

/** El jugador del turno termina y se lo pasa a `next`. */
export function passTurn(c: Clock, next: number, now: number) {
  settle(c, now);
  c.turn = next;
  c.since = c.paused ? null : now;
}

/** Fin de la oferta: se para el reloj para anotar. */
export function endOffer(c: Clock, now: number) {
  settle(c, now);
  c.phase = 'scoring';
  c.turn = null;
  c.since = null;
  c.paused = false;
}

/** Pausa o reanuda (solo tiene efecto durante la oferta). */
export function togglePause(c: Clock, now: number) {
  if (c.phase !== 'offer') return;
  if (c.paused) {
    c.paused = false;
    c.since = now;
  } else {
    settle(c, now);
    c.paused = true;
    c.since = null;
  }
}

/**
 * Al cerrar la ronda: para el reloj, deja la siguiente lista para empezar y
 * devuelve los puntos nuevos que pierde cada asiento por tiempo extra.
 */
export function closeRoundClock(c: Clock, now: number): number[] {
  endOffer(c, now);
  c.phase = 'ready';
  return c.left.map((ms, k) => {
    const due = overtimePoints(ms) - (c.charged[k] ?? 0);
    if (due <= 0) return 0;
    c.charged[k] = (c.charged[k] ?? 0) + due;
    return due;
  });
}

/** mm:ss, con signo menos en tiempo extra. Redondea hacia arriba como un reloj de ajedrez. */
export function formatClock(ms: number): string {
  const neg = ms < 0;
  const s = neg ? Math.floor(-ms / 1000) : Math.ceil(ms / 1000);
  const txt = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return neg ? `−${txt}` : txt;
}
