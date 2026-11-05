import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calc, newPlayer, placements } from '../lib/azul';
import { Action, Room, apply, isErr, newRoom, roomJournal, roomStandings } from '../lib/room';
import { journalText, roundPlayer } from '../lib/registro';

const ok = (r: Room | { error: string }): Room => {
  assert.ok(!isErr(r), `esperaba éxito, obtuve: ${isErr(r) ? r.error : ''}`);
  return r as Room;
};
const act = (room: Room, who: string, a: Action) => ok(apply(room, who, a));

const A = 'cli-ana', B = 'cli-beto';

/** Partida de dos con la primera ronda en marcha y Ana abriendo. */
function partida() {
  let r = newRoom('TEST', A, 'Ana');
  r = act(r, B, { t: 'join', name: 'Beto' });
  r = act(r, A, { t: 'start' });
  r.starter = 0;
  return act(r, A, { t: 'round_start' });
}

/** Ronda tipo: Ana llena la fila 1, Beto la columna 1 y tira un azulejo al suelo. */
function ronda(r: Room, c: number) {
  r = act(r, A, { t: 'tap', r: 0, c });
  r = act(r, B, { t: 'tap', r: c, c: 0 });
  r = act(r, B, { t: 'floor', delta: 1 });
  r = act(r, A, { t: 'ready', value: true });
  r = act(r, A, { t: 'close' });
  return r.view === 'game' ? act(r, A, { t: 'round_start' }) : r;
}

const texto = (r: Room) => journalText({ ...roomJournal(r), version: 'v0.0.0', now: Date.now() });

describe('registro de movimientos', () => {
  it('desglosa cada azulejo con los mismos puntos que el marcador', () => {
    const p = newPlayer('A');
    p.wall[0][0] = p.wall[0][1] = p.wall[1][2] = true;
    p.pending[0] = 2; // cierra una horizontal de 3 y una vertical de 2
    p.pending[3] = 4; // aislado
    const t = placements(p);
    assert.deepEqual(t.map((x) => [x.r, x.c, x.h, x.v, x.points]), [[0, 2, 3, 2, 5], [3, 4, 1, 1, 1]]);
    assert.equal(t.reduce((a, x) => a + x.points, 0), calc(p).gain);
  });

  it('apunta cada ronda cerrada con lo que hizo cada jugador', () => {
    const r = ronda(partida(), 0);
    const [rec] = r.journal!;
    assert.equal(rec.round, 1);
    assert.equal(rec.starter, 'Ana');
    assert.equal(rec.by, 'Ana');
    const [ana, beto] = rec.players;
    assert.deepEqual(ana.tiles.map((t) => [t.r, t.c]), [[0, 0]]);
    assert.equal(ana.ready, true);
    assert.equal(beto.ready, false); // se cerró sin su «listo»
    assert.equal(beto.floor, 1);
    // Lo apuntado coincide con el marcador.
    r.seats.forEach((s, k) => assert.equal(rec.players[k].after, s.player.score));
  });

  it('la multa del reloj se apunta ya recortada', () => {
    const p = newPlayer('A');
    p.pending[0] = 0; // +1
    const rp = roundPlayer(p, false, 1);
    assert.equal(rp.timeLost, 1);
    assert.equal(rp.after, 0);
  });

  it('deshacer no borra el cierre: queda como corrección', () => {
    let r = ronda(partida(), 0);
    r = act(r, A, { t: 'undo' });
    assert.ok(r.journal![0].undoneAt);
    r = act(r, A, { t: 'tap', r: 0, c: 0 }); // se quita y se marca otra
    r = act(r, A, { t: 'tap', r: 0, c: 3 });
    r = act(r, A, { t: 'close' });
    assert.equal(r.journal!.length, 2);
    const txt = texto(r);
    assert.match(txt, /Ronda 1: se cerró a las .* y Ana la deshizo/);
    assert.match(txt, /Se volvió a cerrar/);
    assert.match(txt, /fila 1, columna 4 \(negro\): sin vecinos = 1/);
    assert.match(txt, /COMPROBACIÓN\n=+\nCorrecto\./);
  });

  it('rehace una partida completa y cuadra con la clasificación', () => {
    let r = partida();
    for (let c = 0; c < 5; c++) r = ronda(r, c);
    assert.equal(r.view, 'final');
    assert.equal(r.journal!.length, 5);
    const txt = texto(r);
    assert.match(txt, /Estado: terminada\. Ana completó una fila horizontal en la ronda 5\./);
    assert.match(txt, /COMPROBACIÓN\n=+\nCorrecto\./);
    for (const t of roomStandings(r))
      assert.ok(txt.includes(`${t.place}.º ${t.p.name}: ${t.p.score} + ${t.b.total} = ${t.total}`));
    assert.match(txt, /Ana: filas f1 \(1 x 2 = 2\)/);
  });

  it('señala cualquier cuenta que no cuadre con las reglas', () => {
    const r = ronda(ronda(partida(), 0), 1);
    r.journal![1].players[0].after += 3; // alguien «retoca» la ronda 2
    assert.match(texto(r), /HAY DIFERENCIAS:\n {2}- Ronda 2, Ana: apuntó \d+ y las reglas dan \d+\./);
  });

  it('avisa si el registro empezó con la partida a medias', () => {
    let r = ronda(partida(), 0);
    r.journal = []; // sala anterior al registro
    r = ronda(r, 1);
    const txt = texto(r);
    assert.match(txt, /AVISO: este registro no cubre toda la partida/);
    assert.match(txt, /No se puede rehacer la partida/);
  });

  it('una partida en curso no da bonos ni puestos', () => {
    const txt = texto(ronda(partida(), 0));
    assert.match(txt, /Estado: en curso\. La ronda 2 aún no se ha cerrado/);
    assert.match(txt, /RESUMEN HASTA AHORA/);
    assert.doesNotMatch(txt, /Bonos de fin de partida/);
  });
});
