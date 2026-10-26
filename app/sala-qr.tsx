'use client';

import { useEffect, useMemo, useState } from 'react';
import { create } from 'qrcode';

/** Margen blanco alrededor del QR, en módulos: el estándar pide 4. */
const QUIET = 4;

/**
 * QR con el enlace de la sala. Lo lee tanto el escáner de la portada como la
 * cámara nativa de cualquier móvil, que abre la sala directamente en el
 * navegador. Siempre negro sobre blanco: con el tema oscuro invertido muchas
 * cámaras no lo reconocen.
 */
export default function SalaQr({ code }: { code: string }) {
  // El origen solo se conoce en el navegador (Vercel, IP de la LAN, localhost…).
  const [url, setUrl] = useState('');
  useEffect(() => { setUrl(`${window.location.origin}/sala/${code}`); }, [code]);

  const qr = useMemo(() => {
    if (!url) return null;
    const { size, data } = create(url, { errorCorrectionLevel: 'M' }).modules;
    let d = '';
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        if (data[r * size + c]) d += `M${c + QUIET} ${r + QUIET}h1v1h-1z`;
    return { side: size + QUIET * 2, d };
  }, [url]);

  if (!qr) return null;

  return (
    <figure className="qr">
      <svg viewBox={`0 0 ${qr.side} ${qr.side}`} role="img" aria-label={`QR para entrar a la sala ${code}`} shapeRendering="crispEdges">
        <rect width={qr.side} height={qr.side} fill="#fff" />
        <path d={qr.d} fill="#000" />
      </svg>
      <figcaption className="hint">
        Escanéalo con la cámara del móvil o con «Escanear QR» en la portada.
      </figcaption>
    </figure>
  );
}
