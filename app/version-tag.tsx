'use client';

import { useState } from 'react';
import { versionLabel } from '@/lib/version';

type Health = {
  version: string;
  commit: string | null;
  almacen: string;
  cambiosEnVivo: string;
  serverless: boolean;
  aviso: string | null;
};

/**
 * Versión visible en todas las pantallas. Al tocarla despliega el diagnóstico
 * de /api/health, que es la forma de saber desde el propio móvil si ese
 * despliegue guarda las salas en Redis o se quedó en memoria.
 */
export default function VersionTag() {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<Health | null>(null);
  const [error, setError] = useState(false);

  const toggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (info || error) return;
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      setInfo((await res.json()) as Health);
    } catch {
      setError(true);
    }
  };

  return (
    <div className="ver">
      <button className="ver-btn" onClick={toggle} aria-expanded={open}>
        {versionLabel}
      </button>

      {open && (
        <div className="ver-info">
          {error && <p className="ver-row">No se pudo consultar el estado.</p>}
          {!error && !info && <p className="ver-row">Consultando…</p>}
          {info && (
            <>
              <p className="ver-row"><span>versión</span><b>v{info.version}</b></p>
              {info.commit && <p className="ver-row"><span>commit</span><b>{info.commit}</b></p>}
              <p className="ver-row"><span>salas en</span><b>{info.almacen}</b></p>
              <p className="ver-row"><span>cambios</span><b>{info.cambiosEnVivo}</b></p>
              {info.aviso && <p className="ver-warn">{info.aviso}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
