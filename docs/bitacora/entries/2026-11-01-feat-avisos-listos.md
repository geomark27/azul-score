---
date: 2026-11-01
branch: feat/avisos-listos
type: feat
author: Marcos Ramos Jacome
agents: claude
pr: "#15"
version: unreleased
---

# Avisos a quien no marcó «Estoy listo»

## Qué cambia

- El panel del anfitrión dice **quién falta** («faltan: Beto, Caro») en vez de solo cuántos.
- Botón **«Avisar a los que faltan»** (o «Avisar a Beto» si es uno): al móvil de cada uno le salta un
  aviso a pantalla completa en rojo, vibra (Android), pita y el título de la pestaña parpadea.
  El aviso trae «Ya anoté: estoy listo» y «Voy a anotar».
- **Recordatorio automático**: si todos están listos menos uno, a esa persona le salta el mismo aviso
  a los 20 segundos sin que nadie pulse nada. Si responde «Voy a anotar», vuelve a saltar a los 20 s.
- **Confirmación al cerrar**: si el anfitrión cierra la ronda con gente sin «listo», el botón pide un
  segundo toque («¿Cerrar sin Beto? Toca otra vez») y avisa de que su ronda se cierra con lo marcado.

## Por qué

En partida, alguien se distrae y no anota sus puntos ni marca «listo». El anfitrión acababa
esperando sin saber a quién, o cerraba la ronda y esa persona perdía lo que no había anotado.

## Archivos y áreas

- `lib/room.ts`: acción `nudge` (solo anfitrión, en partida, a los demás conectados sin «listo»,
  como mucho cada 10 s por persona), `nudgedAt` en el asiento, `notReady`, `onlyOneMissing`.
  El aviso se borra al marcar «listo» y al cerrar la ronda.
- `app/aviso-listo.tsx` (nuevo): el aviso, la vibración, el pitido y el recordatorio automático.
- `app/sala/[code]/page.tsx`: panel del anfitrión y confirmación al cerrar.
- `lib/client.ts`: `send` devuelve si el servidor aceptó la acción.
- `app/globals.css`, `tests/room.test.ts`.

## Cómo probarlo

- `make test` (58 pruebas; nuevas en «avisos a quien no marcó listo»).
- Manual con `make lan` y dos móviles: el anfitrión pulsa «Avisar…» → el otro móvil muestra el aviso.
  Marcar listo en todos menos uno y esperar 20 s → el que falta recibe el recordatorio.

## Notas y pendientes

- Con el móvil bloqueado o la pestaña en segundo plano el aviso no llega hasta volver a la app: haría
  falta notificaciones push (service worker), que queda para otra rama.
- iPhone no vibra desde la web; allí el aviso es visual y sonoro (el sonido requiere haber tocado la
  pantalla al menos una vez, cosa que ya pasa al jugar).
