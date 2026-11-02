import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calc } from '../lib/azul';
import {
  Action, MAX_SEATS, NUDGE_GAP_MS, Room, apply, codeFromScan, isErr, lastRound, newCode, newRoom,
  notReady, onlyOneMissing, parseAction, roomStandings,
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

  it('se saca del enlace del QR o del código suelto', () => {
    assert.equal(codeFromScan('https://azul-score.vercel.app/sala/AB7K'), 'AB7K');
    assert.equal(codeFromScan('http://192.168.1.20:3000/sala/ab7k?x=1'), 'AB7K');
    assert.equal(codeFromScan('  ab7k '), 'AB7K');
  });

  it('ignora lo que no es una sala', () => {
    assert.equal(codeFromScan('https://ejemplo.com/otra/cosa'), null);
    assert.equal(codeFromScan('https://ejemplo.com/sala/ABCDE'), null);
    assert.equal(codeFromScan('AB0K'), null); // el 0 nunca sale en un código
    assert.equal(codeFromScan(''), null);
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

describe('avisos a quien no marcó «listo»', () => {
  it('el anfitrión avisa solo a los demás que faltan', () => {
    let r = partida();
    r = ok(act(r, B, { t: 'ready', value: true }));
    r = ok(act(r, A, { t: 'nudge' }));
    assert.equal(r.seats[0].nudgedAt, undefined, 'el anfitrión no se avisa a sí mismo');
    assert.equal(r.seats[1].nudgedAt, undefined, 'Beto ya estaba listo');
    assert.ok(r.seats[2].nudgedAt && r.seats[3].nudgedAt);
    assert.deepEqual(notReady(r).map((s) => s.name), ['Ana', 'Caro', 'Dani']);
  });

  it('solo puede avisar el anfitrión y solo en partida', () => {
    let r = partida();
    falla(act(r, B, { t: 'nudge' }), 'Beto no es el anfitrión');
    r = newRoom('LOBY', A, 'Ana');
    falla(act(r, A, { t: 'nudge' }), 'en el lobby');
  });

  it('no deja avisar dos veces seguidas a la misma persona', () => {
    let r = partida();
    r = ok(act(r, A, { t: 'nudge' }));
    falla(act(r, A, { t: 'nudge' }), 'aviso repetido');
    r.seats.forEach((s) => { if (s.nudgedAt) s.nudgedAt -= NUDGE_GAP_MS; });
    ok(act(r, A, { t: 'nudge' }));
  });

  it('no avisa a asientos sin conexión ni si los demás están listos', () => {
    let r = partida();
    r = ok(act(r, B, { t: 'leave' }));
    for (const who of [C, D]) r = ok(act(r, who, { t: 'ready', value: true }));
    falla(act(r, A, { t: 'nudge' }), 'solo queda Beto, sin conexión');
  });

  it('el aviso se borra al marcar «listo» y al cerrar la ronda', () => {
    let r = partida();
    r = ok(act(r, A, { t: 'nudge' }));
    r = ok(act(r, B, { t: 'ready', value: true }));
    assert.equal(r.seats[1].nudgedAt, undefined);
    r = ok(act(r, A, { t: 'close' }));
    assert.ok(r.seats.every((s) => s.nudgedAt === undefined));
  });

  it('detecta cuándo solo falta una persona', () => {
    let r = partida();
    for (const who of [A, B, C]) r = ok(act(r, who, { t: 'ready', value: true }));
    assert.equal(onlyOneMissing(r, 3), true);
    assert.equal(onlyOneMissing(r, 0), false, 'Ana ya está lista');
    r = ok(act(r, B, { t: 'ready', value: false }));
    assert.equal(onlyOneMissing(r, 3), false, 'ahora faltan dos');
  });
});

describe('modo competitivo', () => {
  /** Partida de cuatro con reloj de 5 minutos. */
  function conReloj() {
    let r = newRoom('RELJ', A, 'Ana');
    for (const [who, n] of [[B, 'Beto'], [C, 'Caro'], [D, 'Dani']]) r = ok(act(r, who, { t: 'join', name: n }));
    r = ok(act(r, A, { t: 'clock_config', minutes: 5 }));
    return ok(act(r, A, { t: 'start' }));
  }

  it('por defecto se juega sin reloj', () => {
    const r = partida();
    assert.equal(r.clock ?? null, null);
    falla(act(r, A, { t: 'turn_start' }), 'sin reloj');
  });

  it('solo el anfitrión lo elige, en el lobby y con minutos válidos', () => {
    let r = newRoom('LOBY', A, 'Ana');
    r = ok(act(r, B, { t: 'join', name: 'Beto' }));
    falla(act(r, B, { t: 'clock_config', minutes: 5 }), 'Beto no es anfitrión');
    assert.ok(isErr(parseAction({ t: 'clock_config', minutes: 7 })));
    r = ok(act(r, A, { t: 'clock_config', minutes: 10 }));
    r = ok(act(r, A, { t: 'start' }));
    assert.equal(r.clock?.left[1], 10 * 60_000);
    falla(act(r, A, { t: 'clock_config', minutes: null }), 'ya empezada');
  });

  it('empieza quien abre la ronda y el turno pasa en orden de mesa', () => {
    let r = conReloj();
    falla(act(r, C, { t: 'turn_start' }), 'Caro no abre la ronda');
    r = ok(act(r, A, { t: 'turn_start' }));
    assert.equal(r.clock?.turn, 0);
    falla(act(r, B, { t: 'turn_pass' }), 'no es el turno de Beto');
    r = ok(act(r, A, { t: 'turn_pass' }));
    assert.equal(r.clock?.turn, 1);
    r = ok(act(r, A, { t: 'turn_pass' })); // el anfitrión pasa por Beto
    assert.equal(r.clock?.turn, 2);
    r = ok(act(r, C, { t: 'turn_stop' }));
    assert.equal(r.clock?.phase, 'scoring');
    falla(act(r, C, { t: 'turn_pass' }), 'reloj parado');
  });

  it('al cerrar la ronda cobra el tiempo extra y la siguiente la abre la ficha', () => {
    let r = conReloj();
    r = ok(act(r, B, { t: 'tap', r: 0, c: 0 }));
    r = ok(act(r, B, { t: 'first' }));
    r = ok(act(r, A, { t: 'turn_start' }));
    r.clock!.left[1] = -45_000; // Beto se pasó 45 s: 2 puntos
    r.seats[1].player.score = 10;
    r = ok(act(r, A, { t: 'close' }));
    const beto = r.seats[1].player;
    // +1 del azulejo, −1 de la ficha en el suelo, −2 del reloj.
    assert.equal(beto.score, 10 + 1 - 1 - 2);
    assert.equal(beto.timeLost, 2);
    assert.equal(beto.log.at(-1), -2, 'la ronda refleja la multa');
    assert.equal(r.clock?.phase, 'ready');
    assert.equal(r.starter, 1, 'abre Beto, que tomó la ficha');
    falla(act(r, C, { t: 'turn_start' }), 'Caro no abre esta ronda');
    r = ok(act(r, B, { t: 'turn_start' }));
    assert.equal(r.clock?.turn, 1);
  });

  it('la multa no deja la puntuación por debajo de 0', () => {
    let r = conReloj();
    r = ok(act(r, A, { t: 'turn_start' }));
    r.clock!.left[2] = -10 * 60_000;
    r = ok(act(r, A, { t: 'close' }));
    assert.equal(r.seats[2].player.score, 0);
  });

  it('deshacer devuelve el reloj, parado', () => {
    let r = conReloj();
    r = ok(act(r, A, { t: 'turn_start' }));
    r = ok(act(r, A, { t: 'close' }));
    r = ok(act(r, A, { t: 'undo' }));
    assert.equal(r.clock?.phase, 'scoring');
    assert.equal(r.clock?.since, null);
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

describe('cerrar la sala', () => {
  it('solo el anfitrión puede cerrarla', () => {
    const r = partida();
    falla(act(r, B, { t: 'close_room' }), 'Beto no es el anfitrión');
  });

  it('deja la sala en estado terminal, sin borrarla', () => {
    let r = partida();
    r = ok(act(r, A, { t: 'close_room' }));
    assert.equal(r.view, 'closed');
    assert.equal(r.seats.length, 4, 'se conserva para que los demás se enteren');
    assert.ok(r.seats.every((s) => !s.ready));
  });

  it('una sala cerrada no acepta nada más, ni del anfitrión', () => {
    let r = partida();
    r = ok(act(r, A, { t: 'close_room' }));
    for (const a of [
      { t: 'start' }, { t: 'finish' }, { t: 'close' }, { t: 'undo' },
      { t: 'tap', r: 0, c: 0 }, { t: 'floor', delta: 1 }, { t: 'first' },
      { t: 'ready', value: true }, { t: 'join', name: 'Evo' }, { t: 'close_room' }, { t: 'nudge' },
    ] as Action[]) {
      falla(act(r, A, a), `${a.t} tras cerrar`);
      falla(act(r, E, a), `${a.t} de un extraño tras cerrar`);
    }
  });
});

describe('fin de partida', () => {
  /** Ana con la fila de arriba a falta de una casilla. */
  const casiFila = (r: Room) => {
    r.seats[0].player.wall[0] = [true, true, true, true, false];
    return r;
  };

  it('avisa durante la ronda en que alguien va a completar una fila', () => {
    let r = casiFila(partida());
    assert.equal(lastRound(r), false);
    r = ok(act(r, A, { t: 'tap', r: 0, c: 4 }));
    assert.equal(lastRound(r), true);
    r = ok(act(r, A, { t: 'tap', r: 0, c: 4 })); // lo desmarca
    assert.equal(lastRound(r), false);
  });

  it('cerrar esa ronda pasa directo al resultado', () => {
    let r = casiFila(partida());
    r = ok(act(r, A, { t: 'tap', r: 0, c: 4 }));
    r = ok(act(r, A, { t: 'close' }));
    assert.equal(r.view, 'final');
    assert.equal(r.round, 2, 'se cuenta la ronda jugada');
    assert.deepEqual(r.seats[0].player.wall[0], [true, true, true, true, true]);
  });

  it('una ronda sin fila completa sigue la partida', () => {
    let r = casiFila(partida());
    r = ok(act(r, A, { t: 'close' }));
    assert.equal(r.view, 'game');
  });

  it('una sala vieja que ya tenía la fila completa termina al cerrar', () => {
    let r = partida();
    r.seats[2].player.wall[3] = [true, true, true, true, true];
    r = ok(act(r, A, { t: 'close' }));
    assert.equal(r.view, 'final');
  });

  it('no hay vuelta atrás: ni deshacer ni más rondas ni revancha', () => {
    let r = casiFila(partida());
    r = ok(act(r, A, { t: 'tap', r: 0, c: 4 }));
    r = ok(act(r, A, { t: 'close' }));
    falla(act(r, A, { t: 'undo' }), 'deshacer tras el final');
    falla(act(r, A, { t: 'close' }), 'otra ronda tras el final');
    falla(act(r, A, { t: 'start' }), 'revancha');
    assert.equal(r.history.length, 0);
  });
});

describe('resultado', () => {
  it('ordena el podio', () => {
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
  });
});
