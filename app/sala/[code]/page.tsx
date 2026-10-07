'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { COLORS, PEN, calc, colorOf, floorTiles } from '@/lib/azul';
import {
  MAX_SEATS, MIN_SEATS, Room, Seat, allReady, lastRound, roomStandings,
} from '@/lib/room';
import { clientId, saveName, savedName, useRoom } from '@/lib/client';

const sign = (n: number) => (n > 0 ? `+${n}` : String(n));
const cls = (n: number) => (n > 0 ? 'pos' : n < 0 ? 'neg' : 'zero');
const ORD = ['1.º', '2.º', '3.º', '4.º'];

export default function SalaPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = use(params);
  const code = raw.toUpperCase();
  const live = useRoom(code);
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => { setMe(clientId()); }, []);

  if (live.error && !live.room) {
    return (
      <main>
        <div className="top"><h1>Azul</h1><span className="round">Sala {code}</span></div>
        <div className="panel"><p className="err" style={{ margin: 0 }}>{live.error}</p></div>
        <Link className="linkbtn" href="/">Volver al inicio</Link>
      </main>
    );
  }

  if (!live.room || !me) {
    return (
      <main>
        <div className="top"><h1>Azul</h1><span className="round">Sala {code}</span></div>
        <div className="panel"><p className="hint" style={{ margin: 0 }}>Conectando con la sala…</p></div>
      </main>
    );
  }

  return <Sala room={live.room} me={me} live={live} />;
}

/* ---------------------------------------------------------------- */

function Sala({ room, me, live }: { room: Room; me: string; live: ReturnType<typeof useRoom> }) {
  const seat = room.seats.findIndex((s) => s.clientId === me);
  const host = room.hostId === me;
  const mine: Seat | null = seat >= 0 ? room.seats[seat] : null;

  const header = (
    <>
      <div className="top">
        <h1>Azul</h1>
        <span className="round">
          {room.view === 'lobby' ? 'Sala' : room.view === 'final' ? 'Resultado' : `Ronda ${room.round}`}
          {' · '}<b className="code">{room.code}</b>
          <i className={`dot ${live.connected ? 'on' : ''}`} title={live.connected ? 'En vivo' : 'Reconectando…'} />
        </span>
      </div>
      {live.actionError && (
        <div className="err banner-err" role="alert" onClick={live.clearActionError}>
          {live.actionError} <span className="hint">(toca para cerrar)</span>
        </div>
      )}
    </>
  );

  if (!mine) return <>{header}<Entrar room={room} live={live} /></>;
  if (room.view === 'lobby') return <>{header}<Lobby room={room} host={host} live={live} /></>;
  if (room.view === 'final') return <>{header}<Final room={room} host={host} live={live} /></>;
  return <>{header}<Juego room={room} seat={seat} host={host} live={live} /></>;
}

/* ---------- Entrar / reclamar asiento ---------- */

function Entrar({ room, live }: { room: Room; live: ReturnType<typeof useRoom> }) {
  const [name, setName] = useState('');
  useEffect(() => { setName(savedName()); }, []);

  const libres = room.seats.filter((s) => s.clientId === null);
  const lleno = room.view === 'lobby' && room.seats.length >= MAX_SEATS;

  const entrar = (n: string) => {
    const v = n.trim();
    if (!v) return;
    saveName(v);
    live.send({ t: 'join', name: v });
  };

  return (
    <main>
      <div className="panel setup">
        <h2>Entrar a la sala {room.code}</h2>

        {room.view !== 'lobby' && (
          <p className="hint">
            La partida ya empezó. Solo puedes retomar el asiento de alguien que se desconectó.
          </p>
        )}

        {room.view !== 'lobby' && libres.length > 0 && (
          <>
            <label>Asientos libres</label>
            {libres.map((s) => (
              <button key={s.name} className="btn" style={{ width: '100%', marginTop: 8 }} onClick={() => entrar(s.name)}>
                Soy {s.name} · {s.player.score} pts
              </button>
            ))}
          </>
        )}

        {room.view !== 'lobby' && libres.length === 0 && (
          <p className="err">No hay asientos libres ahora mismo.</p>
        )}

        {room.view === 'lobby' && (
          <>
            {lleno ? (
              <p className="err">La sala ya tiene {MAX_SEATS} jugadores.</p>
            ) : (
              <>
                <label htmlFor="nm">Tu nombre</label>
                <input
                  type="text" id="nm" maxLength={14} autoComplete="off"
                  value={name} onChange={(e) => setName(e.target.value)}
                />
                <button
                  className="btn primary" style={{ width: '100%', marginTop: 14 }}
                  disabled={!name.trim()} onClick={() => entrar(name)}
                >
                  Sentarme
                </button>
              </>
            )}
            <p className="hint" style={{ marginTop: 14 }}>
              Ya en la sala: {room.seats.map((s) => s.name).join(', ') || 'nadie todavía'}
            </p>
          </>
        )}
      </div>
      <Link className="linkbtn" href="/">Volver al inicio</Link>
    </main>
  );
}

