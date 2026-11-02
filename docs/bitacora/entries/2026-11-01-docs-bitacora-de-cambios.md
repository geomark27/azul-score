---
date: 2026-11-01
branch: docs/bitacora-de-cambios
type: docs
author: Marcos Ramos Jacome
agents: claude
pr: "#13"
version: v0.3.0
---

# Bitácora de cambios en docs/bitacora

## Qué cambia

- Nueva carpeta `docs/bitacora/` con índice, plantilla, `entries/` (una por rama) y `releases/` (una por versión).
- La bitácora funciona con la skill `devlog`, copiada en `.claude/skills/devlog/` para que todo el
  equipo (y sus agentes) la tengan sin instalar nada. Configuración en `.devlog.conf`: carpeta
  `docs/bitacora` y contenido en español.
- `make bitacora [t='Título']` crea la entrada de la rama actual; si ya existe, la señala.
- `make bitacora-check` valida la entrada: que exista una sola, que «Qué cambia» y «Por qué» tengan
  contenido, que siga en `unreleased`, que esté en el diff contra `develop` y que no tenga pinta de secreto.
- `make release` cierra la bitácora: genera `releases/vX.Y.Z.md` con las entradas pendientes y las
  notas de los commits, les pone la versión y añade la fila al índice. Todo va en el commit de release.
  `make release-preview` enseña qué entradas entrarían y avisa si no hay ninguna.
- El release de GitHub enlaza a su ficha de bitácora.
- Fichas reconstruidas de v0.1.0 a v0.2.0 a partir del historial de git y de los releases de GitHub.
- `CLAUDE.md` con el flujo de ramas y la bitácora como paso obligatorio.

## Por qué

Los commits y las notas automáticas cuentan *qué* se tocó pero no *por qué* ni cómo probarlo.
Queremos un registro legible que se escriba en el momento del cambio y que el release agrupe solo.

Se eligió **una entrada por rama + una ficha por release** en vez de un único `CHANGELOG.md`:
con varias ramas (o varios agentes) a la vez, un archivo único provoca conflictos de merge en cada PR;
con archivos separados cada rama solo toca el suyo. La creación de entradas es atómica, así que varios
agentes sobre la misma rama no generan duplicados.

## Archivos y áreas

- `docs/bitacora/` (README, plantilla, entries, releases), `.devlog.conf`
- `.claude/skills/devlog/` (skill, guía HOW-IT-WORKS.md, scripts y plantillas por idioma)
- `scripts/release.sh`, `Makefile`, `CLAUDE.md`

## Cómo probarlo

- En una rama nueva: `make bitacora t='Prueba'` → crea `docs/bitacora/entries/AAAA-MM-DD-<tipo>-<tema>.md`.
  Repetirlo devuelve la misma. En `main` o `develop` se niega.
- `make bitacora-check` en esta rama → en verde.
- `make release-preview` → lista esta entrada en «Entradas de bitácora».
- El cierre real se verá en el próximo `make release`.

## Notas y pendientes

- La skill vive también en `~/.claude/skills/devlog/` para el resto de proyectos. Si se actualiza
  allí, hay que volver a copiarla aquí.
- No hay check en CI todavía: la guía trae un workflow de GitHub Actions listo para añadir.
