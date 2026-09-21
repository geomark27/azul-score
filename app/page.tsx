'use client';

import { useEffect, useRef, useState } from 'react';
import {
  COLORS, PEN, Player, bonuses, calc, closeRoundFor, colorOf, hasFullRow, newPlayer,
} from '@/lib/azul';

type State = {
  view: 'setup' | 'game' | 'final';
  count: number;
  names: string[];
  players: Player[];
  round: number;
  active: number;
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
  history: [],
};

const sign = (n: number) => (n > 0 ? `+${n}` : String(n));
const cls = (n: number) => (n > 0 ? 'pos' : n < 0 ? 'neg' : 'zero');

export default function Page() {
  const [s, setS] = useState<State>(INITIAL);
  const [ready, setReady] = useState(false);
  const [askNew, setAskNew] = useState(false);
  const askTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const t = localStorage.getItem(KEY);
      if (t) setS(JSON.parse(t));
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
      d.round = 1; d.active = 0; d.history = []; d.view = 'game';
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
      p.floor = Math.max(0, Math.min(7, p.floor + delta));
    });

  const closeRound = () =>
    update((d) => {
      d.history.push(JSON.stringify({ players: d.players, round: d.round }));
      d.players = d.players.map(closeRoundFor);
      d.round += 1;
    });

  const undoRound = () =>
    update((d) => {
      const h = d.history.pop();
      if (!h) return;
      const o = JSON.parse(h);
      d.players = o.players; d.round = o.round;
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
    update((d) => { d.view = 'setup'; d.players = []; d.history = []; });
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
      </main>
    );
  }

  /* ---------- Final ---------- */
  if (s.view === 'final') {
    const rows = s.players.map((p) => {
      const b = bonuses(p);
      return { p, b, total: p.score + b.total };
    });
    const best = Math.max(...rows.map((r) => r.total));
    let tied = rows.filter((r) => r.total === best);
    const isTie = tied.length > 1;
    if (isTie) {
      const maxRows = Math.max(...tied.map((r) => r.b.rows));
      tied = tied.filter((r) => r.b.rows === maxRows);
    }
    return (
      <main>
        <div className="top"><h1>Resultado</h1><span className="round">{s.round - 1} rondas</span></div>
        {rows.map(({ p, b, total }, i) => {
          const win = tied.some((r) => r.p === p);
          return (
            <section key={i} className={`panel res ${win ? 'win' : ''}`}>
              <h2>{p.name} {win && <span className="crown">· Ganador{tied.length > 1 ? ' (empate)' : ''}</span>}</h2>
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
          );
        })}
        {isTie && <p className="hint">Desempate: gana quien tenga más filas horizontales completas.</p>}
        <div className="bar"><div className="in">
          <button className="btn" onClick={() => update((d) => { d.view = 'game'; })}>Volver</button>
          <button className="btn primary" onClick={newGame}>{newLabel}</button>
        </div></div>
      </main>
    );
  }

  /* ---------- Juego ---------- */
  const p = s.players[s.active];
  const res = calc(p);
  return (
    <main>
      <div className="top"><h1>Azul</h1><span className="round">Ronda {s.round}</span></div>
      {hasFullRow(s.players) && (
        <div className="banner">Hay una fila completa: esta es la última ronda. Ciérrala y pulsa «Terminar partida».</div>
      )}
      <div className="chips">
        {s.players.map((q, i) => {
          const d = calc(q).delta;
          return (
            <button key={i} className="chip" aria-pressed={i === s.active} onClick={() => update((x) => { x.active = i; })}>
              <div className="n">{q.name}</div>
              <div className="s">{q.score}</div>
              <div className={`d ${cls(d)}`}>{d === 0 ? '\u00a0' : `${sign(d)} esta ronda`}</div>
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

        <div className="row-ctl">
          <div><strong>Suelo</strong><div className="hint" style={{ margin: 0 }}>Azulejos caídos</div></div>
          <div className="stepper">
            <button onClick={() => setFloor(-1)} aria-label="Quitar uno">−</button>
            <output>{p.floor}</output>
            <button onClick={() => setFloor(1)} aria-label="Añadir uno">+</button>
          </div>
        </div>
        <div className="floor-slots">
          {PEN.map((v, i) => <div key={i} className={`slot ${i < p.floor ? 'on' : ''}`}>−{v}</div>)}
        </div>

        <div className="preview">
          Colocados <b className="pos">{sign(res.gain)}</b> · Suelo <b className={res.pen ? 'neg' : 'zero'}>{res.pen ? `−${res.pen}` : '0'}</b><br />
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
