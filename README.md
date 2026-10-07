# Azul · Marcador

Marcador y calculadora de puntos para el juego de mesa **Azul**, de 2 a 4 jugadores.
Pensada para usarse desde el móvil mientras se juega: tocas los azulejos que colocaste
en tu pared, indicas cuántos cayeron al suelo y la app calcula los puntos de la ronda
y los bonos finales.

Se puede usar de dos maneras:

- **Partida compartida** (`/`): cada jugador abre la app en su propio móvil y entra con
  un código de 4 letras. Cada uno registra solo su tablero y ve los marcadores de los
  demás en vivo; el anfitrión cierra las rondas. Necesita el servidor en marcha.
- **Un solo dispositivo** (`/local`): un móvil que va pasando de mano en mano, con la
  partida guardada en `localStorage`. Funciona sin servidor ni conexión.

Construida con Next.js 15 (App Router), React 19 y TypeScript. **Sin dependencias
adicionales**: no usa librerías de UI, estado, tiempo real ni estilos.

---

## Características

- **Pared 5×5 interactiva** con los colores reales de Azul; toca una casilla por fila
  para marcar el azulejo que colocaste esta ronda.
- **Cálculo automático de la puntuación** siguiendo las reglas oficiales: adyacencias
  horizontales y verticales, 1 punto si el azulejo queda aislado. Las diagonales no
  puntúan.
- **Ficha de jugador inicial**: se marca quién la tomó. Ocupa un espacio de la línea de
  suelo (no es una resta aparte) y quien la tenga abre la ronda siguiente.
- **Penalización de suelo** con la progresión estándar `−1, −1, −2, −2, −2, −3, −3`
  (la puntuación nunca baja de 0).
- **Vista previa en vivo**: antes de cerrar la ronda ves cuánto ganas, cuánto pierdes
  y el total resultante.
- **Aviso de última ronda** cuando algún jugador completa una fila horizontal.
- **Bonos de fin de partida**: filas completas ×2, columnas completas ×7,
  colores completos ×10, con desglose por jugador.
- **Clasificación final ordenada** de 1.º a 4.º, con el desempate oficial (más filas
  horizontales completas) y puesto compartido si el empate persiste.
- **Deshacer ronda** e historial de puntos por ronda.

### Solo en la partida compartida

- Sala con **código de 4 caracteres** sin letras ambiguas, fácil de dictar en la mesa.
- **Cada jugador edita únicamente su tablero**; el servidor rechaza lo demás.
- **Actualización en vivo** por SSE, con sondeo de respaldo cada 4 s si el stream cae.
- Marcar **«estoy listo»**; el anfitrión ve cuántos faltan antes de cerrar la ronda.
- **Reconexión**: si a alguien se le cierra el navegador, su asiento queda reservado y
  puede retomarlo con sus puntos intactos. Si se va el anfitrión, otro toma el relevo.
- **Revancha** conservando a los mismos jugadores.

---

## Requisitos

- Node.js 18.18 o superior (recomendado Node 20+)
- npm

## Uso en local

```bash
npm install
npm run dev
```

Abre <http://localhost:3000>. Para que los demás móviles entren a una sala, todos deben
poder alcanzar esa dirección (misma red y `npm run dev -- -H 0.0.0.0`, o un despliegue).

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
│   ├── layout.tsx                   # Layout raíz, metadatos y viewport
│   ├── page.tsx                     # Inicio: crear sala o unirse con código
│   ├── local/page.tsx               # Modo de un solo dispositivo
│   ├── sala/[code]/page.tsx         # Partida compartida
│   ├── api/rooms/route.ts           # POST: crear sala
│   ├── api/rooms/[code]/route.ts    # GET estado · POST acción
│   ├── api/rooms/[code]/stream/     # GET: actualizaciones en vivo (SSE)
│   └── globals.css                  # Estilos (CSS plano, sin framework)
├── lib/
│   ├── azul.ts                      # Puntuación pura: calc, bonuses, standings
│   ├── room.ts                      # Estado de sala y reglas de permiso (puro)
│   ├── store.ts                     # Persistencia de salas tras una interfaz
│   └── client.ts                    # Identidad del móvil y hook useRoom
├── css.d.ts                         # Declara los imports de .css planos
├── next.config.mjs
├── tsconfig.json                    # strict: true, alias "@/*" a la raíz
└── package.json
```

La lógica vive aislada de React y puede probarse por separado:

| Función | Qué hace |
| --- | --- |
| `newPlayer(name)` | Crea un jugador con la pared vacía |
| `colorOf(r, c)` | Color canónico de la casilla (patrón diagonal de Azul) |
| `calc(player, first)` | Puntos de la ronda: `{ gain, pen, tiles, after, delta }` |
| `floorTiles(player, first)` | Azulejos del suelo contando la ficha de jugador inicial |
| `bonuses(player)` | Bonos finales: `{ rows, cols, colors, total }` |
| `closeRoundFor(player, first)` | Aplica la ronda a la pared y reinicia lo temporal |
| `hasFullRow(players)` | `true` si alguien completó una fila (última ronda) |
| `standings(players)` | Clasificación ordenada con puesto y empates |
| `apply(room, clientId, action)` | Única puerta de cambio de una sala; valida permisos |

---

## Cómo se usa durante la partida

### Cada uno en su móvil

1. Uno pulsa **Crear sala** y dicta el código de 4 letras.
2. Los demás entran con ese código y su nombre.
3. El anfitrión pulsa **Empezar partida**.
4. Cada jugador marca en su pared los azulejos que colocó, ajusta su suelo y, si tomó
   la ficha del centro, pulsa **Ficha de jugador inicial**. Al terminar, **Estoy listo**.
5. El anfitrión pulsa **Cerrar ronda N** cuando estén todos.
6. Tras la última ronda, el anfitrión pulsa **Terminar y sumar bonos**.

### Un solo dispositivo

Igual que antes, eligiendo jugador en la barra superior antes de registrar su tablero.

---

## Despliegue

La partida compartida guarda las salas **en la memoria del proceso del servidor**
(`lib/store.ts`). Eso funciona mientras haya **un único proceso en marcha**:

- `npm start` en un equipo, una Raspberry o un contenedor.
- Hosts que mantienen el proceso vivo: Render, Railway, Fly.io.

**No funciona tal cual en Vercel ni en otro entorno serverless**: cada petición puede
atenderla una instancia distinta y las salas se perderían entre llamadas. Para desplegar
ahí hay que escribir otra implementación de la interfaz `Store` (`get`, `create`,
`mutate`, `subscribe`) contra Supabase, Upstash Redis o similar, y exportarla al final
de `lib/store.ts`. Nada más del proyecto depende de cuál esté activa.

El modo `/local` sí funciona en cualquier hosting estático o serverless.

---

## Notas

- Las salas caducan 12 horas después del último cambio.
- La partida de `/local` se guarda con la clave `azul-marcador-v1` en el `localStorage`
  del navegador; borrar los datos del sitio elimina la partida en curso.
- La app no cuenta azulejos de la bolsa ni de las fábricas: solo puntúa. El reparto de
  azulejos sigue haciéndose en la mesa.
- *Azul* es una marca y un juego de Plan B Games / Next Move Games. Este proyecto es
  una herramienta no oficial hecha por aficionados.
