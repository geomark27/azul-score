'use client';

import { useEffect, useState } from 'react';
import { Room, onlyOneMissing } from '@/lib/room';

/** Segundos que se espera, siendo el único sin «listo», antes de recordártelo solo. */
const AUTO_MS = 20_000;

/* ---------- Sonido ---------- */
// Los navegadores solo dejan sonar audio tras un toque del usuario. El contexto
// se crea y se desbloquea en el primer toque de la pantalla, y se reutiliza.
let audio: AudioContext | null = null;

function desbloquearAudio() {
  try {
    const Ctx = window.AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audio ??= new Ctx();
    if (audio.state === 'suspended') void audio.resume();
  } catch {}
}

function pitido() {
  const ctx = audio;
  if (!ctx || ctx.state !== 'running') return;
  const t0 = ctx.currentTime;
  for (const off of [0, 0.28]) {
    const osc = ctx.createOscillator();
    const vol = ctx.createGain();
    osc.frequency.value = 880;
    vol.gain.setValueAtTime(0.0001, t0 + off);
    vol.gain.exponentialRampToValueAtTime(0.3, t0 + off + 0.02);
    vol.gain.exponentialRampToValueAtTime(0.0001, t0 + off + 0.22);
    osc.connect(vol).connect(ctx.destination);
    osc.start(t0 + off);
    osc.stop(t0 + off + 0.24);
  }
}

/** Vibración (Android), pitido y título parpadeando. Devuelve cómo pararlo. */
function alarma(): () => void {
  try { navigator.vibrate?.([300, 150, 300, 150, 600]); } catch {}
  pitido();
  const original = document.title;
  let on = false;
  const id = setInterval(() => {
    on = !on;
    document.title = on ? '⚠ Te están esperando' : original;
  }, 900);
  return () => { clearInterval(id); document.title = original; };
}

/**
 * Aviso a pantalla completa para quien se distrajo y no marcó «Estoy listo».
 * Salta por dos motivos:
 *  - el anfitrión pulsó «Avisar a los que faltan» (cambia `nudgedAt` del asiento);
 *  - eres el único que falta desde hace AUTO_MS, sin que nadie pulse nada.
 */
export default function AvisoListo({
  room, seat, onReady,
}: { room: Room; seat: number; onReady: () => void }) {
  const mine = room.seats[seat];

  useEffect(() => {
    window.addEventListener('pointerdown', desbloquearAudio);
    return () => window.removeEventListener('pointerdown', desbloquearAudio);
  }, []);

  // Aviso del anfitrión: es nuevo mientras su marca no sea la que ya cerraste.
  const [visto, setVisto] = useState<number | undefined>(undefined);
  const marca = mine && !mine.ready ? mine.nudgedAt : undefined;
  const porAnfitrion = marca !== undefined && marca !== visto;

  // Recordatorio automático: solo cuando eres el único que falta.
  const solo = room.view === 'game' && onlyOneMissing(room, seat);
  const [auto, setAuto] = useState(false);
  const [rearme, setRearme] = useState(0); // «Voy a anotar» vuelve a armar el recordatorio
  useEffect(() => {
    setAuto(false);
    if (!solo) return;
    const t = setTimeout(() => setAuto(true), AUTO_MS);
    return () => clearTimeout(t);
  }, [solo, rearme]);

  const visible = porAnfitrion || (auto && solo);

  useEffect(() => {
    if (!visible) return;
    return alarma();
  }, [visible, marca]);

  if (!visible || !mine) return null;

  const cerrar = () => { setVisto(marca); setAuto(false); setRearme((n) => n + 1); };
  const anfitrion = room.seats.find((s) => s.clientId === room.hostId)?.name ?? 'El anfitrión';
  const texto = porAnfitrion
    ? `${anfitrion} te avisa: falta que anotes tus puntos de la ronda ${room.round} y marques «Estoy listo».`
    : `Todos están listos menos tú. Anota tus puntos de la ronda ${room.round} y marca «Estoy listo».`;

  return (
    <div className="aviso" role="alertdialog" aria-modal="true" aria-labelledby="aviso-t" aria-describedby="aviso-d">
      <div className="aviso-in">
        <h2 id="aviso-t">¡Te están esperando!</h2>
        <p id="aviso-d">{texto}</p>
        <button className="btn primary" onClick={() => { cerrar(); onReady(); }}>
          Ya anoté: estoy listo
        </button>
        <button className="btn" onClick={cerrar}>Voy a anotar</button>
      </div>
    </div>
  );
}
