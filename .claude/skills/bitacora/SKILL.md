---
name: bitacora
description: Registro obligatorio de cambios en docs/bitacora. Úsala SIEMPRE que se modifique código, configuración, scripts o documentación del proyecto en una rama (feat/, fix/, chore/, docs/, refactor/, perf/, test/), antes de commitear o abrir una PR, y cuando se prepare o revise un release. También cuando el usuario pida "bitácora", "registro de cambios", "changelog" o "qué cambió".
---

# Bitácora de cambios — azul-marcador

Cada rama deja una **entrada** en `docs/bitacora/entradas/`. Cada release genera su **ficha**
en `docs/bitacora/releases/`. Las reglas completas están en `docs/bitacora/README.md`; léelo si
dudas de algo.

## Cuándo es obligatoria

- Cualquier cambio en una rama que vaya a `develop` → necesita entrada. Sin entrada no se abre PR.
- Excepciones: solo el commit `release: vX.Y.Z` (lo genera el script) y cambios en ramas que no van
  a integrarse (experimentos que se descartan).
- Nunca se trabaja directamente en `main` ni en `develop`: si estás ahí, crea la rama primero.

## Pasos

1. **¿Ya existe?** `grep -lx "rama: $(git branch --show-current)" docs/bitacora/entradas/*.md`
   - Si existe: actualiza esa misma entrada con lo nuevo. No crees otra.
   - Si no: `make bitacora t='Título corto en español'` (crea el archivo desde la plantilla
     con fecha, rama, tipo y autor).
2. **Rellénala** con el cambio real, no con generalidades:
   - *Qué cambia*: lo que nota quien usa la app o quien trabaja en el repo.
   - *Por qué*: el problema o la motivación. Es la sección más importante.
   - *Archivos y áreas*: rutas principales (`app/…`, `lib/…`, `scripts/…`).
   - *Cómo probarlo*: comandos o pasos concretos (`make test`, `make lan`, …).
   - *Notas y pendientes*: decisiones, limitaciones, lo que queda. Borra la sección si no aplica.
3. **Commitea la entrada en la misma rama** que el cambio, junto a él o en un commit
   `docs: bitácora de …`.
4. Al abrir la PR, si conoces el número, pon `pr: #N` en el frontmatter.

## Reglas que no se rompen

- `version:` se queda en `pendiente`. **Nunca** la escribas a mano: `make release` la rellena.
- No edites `docs/bitacora/releases/*.md` ni la tabla del README a mano: los genera `scripts/release.sh`.
  Excepción: corregir erratas.
- Entradas ya publicadas (con versión) no se reescriben; si algo cambia, va en una entrada nueva.
- Sin secretos, tokens, URLs privadas (Deploy Hook de Vercel, Redis) ni datos personales reales.
- Español, frases cortas, tono directo. Los prefijos de tipo son los de los commits:
  `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `test`.

## Releases

`make release` (desde `main`) busca las entradas con `version: pendiente`, crea
`docs/bitacora/releases/vX.Y.Z.md` con sus enlaces y las notas de los commits, les pone la versión,
añade la fila al índice del README y lo mete todo en el commit `release: vX.Y.Z`.
`make release-preview` enseña qué entradas entrarían. Si avisa de que no hay entradas pendientes,
revisa antes de publicar.

## Comprobación antes de dar el trabajo por terminado

- [ ] La rama tiene exactamente una entrada y está en el mismo commit/PR que el cambio.
- [ ] *Qué cambia* y *Por qué* están rellenos con contenido concreto.
- [ ] `version: pendiente` intacto.
- [ ] Nada sensible en el texto.
