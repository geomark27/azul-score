import {
  PEN, Placement, Player, bonuses, calc, closeRoundFor, colorOf, hasFullRow, newPlayer, placements,
  standings,
} from './azul';

/**
 * Registro de movimientos: qué marcó cada jugador en cada ronda cerrada y cómo
 * salió su puntuación. Sirve para comprobar el marcador a mano (o con una IA)
 * cuando alguien duda de una cuenta.
 */

/** Nombres de los colores en el orden de `COLORS`, como en docs/azul-propuesta-mobile-first.md. */
export const COLOR_NAMES = ['azul', 'amarillo', 'rojo', 'negro', 'celeste'];
const COLOR_CODES = ['Az', 'Am', 'Ro', 'Ne', 'Ce'];

/** Lo que hizo un jugador en una ronda cerrada. */
export type RoundPlayer = {
  name: string;
  before: number;
  tiles: Placement[];
  gain: number;
  floor: number; // azulejos caídos, sin contar la ficha
  first: boolean; // se llevó la ficha de jugador inicial
  pen: number; // lo que resta el suelo según la tabla, antes del tope en 0
  timeLost: number; // multa del reloj que se llegó a restar
  after: number;
  /** Había marcado «listo» cuando se cerró. No existe en el modo de un dispositivo. */
  ready?: boolean;
};

export type RoundRecord = {
  round: number;
  at: number; // momento del cierre
  starter: string; // quien abrió la ronda
  by?: string; // quien la cerró (el anfitrión)
  players: RoundPlayer[];
  /** El anfitrión deshizo este cierre para corregirlo: no cuenta en la partida. */
  undoneAt?: number;
  undoneBy?: string;
};

/** Foto de un jugador justo antes de cerrar la ronda. `timeLost` es la multa ya recortada. */
export function roundPlayer(p: Player, first: boolean, timeLost = 0, ready?: boolean): RoundPlayer {
  const r = calc(p, first);
  return {
    name: p.name,
    before: p.score,
    tiles: placements(p),
    gain: r.gain,
    floor: p.floor,
    first,
    pen: r.pen,
    timeLost,
    after: r.after - timeLost,
    ...(ready === undefined ? {} : { ready }),
  };
}

/** Marca como deshecho el último cierre que seguía en pie. */
export function markUndone(journal: RoundRecord[], at: number, by?: string) {
  for (let k = journal.length - 1; k >= 0; k--) {
    if (journal[k].undoneAt) continue;
    journal[k].undoneAt = at;
    if (by) journal[k].undoneBy = by;
    return;
  }
}

/* ---------- Texto descargable ---------- */

export type JournalSource = {
  code: string | null; // null = modo de un dispositivo
  startedAt?: number;
  clockMinutes?: number | null;
  players: Player[]; // estado actual de la partida
  journal: RoundRecord[];
  round: number; // ronda en curso, o la siguiente a la última cerrada si ya terminó
  finished: boolean;
  version: string; // etiqueta de versión, p. ej. `v0.4.0 · a1b2c3d`
  now: number;
};

