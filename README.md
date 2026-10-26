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
- **Revancha** conservando a los mismos jugadores, o **cerrar la sala**: al cerrarla,
  todos los móviles vuelven solos a la portada en vez de quedarse en una pantalla muerta.

---

## Requisitos

- Node.js 18.18 o superior (recomendado Node 20+)
- npm

## Uso en local

```bash
make install
make dev
```

Abre <http://localhost:3000>. Si quieres entrar desde el móvil en la misma red, usa
`make lan`: escucha en todas las interfaces y te imprime la dirección a la que conectarte.

`make` sin argumentos lista todos los comandos.

### Comandos

| Comando | Descripción |
| --- | --- |
| `make dev` | Servidor de desarrollo (`PORT=3000` por defecto) |
| `make lan` | Igual, pero accesible desde otros dispositivos de la red |
| `make build` | Compilación de producción |
| `make start` | Sirve la compilación (requiere `build` previo) |
| `make clean` | Borra `.next`, `.tmp` y cachés |
| `make typecheck` | Comprueba los tipos (`tsc --noEmit`) |
| `make test` | Pruebas de `lib/` (36 casos sobre puntuación y salas) |
| `make lint` | `typecheck` + `test` |
| `make check` | `lint` + `build`: lo mismo que valida un release |
| `make push m='…'` | Add + commit + push a la rama actual |
| `make sync m='…'` | Pull + commit + push |
| `make health URL=…` | Consulta `/api/health` de un despliegue |

Los scripts de npm (`npm run dev`, `build`, `start`, `typecheck`, `test`) siguen
funcionando: el Makefile solo los envuelve.

---

## Versionado

`package.json` es la fuente de verdad y cada versión publicada tiene su tag `vX.Y.Z`
en git. La versión viaja al bundle en tiempo de compilación (`next.config.mjs` la
inyecta como `NEXT_PUBLIC_APP_VERSION`), así que se puede ver en marcha:

- en el pie de la portada, junto al commit: `v0.1.0 · 3acf0da`;
- en `GET /api/health`, con el resto del diagnóstico.

### Publicar una versión

El trabajo va `feat/*` → PR → `develop` → PR → `main`, y los releases salen siempre
de `main`, que es lo único que despliega Vercel.

```bash
make version                # en qué versión estás y si el tag coincide
make release-preview        # qué entraría y qué tipo se sugiere (no toca nada)
make release                # menú: elige patch, minor o major
make release tipo=minor     # igual, sin menú
make release-patch          # 0.1.0 -> 0.1.1   correcciones y retoques
make release-minor          # 0.1.0 -> 0.2.0   funciones nuevas
make release-major          # 0.1.0 -> 1.0.0   cambios incompatibles
```

El menú sugiere el tipo según los commits desde el último tag: `feat:` → minor,
`feat!:` o `BREAKING CHANGE` → major, el resto → patch. `release-preview` funciona
desde cualquier rama, así que sirve para mirar desde `develop` antes de abrir la PR.

Cada release (`scripts/release.sh`), en este orden:

1. Exige estar en `main`, con el árbol limpio y al día con `origin/main`, y que haya
   commits desde el último tag.
2. Pasa typecheck y pruebas.
3. Sube la versión en `package.json` y `package-lock.json` (`npm version`).
4. Compila; si falla, restaura ambos ficheros y enseña el final del log.
5. Commitea `release: vX.Y.Z`, crea el tag anotado con las notas y hace push.
6. Publica el release en GitHub (si hay `gh`) con las notas agrupadas en
   Novedades / Correcciones / Otros cambios y el enlace de comparación.
7. Adelanta `develop` hasta `main` para que tenga el commit de release. Si `develop`
   ya tiene trabajo nuevo, no lo toca y dice cómo mergear.
8. Lanza el Deploy Hook de Vercel.

El primer `make release` publica la versión que ya está en `package.json` en vez de
incrementarla, para que el primer tag sea exactamente `v0.1.0`.

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
│   ├── api/health/route.ts          # Diagnóstico: versión y almacén activo
│   └── globals.css                  # Estilos (CSS plano, sin framework)
├── lib/
│   ├── azul.ts                      # Puntuación pura: calc, bonuses, standings
│   ├── room.ts                      # Estado de sala y reglas de permiso (puro)
│   ├── store.ts                     # Interfaz Store + implementación en memoria
│   ├── store-upstash.ts             # Implementación en Redis para serverless
│   ├── client.ts                    # Identidad del móvil y hook useRoom
│   └── version.ts                   # Versión y commit del build
├── tests/                           # Pruebas de azul.ts y room.ts
├── scripts/test.mjs                 # Compila y lanza el runner de Node
├── scripts/release.sh               # Publica una versión (make release)
├── Makefile                         # Desarrollo, calidad, git y releases
├── css.d.ts                         # Declara los imports de .css planos
├── vercel.json                      # Solo despliega los commits de release
├── next.config.mjs                  # Inyecta la versión en el bundle
├── tsconfig.json                    # strict: true, alias "@/*" a la raíz
└── package.json                     # Fuente de verdad de la versión
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
7. En el resultado solo quedan dos salidas, y las decide el anfitrión:
   **Revancha** (mismos jugadores, tableros a cero) o **Cerrar sala** (a dos toques,
   porque echa a todo el mundo). Al cerrarla, todos los móviles vuelven solos a la
   portada; lo mismo ocurre si la sala caduca.

