---
date: 2026-11-05
branch: feat/registro-movimientos
type: feat
author: Marcos Ramos
agents: claude
pr: pending
version: v0.4.1
---

# Registro de movimientos descargable en .txt

## Qué cambia

- Cada ronda cerrada queda **registrada**: quién la abrió y quién la cerró, a qué hora, y por cada
  jugador los azulejos que colocó (fila, columna, color y cuánto sumó cada uno), el suelo, la ficha
  de jugador inicial, la multa del reloj, la cuenta completa y si había marcado «listo».
- Nuevo botón **«Descargar registro de movimientos (.txt)»** en la partida y en el resultado, para
  todos los jugadores (sala) y en el modo de un dispositivo. Aparece desde la primera ronda cerrada.
- El .txt trae las reglas de puntuación que aplica el marcador, el mapa de colores de la pared, cada
  ronda con la pared resultante, el resumen por ronda, los bonos (qué filas, columnas y colores) y la
  clasificación.
- **Deshacer ronda ya no borra el rastro**: el cierre deshecho aparece en «Correcciones del anfitrión»
  con lo que se anuló y quién lo deshizo.
- Al final, una **comprobación**: el marcador rehace la partida desde cero con las reglas y dice
  «Correcto» o lista cada diferencia.

## Por qué

En la mesa a veces se duda de que las cuentas estén bien o se sospecha de trampa. Con el registro
cualquiera puede revisar ronda a ronda cómo salió cada puntuación, a mano o pasándole el .txt a una
IA para que simule la partida: el archivo se explica solo y no depende de la app.

## Archivos y áreas

- `lib/registro.ts` (nuevo): tipos del registro, `roundPlayer`, `markUndone` y `journalText`.
- `lib/azul.ts`: `placements()` desglosa los puntos por azulejo y `calc` la usa (misma cuenta);
  `bonuses()` devuelve también qué filas, columnas y colores están completos.
- `lib/room.ts`: campos `startedAt` y `journal`; `close` apunta la ronda, `undo` la marca como
  deshecha; `roomJournal()`.
- `app/descargar-registro.tsx` (nuevo), `app/sala/[code]/page.tsx`, `app/local/page.tsx`.
- `tests/registro.test.ts` (nuevo).

## Cómo probarlo

- `make lint` (tipos + pruebas; 8 nuevas en «registro de movimientos», incluida una partida completa
  que se rehace y una ronda «retocada» que la comprobación detecta).
- Manual con `make lan`: jugar dos o tres rondas, deshacer una, terminar y descargar el .txt desde
  el resultado. Revisar que las cuentas coinciden con la pantalla y que aparece la corrección.

## Notas y pendientes

- Solo se registran rondas cerradas: lo que se marca y desmarca durante la ronda no queda apuntado.
- Una sala o partida local que ya estaba en curso al desplegar no tiene las rondas anteriores: el
  .txt lo avisa y omite paredes y comprobación.
- Las horas son las del móvil que descarga.
