import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PEN, bonuses, calc, closeRoundFor, colorOf, floorTiles, newPlayer, standings } from '../lib/azul';

/** Jugador con `score` puntos y `rows` filas completas en la pared. */
const conPuntos = (name: string, score: number, rows = 0) => {
  const p = newPlayer(name);
  p.score = score;
  for (let r = 0; r < rows; r++) p.wall[r] = [true, true, true, true, true];
  return p;
};

describe('colocación de azulejos', () => {
  it('da 1 punto al azulejo aislado', () => {
    const p = newPlayer('A');
    p.pending[0] = 0;
    assert.equal(calc(p).gain, 1);
  });

  it('cuenta la línea horizontal contigua', () => {
    const p = newPlayer('A');
    p.wall[0] = [true, true, false, false, false];
    p.pending[0] = 2; // completa tres en fila
    assert.equal(calc(p).gain, 3);
  });

  it('suma horizontal y vertical cuando el azulejo cierra ambas', () => {
    const p = newPlayer('A');
    p.wall[1][0] = true; // vecino a la izquierda, en la misma fila
    p.wall[2][1] = true; // vecino abajo, en la misma columna
    p.pending[1] = 1;
    assert.equal(calc(p).gain, 4); // 2 en horizontal + 2 en vertical
  });

  it('solo cuenta la dirección que tiene vecinos', () => {
    const p = newPlayer('A');
    p.wall[2][1] = true; // únicamente vecino vertical
    p.pending[1] = 1;
    assert.equal(calc(p).gain, 2);
  });

  it('no cuenta las diagonales', () => {
    const p = newPlayer('A');
    p.wall[0][0] = true;
    p.wall[2][2] = true;
    p.pending[1] = 1; // rodeado solo en diagonal
    assert.equal(calc(p).gain, 1);
  });

  it('puntúa de arriba abajo dentro de la misma ronda', () => {
    const p = newPlayer('A');
    p.pending[0] = 0;
    p.pending[1] = 0; // al colocarse, la fila 0 ya está puesta
    assert.equal(calc(p).gain, 3); // 1 aislado + 2 en vertical
  });
});

describe('línea de suelo', () => {
  it('aplica la progresión oficial de penalizaciones', () => {
    const p = newPlayer('A');
    p.floor = 3;
    assert.equal(calc(p).pen, 1 + 1 + 2);
  });

  it('nunca deja la puntuación por debajo de cero', () => {
    const p = newPlayer('A');
    p.score = 1;
    p.floor = 7;
    assert.equal(calc(p).after, 0);
  });

  it('la ficha de jugador inicial ocupa un espacio del suelo', () => {
    const p = newPlayer('A');
    p.floor = 1;
    assert.equal(calc(p, false).pen, 1);
    assert.equal(calc(p, true).pen, 2);
    assert.equal(floorTiles(p, true), 2);
  });

  it('la ficha no hace rebasar los espacios disponibles', () => {
    const p = newPlayer('A');
    p.floor = PEN.length;
    assert.equal(floorTiles(p, true), PEN.length);
  });
});

describe('bonos de fin de partida', () => {
  it('cuenta filas, columnas y colores completos', () => {
    const p = newPlayer('A');
    p.wall[0] = [true, true, true, true, true]; // una fila
    for (let r = 0; r < 5; r++) p.wall[r][2] = true; // una columna
    const b = bonuses(p);
    assert.equal(b.rows, 1);
    assert.equal(b.cols, 1);
    assert.equal(b.total, 1 * 2 + 1 * 7);
  });

  it('da 10 por color completo', () => {
    const p = newPlayer('A');
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 5; c++) if (colorOf(r, c) === 0) p.wall[r][c] = true;
    assert.equal(bonuses(p).colors, 1);
  });
});

describe('cierre de ronda', () => {
  it('fija la pared, registra el delta y limpia lo temporal', () => {
    const p = newPlayer('A');
    p.pending[0] = 0;
    p.floor = 2;
    const out = closeRoundFor(p, false);
    assert.equal(out.wall[0][0], true);
    assert.equal(out.score, 0); // 1 ganado − 2 de suelo, sin bajar de 0
    assert.deepEqual(out.pending, [-1, -1, -1, -1, -1]);
    assert.equal(out.floor, 0);
    assert.equal(out.log.length, 1);
  });

  it('acumula lo que se llevó el suelo', () => {
    let p = newPlayer('A');
    p.score = 10;
    p.floor = 3; // −4
    p = closeRoundFor(p, true); // con la ficha: −6
    assert.equal(p.score, 4);
    assert.equal(p.lost, 6);
    p.floor = 1; // −1
    p = closeRoundFor(p);
    assert.equal(p.lost, 7);
  });

  it('solo cuenta como perdido lo que se pierde sin bajar de cero', () => {
    const p = newPlayer('A');
    p.score = 1;
    p.pending[0] = 0; // +1
    p.floor = 7; // −14, pero solo hay 2 que perder
    assert.equal(closeRoundFor(p).lost, 2);
  });

  it('tolera jugadores guardados sin el campo', () => {
    const p = newPlayer('A');
    delete p.lost;
    p.floor = 1;
    p.score = 5;
    assert.equal(closeRoundFor(p).lost, 1);
  });
});

describe('clasificación final', () => {
  it('ordena por total y numera los puestos', () => {
    const t = standings([
      conPuntos('Ana', 40),
      conPuntos('Beto', 62),
      conPuntos('Caro', 55),
      conPuntos('Dani', 62, 1), // +2 de bono
    ]);
    assert.deepEqual(
      t.map((s) => `${s.place} ${s.p.name} ${s.total}`),
      ['1 Dani 64', '2 Beto 62', '3 Caro 55', '4 Ana 40'],
    );
  });

  it('desempata por filas horizontales completas', () => {
    const t = standings([conPuntos('X', 50), conPuntos('Y', 48, 1)]);
    assert.equal(t[0].p.name, 'Y'); // 48 + 2 = 50, y gana por filas
    assert.equal(t[0].shared, false);
  });

  it('comparte el puesto si el empate no se resuelve', () => {
    const t = standings([conPuntos('X', 50), conPuntos('Y', 50), conPuntos('Z', 30)]);
    assert.deepEqual(t.map((s) => s.place), [1, 1, 3]);
    assert.ok(t[0].shared && t[1].shared);
    assert.equal(t[2].shared, false);
  });

  it('calcula el total posible sin el suelo y el puesto que daría', () => {
    const ana = conPuntos('Ana', 50, 1); // 52 con el bono
    ana.lost = 12;
    const t = standings([ana, conPuntos('Beto', 60), conPuntos('Caro', 55)]);
    const a = t.find((s) => s.p.name === 'Ana')!;
    assert.equal(a.place, 3);
    assert.equal(a.lost, 12);
    assert.equal(a.potential, 64);
    assert.equal(a.potentialPlace, 1);
    assert.equal(t[0].potentialPlace, 1); // sin pérdidas, el puesto no cambia
  });
});