### Un solo dispositivo

Igual que antes, eligiendo jugador en la barra superior antes de registrar su tablero.

---

## Despliegue

Las salas se guardan tras la interfaz `Store` (`lib/store.ts`), que tiene dos
implementaciones y **se elige sola según el entorno**:

| | Almacén | Cambios en vivo |
| --- | --- | --- |
| Sin variables de entorno | memoria del proceso | SSE (instantáneo) |
| Con credenciales de Upstash | Redis | sondeo cada 2 s |

### Cuándo despliega Vercel

Por defecto Vercel despliega en **cada push**, y eso consume cuota aunque el
despliegue no sirva de nada. Aquí los despliegues automáticos están **apagados** y
solo se lanzan al publicar una versión.

`vercel.json` lo consigue con dos piezas:

```json
{
  "git": { "deploymentEnabled": false },
  "ignoreCommand": "…"
}
```

- **`git.deploymentEnabled: false`** es la que importa: Vercel **no crea ningún
  despliegue** al recibir un push, así que no gasta cuota ni ocupa un slot de build.
- **`ignoreCommand`** es una red de seguridad: si algún día se reactivan los
  despliegues automáticos, solo dejaría pasar los commits `release: vX.Y.Z` en `main`.
  Ojo con su lógica invertida: sale con **1 para construir** y **0 para ignorar**.

El ajuste **Ignored Build Step** del panel puede quedarse en *Automatic*: el
`vercel.json` lo sobrescribe, y así la regla vive en el repo y no en dos sitios.

### Lanzar un despliegue

Con los automáticos apagados, el despliegue lo dispara un **Deploy Hook**:

1. En Vercel: **Settings → Git → Deploy Hooks**, crea uno para la rama `main`.
2. Guarda la URL en local — es privada y el `.gitignore` la excluye:
   ```bash
   echo 'URL_DEL_HOOK' > .vercel-deploy-hook
   ```

A partir de ahí, `make release` lo llama solo al terminar. Y para desplegar sin
publicar versión:

```bash
make deploy
```

Si prefieres no guardar el fichero, el hook también se lee de la variable de
entorno `VERCEL_DEPLOY_HOOK`.

### Vercel y cualquier otro serverless → hace falta Redis

En serverless **cada petición puede atenderla una instancia distinta**, así que un
estado en memoria se pierde: a un jugador le sale «esa sala no existe o ya caducó»
mientras a otro le funciona. Para evitarlo, añade un Redis de Upstash desde el
*Marketplace* de Vercel (plan gratuito: 500.000 comandos al mes, unas 60 partidas).
La integración inyecta sola estas variables, y con eso basta:

```
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

También sirven las `KV_REST_API_URL` / `KV_REST_API_TOKEN` de Vercel KV. Si están
presentes, `lib/store-upstash.ts` toma el relevo; si no, se sigue usando la memoria.
No hay que tocar código ni instalar dependencias: el adaptador habla con la API REST
de Upstash por `fetch`.

Como la API REST no ofrece pub/sub, con Redis el servidor **no puede empujar** cambios:
responde `push: false`, el cliente desactiva el SSE y sondea cada 2 s (cada 10 s si la
pestaña está en segundo plano). Las escrituras simultáneas se resuelven con
*compare-and-set* sobre `version` mediante un script Lua, así que dos jugadores que
tocan a la vez no se pisan.

### Hosts con proceso persistente → funciona sin configurar nada

`npm start` en un equipo, una Raspberry, un contenedor, Render o Railway: ahí el store
en memoria vale y además tienes SSE instantáneo. El único aviso es que si el proceso se
reinicia o se duerme, las salas abiertas se pierden; con Redis eso tampoco pasa.

El modo `/local` funciona en cualquier sitio, incluido hosting estático.

---

## Notas

- Las salas caducan 12 horas después del último cambio.
- La partida de `/local` se guarda con la clave `azul-marcador-v1` en el `localStorage`
  del navegador; borrar los datos del sitio elimina la partida en curso.
- La app no cuenta azulejos de la bolsa ni de las fábricas: solo puntúa. El reparto de
  azulejos sigue haciéndose en la mesa.
- *Azul* es una marca y un juego de Plan B Games / Next Move Games. Este proyecto es
  una herramienta no oficial hecha por aficionados.
