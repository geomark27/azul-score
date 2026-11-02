import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  closeRoundClock, endOffer, formatClock, newClock, overtimePoints, passTurn, remaining, startOffer,
  togglePause,
} from '../lib/clock';

const MIN = 60_000;

describe('reloj competitivo', () => {
  it('solo corre el reloj de quien tiene el turno', () => {
    const c = newClock(5, 3);
    startOffer(c, 1, 0);
    assert.equal(remaining(c, 1, 20_000), 5 * MIN - 20_000);
    assert.equal(remaining(c, 0, 20_000), 5 * MIN);
    passTurn(c, 2, 20_000);
    assert.equal(remaining(c, 1, 90_000), 5 * MIN - 20_000, 'el anterior se queda quieto');
    assert.equal(remaining(c, 2, 90_000), 5 * MIN - 70_000);
  });

  it('se para al anotar y no gasta tiempo en esa fase', () => {
    const c = newClock(5, 2);
    startOffer(c, 0, 0);
    endOffer(c, 10_000);
    assert.equal(c.phase, 'scoring');
    assert.equal(remaining(c, 0, 999_999), 5 * MIN - 10_000);
  });

  it('la pausa congela el turno, también si se pasa durante la pausa', () => {
    const c = newClock(5, 2);
    startOffer(c, 0, 0);
    togglePause(c, 10_000);
    assert.equal(remaining(c, 0, 50_000), 5 * MIN - 10_000);
    passTurn(c, 1, 50_000);
    assert.equal(remaining(c, 1, 80_000), 5 * MIN, 'en pausa no corre el siguiente');
    togglePause(c, 80_000);
    assert.equal(remaining(c, 1, 85_000), 5 * MIN - 5_000);
  });

  it('cobra 1 punto al pasarse y otro por cada 30 s, una sola vez', () => {
    assert.equal(overtimePoints(1), 0);
    assert.equal(overtimePoints(0), 0);
    assert.equal(overtimePoints(-1), 1);
    assert.equal(overtimePoints(-30_000), 1);
    assert.equal(overtimePoints(-30_001), 2);

    const c = newClock(5, 2);
    startOffer(c, 0, 0);
    assert.deepEqual(closeRoundClock(c, 5 * MIN + 40_000), [2, 0], '40 s de más = 2 puntos');
    assert.equal(c.phase, 'ready');
    startOffer(c, 0, 0);
    assert.deepEqual(closeRoundClock(c, 10_000), [0, 0], '50 s de más siguen siendo 2: ya cobrados');
    startOffer(c, 0, 0);
    assert.deepEqual(closeRoundClock(c, 15_000), [1, 0], '65 s de más son 3: solo se cobra el nuevo');
    startOffer(c, 1, 0);
    assert.deepEqual(closeRoundClock(c, 1_000), [0, 0], 'sin pasarse no hay multa');
  });

  it('formatea como un reloj de ajedrez', () => {
    assert.equal(formatClock(5 * MIN), '5:00');
    assert.equal(formatClock(61_500), '1:02');
    assert.equal(formatClock(400), '0:01');
    assert.equal(formatClock(-12_300), '−0:12');
  });
});
