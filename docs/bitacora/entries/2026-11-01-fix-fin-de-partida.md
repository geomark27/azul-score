---
date: 2026-11-01
branch: fix/fin-de-partida
type: fix
author: Marcos Ramos Jacome
agents: claude
pr: pending
version: unreleased
---

# La partida termina al cerrar la ronda con fila completa

## Qué cambia

- Al cerrar la ronda en la que alguien completa una fila horizontal, la partida pasa **directo al
  resultado** con los bonos sumados. Vale para la sala y para el modo de un dispositivo.
- Durante esa ronda, en cuanto alguien marca el azulejo que le completa la fila, sale el aviso
  «al cerrarla termina la partida». Si lo desmarca, el aviso desaparece.
- En esa última ronda la única acción es «Cerrar ronda N y terminar»: se ocultan «Deshacer ronda» y
  «Terminar y sumar bonos».
- Sin vuelta atrás: tras el final no se puede deshacer ni cerrar otra ronda.
- Se quita «Revancha» del resultado de la sala: solo queda «Cerrar sala». Para otra partida, sala nueva.
  En el modo de un dispositivo, «Volver» solo aparece si la partida se terminó a mano antes de tiempo.

## Por qué

La app avisaba de «esta es la última ronda» *después* de cerrar la ronda que completaba la fila,
así que se jugaba una ronda de más. Según el reglamento de Azul, la partida termina al acabar la fase
de alicatado en la que alguien completa una fila. Además, con «Revancha» y «Deshacer» a mano, era
fácil reabrir una partida ya decidida.

## Archivos y áreas

- `lib/azul.ts`: `completesRow` y `roundEndsGame` (fila completa contando lo marcado en la ronda).
- `lib/room.ts`: `close` pasa a `final` con fila completa; `undo` y `start` rechazados tras el final.
- `app/sala/[code]/page.tsx`, `app/local/page.tsx`: aviso, botones de la última ronda, resultado.
- `tests/azul.test.ts`, `tests/room.test.ts`.

## Cómo probarlo

- `make test` (52 pruebas, incluidas las nuevas de «fin de partida»).
- Manual: en `make lan`, completar una fila en una ronda → aparece el aviso → cerrar → resultado
  directo, sin «Revancha» ni «Deshacer».

## Notas y pendientes

- Una sala antigua que ya tuviera una fila completa en juego termina en cuanto se cierre la ronda.
