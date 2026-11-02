---
date: 2026-11-01
branch: feat/modo-competitivo
type: feat
author: Marcos Ramos Jacome
agents: claude
pr: "#16"
version: unreleased
---

# Modo competitivo con reloj tipo ajedrez

## Qué cambia

- En el lobby, el anfitrión elige **Modo de juego: Normal o Competitivo ⏱**. Por defecto es Normal y
  la partida funciona exactamente igual que antes.
- En competitivo elige **5, 10, 15 o 20 minutos por jugador** para toda la partida.
- Cada ronda tiene tres fases:
  1. **Preparar**: se reparten fábricas con el reloj parado. Quien abre la ronda (la ficha de jugador
     inicial) o el anfitrión pulsa «Empezar ronda».
  2. **Oferta**: corre solo el reloj de quien tiene el turno. Su móvil muestra «Terminé mi turno ▸» en
     la barra inferior y el turno pasa al siguiente en orden de mesa. Cualquiera con el turno, o el
     anfitrión, pulsa «Sin azulejos: a anotar» al vaciarse las fábricas.
  3. **Anotar**: reloj parado; se marcan azulejos y «Estoy listo» como siempre.
- El anfitrión puede **pausar/reanudar** y **pasar el turno** de alguien que se olvidó de pulsar.
- Los chips de cada jugador muestran su tiempo; el del turno se resalta y el tiempo extra sale en rojo.
- **Tiempo extra**: quien se pasa sigue jugando pero pierde 1 punto, y otro por cada 30 s más. Se cobra
  al cerrar la ronda (nunca por debajo de 0) y aparece en el resultado final.
- El modo de un dispositivo no cambia: el reloj necesita que cada jugador pase su turno desde su móvil.

## Por qué

Las partidas se alargaban por jugadores que piensan mucho cada turno. Un reloj por jugador, como en
el ajedrez, da ritmo sin cambiar las reglas de puntuación, y es opcional para no afectar a quien
prefiere jugar tranquilo.

## Archivos y áreas

- `lib/clock.ts` (nuevo): reloj puro (fases, turnos, pausa, multas, formato).
- `lib/room.ts`: `clockMinutes` y `clock` en la sala; acciones `clock_config`, `turn_start`,
  `turn_pass`, `turn_stop`, `clock_pause`; multa al cerrar; deshacer restaura el reloj parado.
- `lib/azul.ts`: `timeLost` en el jugador.
- `app/api/rooms/[code]/route.ts`, `lib/client.ts`: la API devuelve la hora del servidor y el cliente
  corrige el desfase con su reloj (`serverNow`).
- `app/reloj.tsx` (nuevo), `app/sala/[code]/page.tsx`, `app/globals.css`.
- `tests/clock.test.ts` (nuevo), `tests/room.test.ts`.

## Cómo probarlo

- `make test` (69 pruebas; nuevas en «reloj competitivo» y «modo competitivo»).
- Manual con `make lan` y dos móviles: en el lobby elegir Competitivo · 5 min → empezar → «Empezar
  ronda» → pasar turnos → «Sin azulejos: a anotar» → listos → cerrar.

## Notas y pendientes

- El reloj se pinta con la hora del servidor corregida; en modo sondeo (Vercel + Redis) el cambio de
  turno puede tardar hasta 2 s en verse en los demás móviles, pero el tiempo que se cobra lo calcula
  el servidor, así que no hay error de cuenta.
- La multa usa tramos empezados de 30 s: pasarse 1 s ya cuesta 1 punto.
