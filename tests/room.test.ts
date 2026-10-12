import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calc } from '../lib/azul';
import {
  Action, MAX_SEATS, Room, apply, isErr, newCode, newRoom, parseAction, roomStandings,
} from '../lib/room';

const ok = (r: Room | { error: string }): Room => {
  assert.ok(!isErr(r), `esperaba éxito, obtuve: ${isErr(r) ? r.error : ''}`);
  return r as Room;
};
const falla = (r: Room | { error: string }, hint: string) => {
  assert.ok(isErr(r), `esperaba error (${hint}) pero la acción pasó`);
};
const act = (room: Room, who: string, a: Action) => apply(room, who, a);

const A = 'cli-ana', B = 'cli-beto', C = 'cli-caro', D = 'cli-dani', E = 'cli-evo';

/** Sala de cuatro con la partida ya iniciada. */
function partida() {
  let r = newRoom('TEST', A, 'Ana');
  r = ok(act(r, B, { t: 'join', name: 'Beto' }));
  r = ok(act(r, C, { t: 'join', name: 'Caro' }));
  r = ok(act(r, D, { t: 'join', name: 'Dani' }));
  return ok(act(r, A, { t: 'start' }));
}

describe('código de sala', () => {
  it('tiene 4 caracteres sin los que se confunden al dictar', () => {
    for (let i = 0; i < 200; i++) {
      const c = newCode();
      assert.match(c, /^[A-Z0-9]{4}$/);
      assert.ok(!/[01I5OS]/.test(c), `código ambiguo: ${c}`);
    }
  });
});

describe('validación de lo que llega por la red', () => {
  it('rechaza coordenadas fuera del tablero', () => {
    assert.ok(isErr(parseAction({ t: 'tap', r: 9, c: 0 })));
    assert.ok(isErr(parseAction({ t: 'tap', r: 0, c: -1 })));
  });
  it('rechaza pasos de suelo que no sean ±1', () => {
    assert.ok(isErr(parseAction({ t: 'floor', delta: 99 })));
  });
  it('rechaza acciones inventadas y basura', () => {
    assert.ok(isErr(parseAction({ t: 'formatear' })));
    assert.ok(isErr(parseAction(null)));
  });
  it('recorta los nombres demasiado largos', () => {
    const a = parseAction({ t: 'join', name: '  Nombre larguísimo de más  ' });
    assert.ok(!isErr(a) && a.t === 'join' && a.name.length <= 14);
  });
});

describe('lobby', () => {
  it('no admite nombres repetidos', () => {
    let r = newRoom('TEST', A, 'Ana');
    r = ok(act(r, B, { t: 'join', name: 'Beto' }));
    falla(act(r, C, { t: 'join', name: 'beto' }), 'nombre repetido');
  });

  it('no admite un quinto jugador', () => {
    let r = newRoom('TEST', A, 'Ana');
    r = ok(act(r, B, { t: 'join', name: 'Beto' }));
    r = ok(act(r, C, { t: 'join', name: 'Caro' }));
    r = ok(act(r, D, { t: 'join', name: 'Dani' }));
    assert.equal(r.seats.length, MAX_SEATS);
    falla(act(r, E, { t: 'join', name: 'Evo' }), 'sala llena');
  });

  it('exige al menos dos jugadores para empezar', () => {
    const r = newRoom('TEST', A, 'Ana');
    falla(act(r, A, { t: 'start' }), 'falta gente');
  });
});

describe('permisos', () => {
  it('solo el anfitrión inicia, cierra, deshace y termina', () => {
    const r = partida();
    for (const a of [{ t: 'close' }, { t: 'undo' }, { t: 'finish' }] as Action[])
      falla(act(r, B, a), `${a.t} no es de Beto`);
  });

  it('quien no está sentado no puede jugar', () => {
    const r = partida();
    falla(act(r, E, { t: 'tap', r: 0, c: 0 }), 'mirón');
  });

  it('cada jugador solo toca su propio tablero', () => {
    let r = partida();
    const antes = JSON.stringify(r.seats[0].player);
    r = ok(act(r, B, { t: 'tap', r: 0, c: 0 }));
    assert.equal(JSON.stringify(r.seats[0].player), antes, 'Ana no debió cambiar');
    assert.equal(r.seats[1].player.pending[0], 0);
  });
});

