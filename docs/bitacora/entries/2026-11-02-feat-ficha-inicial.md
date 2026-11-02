---
date: 2026-11-02
branch: feat/ficha-inicial
type: feat
author: Marcos Ramos Jacome
agents: claude
pr: "#19"
version: unreleased
---

# Sorteo del jugador inicial y la ronda espera a quien tiene la ficha 1

## Qué cambia

- Al empezar la partida, la app **sortea quién abre la primera ronda** («Sorteo: le tocó a Beto»).
  Antes siempre empezaba el primer asiento.
- Cada ronda **espera a quien la abre**: quien tiene la ficha 1 (en la primera, el del sorteo) ve
  «Abres tú la ronda N» con el botón «Empezar ronda», y su móvil vibra, pita y el título parpadea.
- Mientras no la empiece, **nadie puede anotar**: el tablero, el suelo, la ficha y «Estoy listo» quedan
  bloqueados, y los demás ven «Esperando a que Beto empiece». El anfitrión no puede cerrar ni avisar.
- El anfitrión puede **«Empezar por Beto»** si esa persona se despista o se desconecta.
- El chip de quien abre lleva la etiqueta «abre».
- En modo competitivo, ese mismo botón arranca su reloj (sustituye al «Empezar ronda» del reloj).
- Modo de un dispositivo: también sortea quién empieza y muestra quién abre cada ronda, sin bloqueo.

## Por qué

Según el reglamento de Azul, el jugador inicial se sortea y quien se lleva la ficha 1 abre la ronda
siguiente. En la mesa se perdía quién tenía que empezar, y había quien anotaba azulejos de la ronda
anterior cuando la nueva aún no había arrancado.

## Archivos y áreas

- `lib/room.ts`: sorteo en `start`; campo `waiting`; acción `round_start` (sustituye a `turn_start`,
  que se sigue aceptando); `tap`, `floor`, `first`, `ready`, `nudge` y `close` esperan al inicio;
  `close` deja la siguiente ronda esperando; `undo` vuelve a una ronda ya empezada.
- `app/inicio-ronda.tsx` (nuevo): panel «Empezar ronda» y alarma para quien abre.
- `app/aviso-listo.tsx`: la alarma se exporta para reutilizarla.
- `app/reloj.tsx`, `app/sala/[code]/page.tsx`, `app/local/page.tsx`, `app/globals.css`.
- `tests/room.test.ts`.

## Cómo probarlo

- `make test` (75 pruebas; nuevas en «ficha inicial y comienzo de ronda», incluido que el sorteo
  reparte entre los cuatro asientos).
- Manual con `make lan` y dos o tres móviles: empezar partida → a quien le toca le suena «Abres tú la
  ronda 1» → los demás no pueden tocar el tablero hasta que pulse «Empezar ronda».

## Notas y pendientes

- Las salas creadas antes de este cambio no tienen `waiting` y siguen funcionando sin esperar.
