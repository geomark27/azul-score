'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { COLORS, colorOf } from '@/lib/azul';
import { createRoom, saveName, savedName } from '@/lib/client';

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setName(savedName()); }, []);

  const host = async () => {
    setBusy('create'); setError(null);
    saveName(name.trim());
    try {
      const { room } = await createRoom(name.trim());
      router.push(`/sala/${room.code}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  };

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.toUpperCase().trim();
    if (c.length !== 4) { setError('El código tiene 4 caracteres.'); return; }
    setBusy('join');
    saveName(name.trim());
    router.push(`/sala/${c}`);
  };

  return (
    <main>
      <div className="top"><h1>Azul</h1><span className="round">Marcador</span></div>

      <div className="panel setup">
        <div className="mosaic" aria-hidden="true">
          {Array.from({ length: 25 }, (_, i) => (
            <i key={i} style={{ background: COLORS[colorOf(Math.floor(i / 5), i % 5)] }} />
          ))}
        </div>

        <h2>Partida compartida</h2>
        <p className="hint">
          Cada jugador abre esta página en su móvil y entra con el mismo código.
          Cada uno registra su propio tablero; el anfitrión cierra las rondas.
        </p>

        <label htmlFor="nm">Tu nombre</label>
        <input
          type="text" id="nm" maxLength={14} autoComplete="off" placeholder="¿Cómo te llamas?"
          value={name} onChange={(e) => setName(e.target.value)}
        />

        <button
          className="btn primary" style={{ width: '100%', marginTop: 16 }}
          disabled={busy !== null} onClick={host}
        >
          {busy === 'create' ? 'Creando…' : 'Crear sala'}
        </button>

        <div className="sep"><span>o únete a una</span></div>

        <form onSubmit={join}>
          <label htmlFor="cd">Código de sala</label>
          <input
            type="text" id="cd" maxLength={4} autoComplete="off" inputMode="text"
            placeholder="ABCD" className="code-in"
            value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <button className="btn" style={{ width: '100%', marginTop: 12 }} disabled={busy !== null}>
            Entrar
          </button>
        </form>

        {error && <p className="err">{error}</p>}
      </div>

      <Link className="linkbtn" href="/local">Jugar todo en este dispositivo</Link>
    </main>
  );
}