describe('ficha de jugador inicial', () => {
  it('la tiene uno solo: tomarla se la quita al anterior', () => {
    let r = partida();
    r = ok(act(r, B, { t: 'first' }));
    assert.equal(r.first, 1);
    r = ok(act(r, C, { t: 'first' }));
    assert.equal(r.first, 2);
  });

  it('descuenta como azulejo de suelo', () => {
    let r = partida();
    r = ok(act(r, C, { t: 'first' }));
    r = ok(act(r, C, { t: 'tap', r: 0, c: 0 }));
    r = ok(act(r, C, { t: 'floor', delta: 1 }));
    const res = calc(r.seats[2].player, true);
    assert.deepEqual({ gain: res.gain, pen: res.pen }, { gain: 1, pen: 2 });
  });

  it('quien la tiene abre la ronda siguiente', () => {
    let r = partida();
    r = ok(act(r, C, { t: 'first' }));
    r = ok(act(r, A, { t: 'close' }));
    assert.equal(r.starter, 2);
    assert.equal(r.first, null);
    assert.equal(r.round, 2);
  });
});

describe('ciclo de la ronda', () => {
  it('editar cancela el «estoy listo»', () => {
    let r = partida();
    r = ok(act(r, A, { t: 'ready', value: true }));
    assert.equal(r.seats[0].ready, true);
    r = ok(act(r, A, { t: 'tap', r: 1, c: 1 }));
    assert.equal(r.seats[0].ready, false);
  });

  it('cerrar limpia los listos y avanza la versión', () => {
    let r = partida();
    const v = r.version;
    r = ok(act(r, A, { t: 'ready', value: true }));
    r = ok(act(r, A, { t: 'close' }));
    assert.ok(r.seats.every((s) => !s.ready));
    assert.ok(r.version > v);
  });

  it('deshacer devuelve el estado anterior', () => {
    let r = partida();
    r = ok(act(r, B, { t: 'tap', r: 0, c: 0 }));
    r = ok(act(r, C, { t: 'first' }));
    r = ok(act(r, A, { t: 'close' }));
    r = ok(act(r, A, { t: 'undo' }));
    assert.equal(r.round, 1);
    assert.equal(r.first, 2);
    assert.equal(r.seats[1].player.pending[0], 0);
    falla(act(r, A, { t: 'undo' }), 'sin historial');
  });
});

describe('desconexiones', () => {
  it('el asiento queda reservado con sus puntos y se puede retomar', () => {
    let r = partida();
    r.seats[1].player.score = 17;
    r = ok(act(r, B, { t: 'leave' }));
    assert.equal(r.seats[1].clientId, null);
    assert.equal(r.seats.length, 4, 'el asiento no se borra en partida');
    falla(act(r, B, { t: 'tap', r: 0, c: 0 }), 'ya no está sentado');

    r = ok(act(r, E, { t: 'join', name: 'Beto' }));
    assert.equal(r.seats[1].clientId, E);
    assert.equal(r.seats[1].player.score, 17);
  });

  it('si se va el anfitrión, otro toma el relevo', () => {
    let r = partida();
    r = ok(act(r, A, { t: 'leave' }));
    assert.notEqual(r.hostId, A);
    assert.ok(r.seats.some((s) => s.clientId === r.hostId));
  });
});

describe('final y revancha', () => {
  it('ordena el podio y permite volver a jugar con los mismos', () => {
    let r = partida();
    r.seats[0].player.score = 40;
    r.seats[1].player.score = 62;
    r.seats[2].player.score = 55;
    r.seats[3].player.score = 62;
    r.seats[3].player.wall[0] = [true, true, true, true, true];

    r = ok(act(r, A, { t: 'finish' }));
    assert.equal(r.view, 'final');
    assert.deepEqual(
      roomStandings(r).map((s) => `${s.place} ${s.p.name}`),
      ['1 Dani', '2 Beto', '3 Caro', '4 Ana'],
    );

    r = ok(act(r, A, { t: 'start' }));
    assert.equal(r.round, 1);
    assert.equal(r.seats.length, 4);
    assert.ok(r.seats.every((s) => s.player.score === 0));
  });
});
