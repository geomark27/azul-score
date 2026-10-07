'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  COLORS, PEN, Player, calc, closeRoundFor, colorOf, floorTiles, hasFullRow, newPlayer, standings,
} from '@/lib/azul';

type State = {
  view: 'setup' | 'game' | 'final';
  count: number;
  names: string[];
  players: Player[];
  round: number;
  active: number;
  first: number | null; // quién tomó la ficha de jugador inicial esta ronda
  history: string[];
};

const KEY = 'azul-marcador-v1';
const INITIAL: State = {
  view: 'setup',
  count: 2,
  names: ['Jugador 1', 'Jugador 2', 'Jugador 3', 'Jugador 4'],
  players: [],
  round: 1,
  active: 0,
  first: null,
  history: [],
};

const sign = (n: number) => (n > 0 ? `+${n}` : String(n));
const cls = (n: number) => (n > 0 ? 'pos' : n < 0 ? 'neg' : 'zero');
const ORD = ['1.º', '2.º', '3.º', '4.º'];

export default function Page() {
  const [s, setS] = useState<State>(INITIAL);
  const [ready, setReady] = useState(false);
  const [askNew, setAskNew] = useState(false);
  const askTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const t = localStorage.getItem(KEY);
      if (t) setS({ ...INITIAL, ...JSON.parse(t) });
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  }, [s, ready]);

  if (!ready) return null;

  const update = (fn: (d: State) => void) =>
    setS((prev) => {
      const d = structuredClone(prev);
      fn(d);
      return d;
    });

  const start = () =>
    update((d) => {
      d.players = d.names.slice(0, d.count).map((n, i) => newPlayer(n.trim() || `Jugador ${i + 1}`));
      d.round = 1; d.active = 0; d.first = null; d.history = []; d.view = 'game';
    });

  const tapCell = (r: number, c: number) =>
    update((d) => {
      const p = d.players[d.active];
      if (p.wall[r][c]) return;
      p.pending[r] = p.pending[r] === c ? -1 : c;
    });

  const setFloor = (delta: number) =>
    update((d) => {
      const p = d.players[d.active];
      p.floor = Math.max(0, Math.min(PEN.length, p.floor + delta));
    });

  // La ficha de jugador inicial la tiene un único jugador por ronda.
  const toggleFirst = () =>
    update((d) => { d.first = d.first === d.active ? null : d.active; });

  const closeRound = () =>
    update((d) => {
      d.history.push(JSON.stringify({ players: d.players, round: d.round, active: d.active, first: d.first }));
      d.players = d.players.map((p, i) => closeRoundFor(p, i === d.first));
      // Quien tomó la ficha abre la siguiente ronda.
      if (d.first !== null) d.active = d.first;
      d.first = null;
      d.round += 1;
    });

  const undoRound = () =>
    update((d) => {
      const h = d.history.pop();
      if (!h) return;
      const o = JSON.parse(h);
      d.players = o.players; d.round = o.round;
      d.active = o.active ?? d.active;
      d.first = o.first ?? null;
    });

  const newGame = () => {
    if (!askNew) {
      setAskNew(true);
      if (askTimer.current) clearTimeout(askTimer.current);
      askTimer.current = setTimeout(() => setAskNew(false), 4000);
      return;
    }
    if (askTimer.current) clearTimeout(askTimer.current);
    setAskNew(false);
    update((d) => { d.view = 'setup'; d.players = []; d.history = []; d.first = null; });
  };
  const newLabel = askNew ? '¿Seguro? Toca otra vez' : 'Partida nueva';

  /* ---------- Setup ---------- */
  if (s.view === 'setup') {
    return (
      <main>
        <div className="top"><h1>Azul</h1><span className="round">Marcador</span></div>
        <div className="panel setup">
          <div className="mosaic" aria-hidden="true">
            {Array.from({ length: 25 }, (_, i) => (
              <i key={i} style={{ background: COLORS[colorOf(Math.floor(i / 5), i % 5)] }} />
            ))}
          </div>
          <h2>Nueva partida</h2>
          <label>Número de jugadores</label>
          <div className="count">
            {[2, 3, 4].map((n) => (
              <button key={n} aria-pressed={s.count === n} onClick={() => update((d) => { d.count = n; })}>{n}</button>
            ))}
          </div>
          {Array.from({ length: s.count }, (_, i) => (
            <div key={i}>
              <label htmlFor={`n${i}`}>Jugador {i + 1}</label>
              <input
                type="text" id={`n${i}`} maxLength={14} autoComplete="off"
                value={s.names[i]}
                onChange={(e) => update((d) => { d.names[i] = e.target.value; })}
              />
            </div>
          ))}
          <button className="btn primary" style={{ width: '100%', marginTop: 18 }} onClick={start}>Empezar</button>
        </div>
        <Link className="linkbtn" href="/">Jugar cada uno en su móvil</Link>
      </main>
    );
  }

  /* ---------- Final ---------- */
  if (s.view === 'final') {
    const table = standings(s.players);
    const sharedWin = table.some((r) => r.place === 1 && r.shared);
    return (
      <main>
        <div className="top"><h1>Resultado</h1><span className="round">{s.round - 1} rondas</span></div>
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
        <div className="bar"><div className="in">
          <button className="btn" onClick={() => update((d) => { d.view = 'game'; })}>Volver</button>
          <button className="btn primary" onClick={newGame}>{newLabel}</button>
        </div></div>
      </main>
    );
  }

  /* ---------- Juego ---------- */
  const p = s.players[s.active];
  const iHaveFirst = s.first === s.active;
  const res = calc(p, iHaveFirst);
  const tiles = floorTiles(p, iHaveFirst);
  return (
    <main>
      <div className="top"><h1>Azul</h1><span className="round">Ronda {s.round}</span></div>
      {hasFullRow(s.players) && (
        <div className="banner">Hay una fila completa: esta es la última ronda. Ciérrala y pulsa «Terminar partida».</div>
      )}
      <div className="chips">
        {s.players.map((q, i) => {
          const d = calc(q, s.first === i).delta;
          return (
            <button key={i} className="chip" aria-pressed={i === s.active} onClick={() => update((x) => { x.active = i; })}>
              <div className="n">
                {q.name}
                {s.first === i && <span className="tok" title="Tiene la ficha de jugador inicial">1</span>}
              </div>
              <div className="s">{q.score}</div>
              <div className={`d ${cls(d)}`}>{d === 0 ? ' ' : `${sign(d)} esta ronda`}</div>
            </button>
          );
        })}
      </div>

      <section className="panel">
        <h2>{p.name}</h2>
        <p className="hint">Toca un azulejo de cada fila que pasó de tu tablero de preparación a la pared.</p>
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
                onClick={() => tapCell(r, c)}
                aria-label={`Fila ${r + 1}, columna ${c + 1}${placed ? ', colocado' : pend ? ', por colocar' : ''}`}
              />
            );
          })}
        </div>

        <button className={`first-ctl ${iHaveFirst ? 'on' : ''}`} aria-pressed={iHaveFirst} onClick={toggleFirst}>
          <span className="tok big">1</span>
          <span className="first-txt">
            <strong>Ficha de jugador inicial</strong>
            <span className="hint">
              {iHaveFirst
                ? `La tiene ${p.name}: ocupa un espacio del suelo y abre la ronda ${s.round + 1}.`
                : s.first !== null
                  ? `Ahora la tiene ${s.players[s.first].name}. Toca para pasársela a ${p.name}.`
                  : 'Quien toma primero del centro la recibe. Toca si es este jugador.'}
            </span>
          </span>
        </button>

        <div className="row-ctl">
          <div>
            <strong>Suelo</strong>
            <div className="hint" style={{ margin: 0 }}>Azulejos caídos{iHaveFirst ? ', sin contar la ficha' : ''}</div>
          </div>
          <div className="stepper">
            <button onClick={() => setFloor(-1)} aria-label="Quitar uno">−</button>
            <output>{p.floor}</output>
            <button onClick={() => setFloor(1)} aria-label="Añadir uno">+</button>
          </div>
        </div>
        <div className="floor-slots">
          {PEN.map((v, i) => (
            <div key={i} className={`slot ${i < tiles ? 'on' : ''} ${iHaveFirst && i === tiles - 1 ? 'tok-on' : ''}`}>−{v}</div>
          ))}
        </div>

        <div className="preview">
          Colocados <b className="pos">{sign(res.gain)}</b> · Suelo <b className={res.pen ? 'neg' : 'zero'}>{res.pen ? `−${res.pen}` : '0'}</b>
          {iHaveFirst && <span className="hint"> (incluye la ficha)</span>}<br />
          Total tras la ronda: <b>{res.after}</b>
        </div>
        <div className="log">
          {p.log.length
            ? <>Rondas: {p.log.map((d, i) => <span key={i}>{i > 0 && ' · '}R{i + 1} <span className={cls(d)}>{sign(d)}</span></span>)}</>
            : 'Aún no hay rondas cerradas.'}
        </div>
      </section>

      <button className="linkbtn" onClick={() => update((d) => { d.view = 'final'; })}>Terminar partida y sumar bonos</button>
      <button className="linkbtn" style={{ color: 'var(--muted)' }} onClick={newGame}>{newLabel}</button>

      <div className="bar"><div className="in">
        <button className="btn" disabled={!s.history.length} onClick={undoRound}>Deshacer ronda</button>
        <button className="btn primary" onClick={closeRound}>Cerrar ronda {s.round}</button>
      </div></div>
    </main>
  );
}
