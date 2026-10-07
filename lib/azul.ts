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

/** Azulejos en el suelo contando la ficha de jugador inicial, que también ocupa espacio. */
export const floorTiles = (p: Player, first = false) =>
  Math.min(PEN.length, p.floor + (first ? 1 : 0));

/**
 * Puntos de la ronda en curso (colocación de arriba abajo + suelo).
 * `first` = este jugador tomó la ficha de jugador inicial: ocupa un espacio del suelo.
 */
export function calc(p: Player, first = false) {
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
  const tiles = floorTiles(p, first);
  const pen = PEN.slice(0, tiles).reduce((a, b) => a + b, 0);
  const after = Math.max(0, p.score + gain - pen);
  return { gain, pen, tiles, after, delta: after - p.score };
}

/** Bonos de fin de partida. Solo horizontales, verticales y colores: las diagonales no puntúan. */
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
export function closeRoundFor(p: Player, first = false): Player {
  const r = calc(p, first);
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

export type Standing = {
  p: Player;
  b: ReturnType<typeof bonuses>;
  total: number;
  place: number;
  shared: boolean; // empate no resuelto: comparte el puesto
};

/**
 * Clasificación final ordenada. Desempate oficial: más filas horizontales
 * completas; si persiste, el puesto se comparte.
 */
export function standings(players: Player[]): Standing[] {
  const rows = players.map((p) => {
    const b = bonuses(p);
    return { p, b, total: p.score + b.total };
  });
  rows.sort((a, z) => z.total - a.total || z.b.rows - a.b.rows);

  const out = rows.map((r, i) => {
    const prev = rows[i - 1];
    const same = prev && prev.total === r.total && prev.b.rows === r.b.rows;
    return { ...r, place: 0, shared: false, _same: !!same };
  });
  out.forEach((r, i) => {
    r.place = i === 0 ? 1 : r._same ? out[i - 1].place : i + 1;
  });
  out.forEach((r) => {
    r.shared = out.filter((o) => o.place === r.place).length > 1;
  });
  return out.map(({ _same, ...r }) => r);
}
