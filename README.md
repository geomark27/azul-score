# Azul · Marcador

Marcador y calculadora de puntos para el juego de mesa **Azul**, de 2 a 4 jugadores.
Pensada para usarse desde el móvil mientras se juega: tocas los azulejos que colocaste
en tu pared, indicas cuántos cayeron al suelo y la app calcula los puntos de la ronda
y los bonos finales.

Construida con Next.js 15 (App Router), React 19 y TypeScript. **Sin dependencias
adicionales**: no usa librerías de UI, estado ni estilos.

---

## Características

- **Pared 5×5 interactiva** con los colores reales de Azul; toca una casilla por fila
  para marcar el azulejo que colocaste esta ronda.
- **Cálculo automático de la puntuación** siguiendo las reglas oficiales: adyacencias
  horizontales y verticales, 1 punto si el azulejo queda aislado.
- **Penalización de suelo** con la progresión estándar `−1, −1, −2, −2, −2, −3, −3`
  (la puntuación nunca baja de 0).
- **Vista previa en vivo**: antes de cerrar la ronda ves cuánto ganas, cuánto pierdes
  y el total resultante.
- **Aviso de última ronda** cuando algún jugador completa una fila horizontal.
- **Bonos de fin de partida**: filas completas ×2, columnas completas ×7,
  colores completos ×10, con desglose por jugador.
- **Desempate** por número de filas horizontales completas.
- **Deshacer ronda** (historial de rondas cerradas) e historial de puntos por ronda.
- **Persistencia en `localStorage`**: la partida sobrevive a recargas y cierres del
  navegador. No hay servidor ni base de datos; todo es local al dispositivo.

---

## Requisitos

- Node.js 18.18 o superior (recomendado Node 20+)
- npm

## Uso en local

```bash
npm install
npm run dev
```

Abre <http://localhost:3000>.

### Scripts

| Script | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Compilación de producción |
| `npm start` | Sirve la compilación de producción (requiere `build` previo) |

---

## Estructura del proyecto

```
azul-marcador/
├── app/
│   ├── layout.tsx      # Layout raíz, metadatos y viewport
│   ├── page.tsx        # Toda la UI: setup, juego y resultado final
│   └── globals.css     # Estilos (CSS plano, sin framework)
├── lib/
│   └── azul.ts         # Lógica pura de puntuación: calc, bonuses, closeRoundFor
├── next.config.mjs
├── tsconfig.json       # strict: true, alias "@/*" a la raíz
└── package.json
```

La lógica de juego vive aislada en `lib/azul.ts` y no depende de React, así que puede
probarse o reutilizarse por separado:

| Función | Qué hace |
| --- | --- |
| `newPlayer(name)` | Crea un jugador con la pared vacía |
| `colorOf(r, c)` | Color canónico de la casilla (patrón diagonal de Azul) |
| `calc(player)` | Puntos de la ronda en curso: `{ gain, pen, after, delta }` |
| `bonuses(player)` | Bonos finales: `{ rows, cols, colors, total }` |
| `closeRoundFor(player)` | Aplica la ronda a la pared y reinicia el estado temporal |
| `hasFullRow(players)` | `true` si alguien completó una fila (última ronda) |

---

## Cómo se usa durante la partida

1. **Configuración**: elige 2–4 jugadores y sus nombres → *Empezar*.
2. **Durante la ronda**: selecciona el jugador en la barra superior, toca en la pared
   los azulejos que moviste desde el tablero de preparación y ajusta el contador de
   suelo con `−` / `+`.
3. **Cerrar ronda**: pulsa *Cerrar ronda N*. Los puntos se aplican y la pared queda fija.
   Si te equivocaste, *Deshacer ronda* revierte el último cierre.
4. **Fin de partida**: cuando aparezca el aviso de fila completa, cierra esa última
   ronda y pulsa *Terminar partida y sumar bonos* para ver el desglose y el ganador.

---

## Despliegue en Vercel

1. Sube la carpeta a un repositorio de GitHub.
2. En Vercel: **Add New → Project** → importa el repositorio.
3. El framework se autodetecta como Next.js; no hace falta configurar nada ni definir
   variables de entorno. Pulsa **Deploy**.

---

## Notas

- La partida se guarda con la clave `azul-marcador-v1` en el `localStorage` del
  navegador; borrar los datos del sitio elimina la partida en curso.
- La app no cuenta azulejos de la bolsa ni de las fábricas: solo puntúa. El reparto de
  azulejos sigue haciéndose en la mesa.
- *Azul* es una marca y un juego de Plan B Games / Next Move Games. Este proyecto es
  una herramienta no oficial hecha por aficionados.