// Formato fijo (dd/mm/aaaa hh:mm:ss, hora del móvil) para que el texto sea igual en cualquier dispositivo.
const dos = (n: number) => String(n).padStart(2, '0');
const hora = (ms: number) => {
  const d = new Date(ms);
  return `${dos(d.getHours())}:${dos(d.getMinutes())}:${dos(d.getSeconds())}`;
};
const fecha = (ms: number) => {
  const d = new Date(ms);
  return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()} ${hora(ms)}`;
};
const sign = (n: number) => (n > 0 ? `+${n}` : String(n));
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
const RAYA = '='.repeat(72);
const LINEA = '-'.repeat(72);

function tileText(t: Placement) {
  const where = `fila ${t.r + 1}, columna ${t.c + 1} (${COLOR_NAMES[colorOf(t.r, t.c)]})`;
  if (t.h === 1 && t.v === 1) return `${where}: sin vecinos = 1`;
  const parts: string[] = [];
  if (t.h > 1) parts.push(`línea horizontal de ${t.h}`);
  if (t.v > 1) parts.push(`línea vertical de ${t.v}`);
  return `${where}: ${parts.join(' + ')} = ${t.points}`;
}

function floorText(rp: RoundPlayer) {
  const slots = Math.min(PEN.length, rp.floor + (rp.first ? 1 : 0));
  if (!slots) return 'Suelo: vacío = 0';
  const que = [
    rp.floor ? plural(rp.floor, 'azulejo', 'azulejos') : '',
    rp.first ? 'ficha de jugador inicial' : '',
  ].filter(Boolean).join(' + ');
  const tope = rp.floor + (rp.first ? 1 : 0) > PEN.length ? `, máximo ${PEN.length}` : '';
  return `Suelo: ${que} = ${plural(slots, 'espacio', 'espacios')}${tope}: `
    + `${PEN.slice(0, slots).join(' + ')} = -${rp.pen}`;
}

function cuentaText(rp: RoundPlayer) {
  const bruto = rp.before + rp.gain - rp.pen;
  let s = `Cuenta: ${rp.before} + ${rp.gain} - ${rp.pen} = ${bruto}`;
  if (bruto < 0) s += ' -> 0 (la puntuación no baja de 0)';
  if (rp.timeLost) s += ` - ${rp.timeLost} (reloj) = ${rp.after}`;
  return s;
}

/** Pared en texto. `fresh` marca con * lo colocado en la ronda. */
function wallLines(wall: boolean[][], fresh: Placement[] = [], all = false) {
  const out = ['      c1  c2  c3  c4  c5'];
  for (let r = 0; r < 5; r++) {
    let row = `  f${r + 1}  `;
    for (let c = 0; c < 5; c++) {
      const code = COLOR_CODES[colorOf(r, c)];
      const nuevo = fresh.some((t) => t.r === r && t.c === c);
      row += all || wall[r][c] ? `${code}${nuevo ? '*' : ' '} ` : '--  ';
    }
    out.push(row.trimEnd());
  }
  return out;
}

/** Rondas que cuentan: de la 1 en adelante, sin huecos y con todos los jugadores. */
const isComplete = (valid: RoundRecord[], players: Player[]) =>
  valid.length === (players[0]?.log.length ?? 0) &&
  valid.every((x, k) => x.round === k + 1 && x.players.length === players.length);

/**
 * Registro de la partida en texto plano. Repite las reglas que aplica el
 * marcador y rehace la partida desde cero para comprobar cada cuenta, de modo
 * que quien lo lea (una persona o una IA) no dependa de nada más.
 */
export function journalText(s: JournalSource): string {
  const L: string[] = [];
  const valid = s.journal.filter((x) => !x.undoneAt);
  const undone = s.journal.filter((x) => x.undoneAt);
  const complete = isComplete(valid, s.players);
  const lastRound = valid.length ? valid[valid.length - 1].round : 0;

  /* Cabecera */
  L.push(RAYA, 'REGISTRO DE PARTIDA DE AZUL', RAYA);
  L.push(s.code ? `Sala: ${s.code}` : 'Modo: un solo dispositivo');
  if (s.startedAt) L.push(`Empezó: ${fecha(s.startedAt)}`);
  L.push(`Registro generado: ${fecha(s.now)}`);
  L.push(`Marcador: azul-marcador ${s.version}`);
  L.push(`Reloj: ${s.clockMinutes ? `modo competitivo, ${s.clockMinutes} min por jugador` : 'sin reloj'}`);
  L.push(`Jugadores, en orden de mesa: ${s.players.map((p, k) => `${k + 1}. ${p.name}`).join(' · ')}`);
  if (!s.finished) {
    L.push(`Estado: en curso. La ronda ${s.round} aún no se ha cerrado y no aparece aquí.`);
  } else if (hasFullRow(s.players)) {
    const quien = s.players.filter((p) => p.wall.some((r) => r.every(Boolean))).map((p) => p.name);
    L.push(`Estado: terminada. ${quien.join(' y ')} ${quien.length > 1 ? 'completaron' : 'completó'}`
      + ` una fila horizontal en la ronda ${lastRound}.`);
  } else {
    L.push('Estado: terminada a mano por el anfitrión, sin que nadie completara una fila.');
  }
  if (!complete) {
    L.push('', 'AVISO: este registro no cubre toda la partida (la partida empezó antes de que el',
      'marcador guardara movimientos). Faltan rondas: no se puede rehacer la partida desde cero.');
  }

  /* Reglas */
  L.push('', RAYA, 'CÓMO PUNTÚA EL MARCADOR', RAYA);
  L.push(
    '- Cada jugador tiene una pared de 5 x 5. Filas f1..f5 de arriba abajo y columnas c1..c5',
    '  de izquierda a derecha. El color de cada casilla es fijo (mapa de abajo).',
    '- Cada partida empieza con 0 puntos y la pared vacía.',
    '- Al cerrar la ronda, los azulejos marcados pasan a la pared de arriba abajo (f1 primero)',
    '  y cada uno puntúa en ese momento, contando los que ya estaban:',
    '    * sin vecinos en su fila ni en su columna: 1 punto;',
    '    * si no: el largo de la línea horizontal contigua (si es mayor que 1) más el largo',
    '      de la línea vertical contigua (si es mayor que 1). Las diagonales no cuentan.',
    `- Suelo: cada espacio ocupado resta, en orden: ${PEN.join(', ')} (máximo ${PEN.length} espacios).`,
    '  La ficha de jugador inicial ocupa un espacio del suelo.',
    '- La puntuación nunca baja de 0: si el suelo resta más de lo que hay, se queda en 0.',
    '- Quien se lleva la ficha de jugador inicial abre la ronda siguiente.',
  );
  if (s.clockMinutes) {
    L.push('- Reloj: pasarse del tiempo resta 1 punto, y 1 más por cada 30 s de exceso. Se cobra',
      '  al cerrar la ronda, después del suelo y sin bajar de 0.');
  }
  L.push(
    '- La partida acaba al cerrar la ronda en la que alguien completa una fila horizontal.',
    '- Bonos al final: +2 por fila horizontal completa, +7 por columna completa y +10 por',
    '  cada color con sus 5 azulejos en la pared.',
    '- Desempate: más filas horizontales completas; si persiste, el puesto se comparte.',
    '',
    'Mapa de colores de la pared (Az azul, Am amarillo, Ro rojo, Ne negro, Ce celeste):',
    ...wallLines([], [], true),
    '',
    'En las paredes de cada ronda, -- es una casilla vacía y * un azulejo colocado en esa ronda.',
    'Para comprobar el resultado: parte de 0 puntos y la pared vacía, aplica las rondas en orden',
    'con estas reglas y compara con las cuentas y el resumen final.',
  );

  /* Rondas */
  L.push('', RAYA, 'RONDAS', RAYA);
  if (!valid.length) L.push('Todavía no se ha cerrado ninguna ronda.');
  const sim = s.players.map((p) => newPlayer(p.name));
  const fallos: string[] = [];

  for (const rec of valid) {
    L.push('', `RONDA ${rec.round} · abrió ${rec.starter}${rec.round === 1 ? ' (por sorteo)' : ''}`
      + ` · cerrada a las ${hora(rec.at)}${rec.by ? ` por ${rec.by}` : ''}`);
    if (undone.some((u) => u.round === rec.round))
      L.push('(Se volvió a cerrar después de que el anfitrión la deshiciera: ver CORRECCIONES.)');
    const ficha = rec.players.find((rp) => rp.first);
    L.push(`Ficha de jugador inicial: ${ficha ? ficha.name : 'nadie la marcó'}.`);
    L.push(LINEA);

    rec.players.forEach((rp, k) => {
      L.push(`${rp.name}: ${rp.before} -> ${rp.after} (${sign(rp.after - rp.before)})`);
      if (rp.tiles.length) {
        L.push('  Azulejos colocados, de arriba abajo:');
        rp.tiles.forEach((t) => L.push(`    ${tileText(t)}`));
        L.push(`    Total colocados: ${rp.gain}`);
      } else {
        L.push('  Azulejos colocados: ninguno = 0');
      }
      L.push(`  ${floorText(rp)}`);
      if (rp.timeLost) L.push(`  Reloj: -${rp.timeLost} por pasarse de tiempo`);
      L.push(`  ${cuentaText(rp)}`);
      if (rp.ready === false) L.push('  No había marcado «listo»: la ronda se cerró con lo que tenía marcado.');

      if (!complete || !sim[k]) return;
      // Se rehace la ronda con las reglas y se compara con lo apuntado.
      const p = sim[k];
      if (p.score !== rp.before) fallos.push(`Ronda ${rec.round}, ${rp.name}: empezó con ${rp.before} y debía tener ${p.score}.`);
      rp.tiles.forEach((t) => {
        if (p.wall[t.r][t.c]) fallos.push(`Ronda ${rec.round}, ${rp.name}: la casilla f${t.r + 1} c${t.c + 1} ya estaba ocupada.`);
        p.pending[t.r] = t.c;
      });
      p.floor = rp.floor;
      const esperado = Math.max(0, calc(p, rp.first).after - rp.timeLost);
      if (esperado !== rp.after) fallos.push(`Ronda ${rec.round}, ${rp.name}: apuntó ${rp.after} y las reglas dan ${esperado}.`);
      sim[k] = closeRoundFor(p, rp.first);
      sim[k].score = rp.after;
      L.push('  Pared tras la ronda:');
      wallLines(sim[k].wall, rp.tiles).forEach((x) => L.push(`  ${x}`));
    });
  }

  /* Correcciones */
  L.push('', RAYA, 'CORRECCIONES DEL ANFITRIÓN', RAYA);
  if (!undone.length) L.push('Ninguna: no se deshizo ninguna ronda.');
  undone.forEach((u) => {
    L.push(`Ronda ${u.round}: se cerró a las ${hora(u.at)} y ${u.undoneBy ?? 'el anfitrión'} la deshizo`
      + ` a las ${hora(u.undoneAt!)} para corregirla. Lo que se anuló:`);
    u.players.forEach((rp) => {
      const tiles = rp.tiles.length
        ? rp.tiles.map((t) => `f${t.r + 1} c${t.c + 1} ${COLOR_NAMES[colorOf(t.r, t.c)]}`).join(', ')
        : 'ningún azulejo';
      L.push(`  ${rp.name}: ${sign(rp.after - rp.before)} (${tiles}; suelo ${rp.floor}`
        + `${rp.first ? ' + ficha' : ''})`);
    });
  });

  /* Resumen */
  L.push('', RAYA, s.finished ? 'RESUMEN FINAL' : 'RESUMEN HASTA AHORA', RAYA);
  const ancho = Math.max(7, ...s.players.map((p) => p.name.length)) + 2;
  const rondas = valid.map((x) => `R${x.round}`.padStart(5)).join('');
  L.push(`${'Jugador'.padEnd(ancho)}${rondas} | ${'Rondas'.padStart(6)}`
    + (s.finished ? ` ${'Bonos'.padStart(6)} ${'TOTAL'.padStart(6)}  Puesto` : ''));
  const tabla = standings(s.players);
  s.players.forEach((p, k) => {
    const deltas = valid.map((x) => sign(x.players[k] ? x.players[k].after - x.players[k].before : 0).padStart(5)).join('');
    let fila = `${p.name.padEnd(ancho)}${deltas} | ${String(p.score).padStart(6)}`;
    if (s.finished) {
      const st = tabla.find((t) => t.p === p)!;
      fila += ` ${sign(st.b.total).padStart(6)} ${String(st.total).padStart(6)}  ${st.place}.º${st.shared ? ' (empate)' : ''}`;
    }
    L.push(fila);
  });

  if (s.finished) {
    L.push('', 'Bonos de fin de partida:');
    s.players.forEach((p) => {
      const b = bonuses(p);
      const lista = (xs: number[], f: (x: number) => string, nada: string) => (xs.length ? xs.map(f).join(', ') : nada);
      L.push(`  ${p.name}: filas ${lista(b.full.rows, (r) => `f${r + 1}`, 'ninguna')} (${b.rows} x 2 = ${b.rows * 2});`
        + ` columnas ${lista(b.full.cols, (c) => `c${c + 1}`, 'ninguna')} (${b.cols} x 7 = ${b.cols * 7});`
        + ` colores ${lista(b.full.colors, (k) => COLOR_NAMES[k], 'ninguno')} (${b.colors} x 10 = ${b.colors * 10})`
        + ` -> ${b.total}`);
    });
    L.push('', 'Total = puntos de las rondas + bonos:');
    tabla.forEach((t) => L.push(`  ${t.place}.º ${t.p.name}: ${t.p.score} + ${t.b.total} = ${t.total}`
      + `${t.shared ? ' (puesto compartido)' : ''}`));
  }

  const perdidas = s.players.filter((p) => (p.lost ?? 0) > 0 || (p.timeLost ?? 0) > 0);
  if (perdidas.length) {
    L.push('', 'Puntos perdidos en toda la partida (ya restados):');
    perdidas.forEach((p) => L.push(`  ${p.name}: ${p.lost ?? 0} por el suelo`
      + `${s.clockMinutes ? `, ${p.timeLost ?? 0} por el reloj` : ''}`));
  }

  /* Comprobación */
  L.push('', RAYA, 'COMPROBACIÓN', RAYA);
  if (!complete) {
    L.push('No se puede rehacer la partida: faltan rondas en el registro.');
  } else {
    s.players.forEach((p, k) => {
      const suma = valid.reduce((a, x) => a + (x.players[k].after - x.players[k].before), 0);
      if (suma !== p.score) fallos.push(`${p.name}: la suma de las rondas da ${suma} y el marcador tiene ${p.score}.`);
      if (sim[k].wall.some((row, r) => row.some((on, c) => on !== p.wall[r][c])))
        fallos.push(`${p.name}: la pared rehecha no coincide con la del marcador.`);
    });
    if (fallos.length) {
      L.push('HAY DIFERENCIAS:');
      fallos.forEach((f) => L.push(`  - ${f}`));
    } else {
      L.push('Correcto. Se rehízo la partida desde cero con las reglas de arriba: cada cuenta,',
        'las paredes y los puntos de las rondas coinciden con el marcador.');
    }
  }
  L.push('');
  return L.join('\n');
}