/* ---------- Lobby ---------- */

function Lobby({ room, host, live }: { room: Room; host: boolean; live: ReturnType<typeof useRoom> }) {
  const faltan = MIN_SEATS - room.seats.length;
  return (
    <main>
      <div className="panel">
        <h2>Esperando jugadores</h2>
        <p className="hint">Comparte este código para que entren desde su móvil:</p>
        <div className="code-big">{room.code}</div>

        <ul className="seats">
          {room.seats.map((s, i) => (
            <li key={i}>
              <span className="seat-n">{i + 1}</span>
              <span className="seat-name">{s.name}</span>
              {room.hostId === s.clientId && <span className="tag">anfitrión</span>}
            </li>
          ))}
          {Array.from({ length: MAX_SEATS - room.seats.length }, (_, i) => (
            <li key={`e${i}`} className="empty">
              <span className="seat-n">{room.seats.length + i + 1}</span>
              <span className="seat-name">libre</span>
            </li>
          ))}
        </ul>

        {host ? (
          <button
            className="btn primary" style={{ width: '100%', marginTop: 16 }}
            disabled={faltan > 0} onClick={() => live.send({ t: 'start' })}
          >
            {faltan > 0 ? `Faltan ${faltan} jugador${faltan > 1 ? 'es' : ''}` : 'Empezar partida'}
          </button>
        ) : (
          <p className="hint" style={{ marginTop: 16 }}>El anfitrión inicia la partida cuando estén todos.</p>
        )}
      </div>

      <button className="linkbtn" style={{ color: 'var(--muted)' }} onClick={() => live.send({ t: 'leave' })}>
        Salir de la sala
      </button>
    </main>
  );
}

/* ---------- Juego ---------- */

