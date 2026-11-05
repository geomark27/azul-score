'use client';

import { JournalSource, journalText } from '@/lib/registro';
import { versionLabel } from '@/lib/version';

type Fuente = Omit<JournalSource, 'version' | 'now'>;

const dia = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Baja el registro de movimientos como .txt para que cualquiera pueda revisar
 * las cuentas por su lado (a mano o pasándoselo a una IA).
 */
export default function DescargarRegistro({ source }: { source: Fuente }) {
  if (!source.journal.length) return null;

  const descargar = () => {
    const now = Date.now();
    const text = journalText({ ...source, version: versionLabel, now });
    // Con BOM, el Bloc de notas y algunos móviles muestran bien las tildes.
    const blob = new Blob(['﻿', text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `azul-${source.code ?? 'local'}-${dia(source.startedAt ?? now)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <button className="linkbtn" onClick={descargar}>
      Descargar registro de movimientos (.txt)
    </button>
  );
}
