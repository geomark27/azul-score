'use client';

import { useEffect, useRef, useState } from 'react';
import { codeFromScan } from '@/lib/room';

/** Cada cuánto se analiza un fotograma: de sobra para leer un QR y no calienta el móvil. */
const CADA_MS = 200;
/** Lado máximo del fotograma que se pasa a jsQR; más grande solo lo hace más lento. */
const LADO_MAX = 640;

type Lector = (v: HTMLVideoElement) => Promise<string | null>;

type BarcodeDetectorCtor = {
  new (opts: { formats: string[] }): { detect(src: CanvasImageSource): Promise<{ rawValue: string }[]> };
  getSupportedFormats?: () => Promise<string[]>;
};

/**
 * Elige cómo leer el QR. Chrome en Android trae `BarcodeDetector`, que es
 * nativo y rápido; Safari en iPhone y Firefox no, y para ellos se carga jsQR
 * solo en ese momento, para no engordar la portada.
 */
async function nuevoLector(): Promise<Lector> {
  const BD = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  if (BD) {
    try {
      const formatos = await BD.getSupportedFormats?.();
      if (!formatos || formatos.includes('qr_code')) {
        const det = new BD({ formats: ['qr_code'] });
        return async (v) => (await det.detect(v))[0]?.rawValue ?? null;
      }
    } catch {}
  }

  const jsQR = (await import('jsqr')).default;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  return async (v) => {
    if (!ctx || !v.videoWidth || !v.videoHeight) return null;
    const k = Math.min(1, LADO_MAX / Math.max(v.videoWidth, v.videoHeight));
    canvas.width = Math.round(v.videoWidth * k);
    canvas.height = Math.round(v.videoHeight * k);
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })?.data ?? null;
  };
}

function motivo(e: unknown) {
  const name = (e as { name?: string })?.name;
  if (name === 'NotAllowedError')
    return 'No hay permiso para usar la cámara. Actívalo en los ajustes del navegador o lee el QR con la cámara del móvil.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError')
    return 'No se encontró ninguna cámara en este dispositivo.';
  if (name === 'NotReadableError')
    return 'La cámara está ocupada por otra aplicación.';
  return 'No se pudo abrir la cámara.';
}

/**
 * Escáner a pantalla completa. Llama a `onCode` con el código de la sala en
 * cuanto lee un QR válido; un QR de otra cosa se ignora con un aviso.
 */
export default function QrScanner({
  onCode, onClose,
}: { onCode: (code: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ajeno, setAjeno] = useState(false);

  // Las funciones del padre cambian en cada render; el efecto no debe
  // reiniciar la cámara por eso.
  const alLeer = useRef(onCode);
  alLeer.current = onCode;

  useEffect(() => {
    let vivo = true;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setError('El navegador solo deja usar la cámara en páginas https. Lee el QR con la cámara del móvil.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } }, audio: false,
        });
      } catch (e) {
        if (vivo) setError(motivo(e));
        return;
      }
      const v = video.current;
      if (!vivo || !v) { stream.getTracks().forEach((t) => t.stop()); return; }
      v.srcObject = stream;
      await v.play().catch(() => {});

      const leer = await nuevoLector();
      const paso = async () => {
        if (!vivo) return;
        const texto = v.readyState >= 2 ? await leer(v).catch(() => null) : null;
        if (!vivo) return;
        if (texto) {
          const code = codeFromScan(texto);
          if (code) { alLeer.current(code); return; }
          setAjeno(true);
        }
        timer = setTimeout(paso, CADA_MS);
      };
      void paso();
    })();

    return () => {
      vivo = false;
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="scan" role="dialog" aria-modal="true" aria-label="Escanear el QR de la sala">
      <div className="scan-box">
        <video ref={video} playsInline muted autoPlay />
        {!error && <div className="scan-frame" aria-hidden="true" />}
      </div>
      <p className={`scan-msg ${error ? 'err' : ''}`} role="status">
        {error ?? (ajeno ? 'Ese QR no es de una sala de Azul. Prueba con el del anfitrión.' : 'Apunta al QR que muestra el anfitrión.')}
      </p>
      <button className="btn" onClick={onClose}>Cancelar</button>
    </div>
  );
}
