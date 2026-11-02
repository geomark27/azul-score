'use client';

import { useEffect, useState } from 'react';
import { CLOCK_MINUTES, formatClock, overtimePoints, remaining } from '@/lib/clock';
import { Room } from '@/lib/room';
import type { Live } from '@/lib/client';

/** Hora del servidor, refrescada 4 veces por segundo mientras `activo`. */
export function useAhora(live: Live, activo: boolean): number {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!activo) return;
    const id = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [activo]);
  return live.serverNow();
}

/** Tiempo de un asiento para los chips de puntuación. */
export function TiempoChip({ room, seat, now }: { room: Room; seat: number; now: number }) {
  const c = room.clock;
  if (!c) return null;
  const ms = remaining(c, seat, now);
  const corre = c.turn === seat && c.phase === 'offer';
  const multa = overtimePoints(ms);
  return (
    <div className={`clk ${corre ? 'on' : ''} ${ms < 0 ? 'neg' : ''}`}>
      ⏱ {formatClock(ms)}{multa > 0 && ` · −${multa}`}
    </div>
  );
}

/* ---------- Lobby: elegir el modo ---------- */

export function ModoJuego({ room, host, live }: { room: Room; host: boolean; live: Live }) {
  const m = room.clockMinutes ?? null;
  if (!host) {
    return (
      <p className="hint" style={{ marginTop: 16 }}>
        {m ? `Modo competitivo: ${m} min de reloj por jugador.` : 'Modo normal, sin reloj.'}
      </p>
    );
  }
  return (
    <div className="modo">
      <label>Modo de juego</label>
      <div className="seg">
        <button aria-pressed={!m} onClick={() => live.send({ t: 'clock_config', minutes: null })}>
          Normal
        </button>
        <button aria-pressed={!!m} onClick={() => live.send({ t: 'clock_config', minutes: m ?? 10 })}>
          Competitivo ⏱
        </button>
      </div>
      {m ? (
        <>
          <p className="hint">Minutos de reloj por jugador, para toda la partida:</p>
          <div className="seg">
            {CLOCK_MINUTES.map((x) => (
              <button key={x} aria-pressed={m === x} onClick={() => live.send({ t: 'clock_config', minutes: x })}>
                {x} min
              </button>
            ))}
          </div>
          <p className="hint">
            Tu reloj solo corre en tu turno al coger azulejos y se para al anotar. Si se te acaba,
            sigues jugando pero pierdes 1 punto, y otro más por cada 30 s extra.
          </p>
        </>
      ) : (
        <p className="hint">Sin reloj: cada uno juega a su ritmo.</p>
      )}
    </div>
  );
}

/* ---------- Partida: control del reloj ---------- */

export function Reloj({
  room, seat, host, live, now,
}: { room: Room; seat: number; host: boolean; live: Live; now: number }) {
  const c = room.clock;
  if (!c) return null;

  // Antes de empezar la ronda manda el panel «Empezar ronda» (inicio-ronda.tsx).
  if (c.phase === 'ready') return null;

  if (c.phase === 'scoring') {
    return (
      <section className="panel reloj">
        <h2>⏱ Reloj parado</h2>
        <p className="hint" style={{ margin: 0 }}>Se acabaron los azulejos: anotad la ronda sin prisa.</p>
      </section>
    );
  }

  // Oferta: corre el reloj de quien tiene el turno.
  const turno = c.turn ?? 0;
  const ms = remaining(c, turno, now);
  const mio = turno === seat;
  const nombre = room.seats[turno]?.name ?? '—';
  return (
    <section className={`panel reloj ${mio ? 'mio' : ''}`}>
      <div className="reloj-turno">
        <span>{mio ? 'Tu turno' : `Turno de ${nombre}`}{c.paused && <span className="tag">en pausa</span>}</span>
        <b className={ms < 0 ? 'neg' : ''}>{formatClock(ms)}</b>
      </div>
      {mio && <p className="hint">Coge tus azulejos y pulsa «Terminé mi turno» abajo.</p>}
      {(mio || host) && (
        <div className="host-btns" style={{ marginTop: 8 }}>
          {host && !mio && (
            <button className="btn" onClick={() => live.send({ t: 'turn_pass' })}>Pasar turno de {nombre}</button>
          )}
          {host && (
            <button className="btn" onClick={() => live.send({ t: 'clock_pause' })}>
              {c.paused ? 'Reanudar' : 'Pausar'}
            </button>
          )}
          <button className="btn" onClick={() => live.send({ t: 'turn_stop' })}>
            Sin azulejos: a anotar
          </button>
        </div>
      )}
    </section>
  );
}
