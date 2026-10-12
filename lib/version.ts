/**
 * Versión de la app.
 *
 * `package.json` es la fuente de verdad; `next.config.mjs` la inyecta en tiempo
 * de compilación y `make release` la sube a la vez que crea el tag de git, así
 * que el número que se ve aquí siempre corresponde a un tag `vX.Y.Z`.
 */
export const VERSION = process.env.NEXT_PUBLIC_APP_VERSION || 'dev';
export const COMMIT = process.env.NEXT_PUBLIC_APP_COMMIT || '';

/** Etiqueta corta para mostrar en la interfaz: `v0.1.0 · a1b2c3d`. */
export const versionLabel = COMMIT ? `v${VERSION} · ${COMMIT}` : `v${VERSION}`;
