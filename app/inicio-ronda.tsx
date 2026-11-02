'use client';

import { useEffect } from 'react';
import { Room } from '@/lib/room';
import type { Live } from '@/lib/client';
import { alarma } from './aviso-listo';

/**
 * Panel de inicio de ronda. Cada ronda la abre quien tiene la ficha 1 (en la
 * primera, quien salió en el sorteo) y hasta que pulse «Empezar ronda» nadie
 * puede anotar. A esa persona le suena y vibra el móvil para que no se le pase;
 * el anfitrión puede empezarla por ella.
 */
export default function InicioRonda({
  room, seat, host, live,
}: { room: Room; seat: number; host: boolean; live: Live }) {
  const yo = seat === room.starter;
  const abre = room.seats[room.starter]?.name ?? '—';
  const esperando = !!room.waiting;

  // Avisa una vez por ronda a quien la abre; el título parpadea hasta que empiece.
  useEffect(() => {
    if (!esperando || !yo) return;
    return alarma('🔵 Abres tú la ronda');
  }, [esperando, yo, room.round]);

  if (!esperando) return null;

  const empezar = () => live.send({ t: 'round_start' });
  const sorteo = room.round === 1;

  return (
    <section className={`panel inicio ${yo ? 'mio' : ''}`} role="status">
      <div className="inicio-cab">
        <span className="tok big" aria-hidden="true">1</span>
        <div>
          <h2>{yo ? `Abres tú la ronda ${room.round}` : `Ronda ${room.round}: la abre ${abre}`}</h2>
          <p className="hint">
            {sorteo
              ? `Sorteo: ${yo ? 'te tocó a ti' : `le tocó a ${abre}`} empezar la partida.`
              : `${yo ? 'Te llevaste' : `${abre} se llevó`} la ficha de jugador inicial.`}
          </p>
        </div>
      </div>
      <p className="hint">
        {yo
          ? 'Reparte las fábricas y pulsa «Empezar ronda». Hasta entonces nadie puede anotar.'
          : `Hasta que ${abre} empiece la ronda no se pueden anotar azulejos.`}
        {room.clock && (yo ? ' Tu reloj empieza a correr al pulsar.' : ` Su reloj empieza a correr cuando pulse.`)}
      </p>
      {yo ? (
        <button className="btn primary" style={{ width: '100%' }} onClick={empezar}>
          Empezar ronda {room.round}
        </button>
      ) : host ? (
        <button className="btn" style={{ width: '100%' }} onClick={empezar}>
          Empezar por {abre}
        </button>
      ) : null}
    </section>
  );
}
