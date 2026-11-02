---
fecha: 2026-11-01
rama: docs/bitacora-de-cambios
tipo: docs
autor: Marcos Ramos Jacome
pr: pendiente
version: pendiente
---

# Bitácora de cambios en docs/bitacora

## Qué cambia

- Nueva carpeta `docs/bitacora/` con índice, plantilla, `entradas/` (una por rama) y `releases/` (una por versión).
- `make bitacora [t='Título']` crea la entrada de la rama actual desde la plantilla; si ya existe, la señala.
- `make release` ahora cierra la bitácora: genera `releases/vX.Y.Z.md` con las entradas pendientes y las notas
  de los commits, pone la versión en esas entradas y añade la fila al índice. Todo va en el commit de release.
- `make release-preview` enseña las entradas que entrarían y avisa si no hay ninguna.
- El release de GitHub enlaza a su ficha de bitácora.
- Skill `bitacora` (`.claude/skills/bitacora/`) y `CLAUDE.md` que la declaran obligatoria.
- Fichas reconstruidas de v0.1.0 a v0.2.0 a partir del historial de git y de los releases de GitHub.

## Por qué

Los commits y las notas automáticas cuentan *qué* se tocó pero no *por qué* ni cómo probarlo.
Queremos un registro legible del proyecto que se escriba en el momento del cambio y que el release
agrupe solo, sin trabajo manual.

Se eligió **una entrada por rama + una ficha por release** en vez de un único `CHANGELOG.md`:
con varias ramas abiertas a la vez, un archivo único provoca conflictos de merge en la misma zona
en cada PR; con archivos separados cada rama solo toca el suyo y el release los junta.

## Archivos y áreas

- `docs/bitacora/` (README, plantilla, entradas, releases)
- `scripts/bitacora.sh` (nuevo), `scripts/release.sh`, `Makefile`
- `.claude/skills/bitacora/SKILL.md`, `CLAUDE.md`

## Cómo probarlo

- En una rama nueva: `make bitacora t='Prueba'` → crea `docs/bitacora/entradas/AAAA-MM-DD-<tipo>-<tema>.md`.
  Repetirlo avisa de que ya existe. En `main` o `develop` se niega.
- `make release-preview` → lista esta entrada en «Entradas de bitácora».
- El cierre real se verá en el próximo `make release`.

## Notas y pendientes

- La bitácora no se valida en CI: depende de la disciplina y de la skill. Si se olvida a menudo,
  se puede añadir un check en la PR que exija un archivo nuevo en `docs/bitacora/entradas/`.
