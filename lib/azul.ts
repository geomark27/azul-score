export const COLORS = ['#2f62c4', '#e9b824', '#cf4638', '#2a2a33', '#79c5d6'];
export const PEN = [1, 1, 2, 2, 2, 3, 3];

export type Player = {
  name: string;
  score: number;
  wall: boolean[][];
  pending: number[]; // columna elegida por fila en la ronda actual (-1 = ninguna)
  floor: number;
  log: number[];
};

export const colorOf = (r: number, c: number) => (((c - r) % 5) + 5) % 5;

export const newPlayer = (name: string): Player => ({
  name,
  score: 0,
  wall: Array.from({ length: 5 }, () => Array(5).fill(false)),
  pending: [-1, -1, -1, -1, -1],
  floor: 0,
  log: [],
});

/** Puntos de la ronda en curso (colocación de arriba abajo + suelo). */
export function calc(p: Player) {
  const w = p.wall.map((r) => r.slice());
  let gain = 0;
  for (let r = 0; r < 5; r++) {
    const c = p.pending[r];
    if (c < 0) continue;
    w[r][c] = true;
    let h = 1, v = 1;
    for (let i = c - 1; i >= 0 && w[r][i]; i--) h++;
    for (let i = c + 1; i < 5 && w[r][i]; i++) h++;
    for (let i = r - 1; i >= 0 && w[i][c]; i--) v++;
    for (let i = r + 1; i < 5 && w[i][c]; i++) v++;
    gain += h === 1 && v === 1 ? 1 : (h > 1 ? h : 0) + (v > 1 ? v : 0);
  }
  const pen = PEN.slice(0, p.floor).reduce((a, b) => a + b, 0);
  const after = Math.max(0, p.score + gain - pen);
  return { gain, pen, after, delta: after - p.score };
}

/** Bonos de fin de partida. */
export function bonuses(p: Player) {
  let rows = 0, cols = 0, colors = 0;
  for (let r = 0; r < 5; r++) if (p.wall[r].every(Boolean)) rows++;
  for (let c = 0; c < 5; c++) if (p.wall.every((row) => row[c])) cols++;
  for (let k = 0; k < 5; k++) {
    let n = 0;
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 5; c++) if (p.wall[r][c] && colorOf(r, c) === k) n++;
    if (n === 5) colors++;
  }
  return { rows, cols, colors, total: rows * 2 + cols * 7 + colors * 10 };
}

/** Cierra la ronda: aplica colocaciones, suelo y reinicia el estado temporal. */
export function closeRoundFor(p: Player): Player {
  const r = calc(p);
  const wall = p.wall.map((row) => row.slice());
  p.pending.forEach((c, i) => {
    if (c >= 0) wall[i][c] = true;
  });
  return {
    ...p,
    wall,
    score: r.after,
    log: [...p.log, r.delta],
    pending: [-1, -1, -1, -1, -1],
    floor: 0,
  };
}

export const hasFullRow = (players: Player[]) =>
  players.some((p) => p.wall.some((r) => r.every(Boolean)));
