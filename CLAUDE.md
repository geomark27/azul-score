# azul-marcador

Marcador web (Next.js) para el juego de mesa Azul. Comandos de uso diario en `make help`.

## Flujo de ramas

`feat/*`, `fix/*`, `chore/*`, `docs/*` → PR → `develop` → PR → `main` → `make release`.
No se trabaja directamente en `main` ni en `develop`.

## Bitácora de cambios (obligatoria)

Todo cambio en una rama lleva su entrada en `docs/bitacora/entries/`, **en español**
(`.devlog.conf`). Sigue la skill `devlog` (`.claude/skills/devlog/SKILL.md`) antes de commitear o
abrir una PR: un cambio sin entrada no está terminado.

- Crear o abrir la entrada de la rama: `make bitacora t='Título'`.
- Validarla antes de la PR: `make bitacora-check`.
- Con varios agentes, solo el orquestador escribe la entrada; los subagentes entregan un bloque
  `DEVLOG CONTRIBUTION` en su informe.
- `make release` cierra la bitácora automáticamente (`scripts/release.sh`).
