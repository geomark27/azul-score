---
date: 2026-11-01
branch: fix/actualizar-sigpipe
type: fix
author: Marcos Ramos Jacome
agents: claude
pr: "#17"
version: unreleased
---

# make actualizar ya no falla con muchos commits nuevos

## Qué cambia

- `make actualizar` deja de terminar con `Error 141` cuando llegan muchos commits nuevos. La rama ya
  se actualizaba bien; ahora además el comando termina en verde y enseña el resumen completo.

## Por qué

El resumen mostraba los commits nuevos con `git log | head -10`. Con `set -o pipefail`, cuando la
salida de `git log` es larga `head` cierra la tubería a la décima línea, `git log` muere por SIGPIPE
(código 141) y el script fallaba al final aunque todo hubiera ido bien. Pasó al traer de golpe las
PR #13–#16. Ahora el límite lo pone `git log -10`, sin tubería que cortar.

## Archivos y áreas

- `scripts/actualizar-rama.sh` (resumen de commits nuevos y lista de commits locales al divergir).

## Cómo probarlo

- Reproducido en un repo de prueba con 3000 commits nuevos en origin: la versión anterior sale con
  141 y la corregida con 0.
- En el día a día: `make actualizar` tras un merge grande termina sin error.
