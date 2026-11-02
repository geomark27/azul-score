# azul-marcador

Marcador web (Next.js) para el juego de mesa Azul. Comandos de uso diario en `make help`.

## Flujo de ramas

`feat/*`, `fix/*`, `chore/*`, `docs/*` → PR → `develop` → PR → `main` → `make release`.
No se trabaja directamente en `main` ni en `develop`.

## Bitácora de cambios (obligatoria)

Todo cambio en una rama lleva su entrada en `docs/bitacora/entradas/`. Sigue la skill
`bitacora` (`.claude/skills/bitacora/SKILL.md`) **antes de commitear o abrir una PR**: un cambio
sin entrada de bitácora no está terminado. Los releases cierran la bitácora automáticamente
(`scripts/release.sh`).