function Juego({
  room, seat, host, live,
}: { room: Room; seat: number; host: boolean; live: ReturnType<typeof useRoom> }) {
  const mine = room.seats[seat];
  const p = mine.player;
  const iHaveFirst = room.first === seat;
  const res = calc(p, iHaveFirst);
  const tiles = floorTiles(p, iHaveFirst);
  const listos = room.seats.filter((s) => s.ready).length;

  return (
    <main>
      {lastRound(room) && (
        <div className="banner">Hay una fila completa: esta es la última ronda.</div>
      )}

      <div className="chips">
        {room.seats.map((s, i) => {
          const d = calc(s.player, room.first === i).delta;
          return (
            <div key={i} className={`chip ${i === seat ? 'self' : ''} ${s.ready ? 'ready' : ''}`}>
              <div className="n">
                {s.name}
                {room.first === i && <span className="tok" title="Tiene la ficha de jugador inicial">1</span>}
                {s.clientId === null && <span className="tag off">sin conexión</span>}
              </div>
              <div className="s">{s.player.score}</div>
              <div className={`d ${cls(d)}`}>
                {s.ready ? '✓ listo' : d === 0 ? ' ' : `${sign(d)} esta ronda`}
              </div>
            </div>
          );
        })}
      </div>

      <section className="panel">
        <h2>Tu tablero · {mine.name}</h2>
        <p className="hint">
          Toca un azulejo de cada fila que pasó de tu tablero de preparación a la pared.
          {room.starter === seat && ' Tú abriste esta ronda.'}
        </p>

        <div className="wall">
          {Array.from({ length: 25 }, (_, i) => {
            const r = Math.floor(i / 5), c = i % 5;
            const k = colorOf(r, c);
            const placed = p.wall[r][c], pend = p.pending[r] === c;
            return (
              <button
                key={i}
                className={`cell ${placed ? 'placed' : ''} ${pend ? 'pending' : ''}`}
                style={{ background: placed || pend ? COLORS[k] : COLORS[k] + '3d' }}
                disabled={placed}
                onClick={() => live.send({ t: 'tap', r, c })}
                aria-label={`Fila ${r + 1}, columna ${c + 1}${placed ? ', colocado' : pend ? ', por colocar' : ''}`}
              />
            );
          })}
        </div>

        <button
          className={`first-ctl ${iHaveFirst ? 'on' : ''}`} aria-pressed={iHaveFirst}
          onClick={() => live.send({ t: 'first' })}
        >
          <span className="tok big">1</span>
          <span className="first-txt">
            <strong>Ficha de jugador inicial</strong>
            <span className="hint">
              {iHaveFirst
                ? `La tienes tú: ocupa un espacio del suelo y abres la ronda ${room.round + 1}.`
                : room.first !== null
                  ? `La tiene ${room.seats[room.first].name}. Toca si la tomaste tú.`
                  : 'Quien toma primero del centro la recibe. Toca si fuiste tú.'}
            </span>
          </span>
        </button>

        <div className="row-ctl">
          <div>
            <strong>Suelo</strong>
            <div className="hint" style={{ margin: 0 }}>
              Azulejos caídos{iHaveFirst ? ', sin contar la ficha' : ''}
            </div>
          </div>
          <div className="stepper">
            <button onClick={() => live.send({ t: 'floor', delta: -1 })} aria-label="Quitar uno">−</button>
            <output>{p.floor}</output>
            <button onClick={() => live.send({ t: 'floor', delta: 1 })} aria-label="Añadir uno">+</button>
          </div>
        </div>
        <div className="floor-slots">
          {PEN.map((v, i) => (
            <div key={i} className={`slot ${i < tiles ? 'on' : ''} ${iHaveFirst && i === tiles - 1 ? 'tok-on' : ''}`}>−{v}</div>
          ))}
        </div>

        <div className="preview">
          Colocados <b className="pos">{sign(res.gain)}</b> · Suelo{' '}
          <b className={res.pen ? 'neg' : 'zero'}>{res.pen ? `−${res.pen}` : '0'}</b>
          {iHaveFirst && <span className="hint"> (incluye la ficha)</span>}<br />
          Total tras la ronda: <b>{res.after}</b>
        </div>

        <div className="log">
          {p.log.length
            ? <>Rondas: {p.log.map((d, i) => <span key={i}>{i > 0 && ' · '}R{i + 1} <span className={cls(d)}>{sign(d)}</span></span>)}</>
            : 'Aún no hay rondas cerradas.'}
        </div>
      </section>

      {host && (
        <section className="panel host">
          <h2>Anfitrión</h2>
          <p className="hint">
            {listos} de {room.seats.length} listos
            {allReady(room) ? ' · ya puedes cerrar la ronda' : ' · espera a que todos confirmen'}
          </p>
          <div className="host-btns">
            <button className="btn" disabled={!room.history.length} onClick={() => live.send({ t: 'undo' })}>
              Deshacer ronda
            </button>
            <button className="btn" onClick={() => live.send({ t: 'finish' })}>
              Terminar y sumar bonos
            </button>
          </div>
          <button
            className={`btn ${allReady(room) ? 'primary' : ''}`} style={{ width: '100%', marginTop: 8 }}
            onClick={() => live.send({ t: 'close' })}
          >
            Cerrar ronda {room.round}
          </button>
        </section>
      )}

      <button className="linkbtn" style={{ color: 'var(--muted)' }} onClick={() => live.send({ t: 'leave' })}>
        Salir de la sala
      </button>

      <div className="bar"><div className="in one">
        <button
          className={`btn ${mine.ready ? '' : 'primary'}`}
          onClick={() => live.send({ t: 'ready', value: !mine.ready })}
        >
          {mine.ready ? '✓ Listo · toca para corregir' : 'Estoy listo'}
        </button>
      </div></div>
    </main>
  );
}

/* ---------- Final ---------- */

function Final({ room, host, live }: { room: Room; host: boolean; live: ReturnType<typeof useRoom> }) {
  const table = roomStandings(room);
  const sharedWin = table.some((r) => r.place === 1 && r.shared);

  return (
    <main>
      <p className="hint">{room.round - 1} rondas jugadas.</p>
      {table.map(({ p, b, total, place, shared }, i) => (
        <section key={i} className={`panel res ${place === 1 ? 'win' : ''}`}>
          <h2>
            <span className={`place p${place}`}>{ORD[place - 1]}</span> {p.name}
            {place === 1 && <span className="crown"> · Ganador{shared ? ' (empate)' : ''}</span>}
            {place > 1 && shared && <span className="crown"> · empate</span>}
          </h2>
          <table>
            <tbody>
              <tr><td>Puntos de rondas</td><td>{p.score}</td></tr>
              <tr><td>Filas completas ({b.rows} × 2)</td><td>+{b.rows * 2}</td></tr>
              <tr><td>Columnas completas ({b.cols} × 7)</td><td>+{b.cols * 7}</td></tr>
              <tr><td>Colores completos ({b.colors} × 10)</td><td>+{b.colors * 10}</td></tr>
              <tr className="tot"><td>Total</td><td>{total}</td></tr>
            </tbody>
          </table>
        </section>
      ))}

      <p className="hint">
        Orden por puntos totales. Desempate: más filas horizontales completas; si persiste, el puesto se comparte.
        {sharedWin && ' Hay victoria compartida.'}
      </p>

      {host && (
        <div className="bar"><div className="in">
          <button className="btn" onClick={() => live.send({ t: 'reopen' })}>Volver</button>
          <button className="btn primary" onClick={() => live.send({ t: 'start' })}>Revancha</button>
        </div></div>
      )}
    </main>
  );
}
