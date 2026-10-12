# Azul — Propuesta visual mobile-first para web responsive

## Objetivo

Rediseñar Azul como una **aplicación web responsive pensada primero para móvil**. La mayoría de las decisiones visuales y de interacción deben optimizar el uso táctil en una pantalla pequeña; escritorio debe aprovechar el espacio adicional sin convertirse en una experiencia diferente.

La meta es facilitar que durante una partida se pueda ver la puntuación, seleccionar azulejos, registrar penalizaciones y confirmar la ronda con pocos pasos.

## 1. Diagnóstico de la interfaz actual

La versión actual tiene una base reconocible: fondo oscuro, colores de los azulejos y un tablero central. Los principales problemas son:

- En escritorio, el contenido queda comprimido en una columna estrecha y desaprovecha espacio.
- El tablero y los controles se sienten pequeños para ser el foco de la experiencia.
- Puntuaciones, tablero, ficha inicial, suelo y resumen no tienen una jerarquía suficientemente clara.
- La acción inferior debe ser más explícita y adaptarse a la pantalla sin tapar contenido.
- Hay que priorizar objetivos táctiles, contraste y navegación móvil antes de pulir efectos decorativos.

## 2. Principios de diseño

1. **Mobile-first:** diseñar primero para anchos de móvil y ampliar progresivamente.
2. **Tablero protagonista:** utilizar todo el ancho útil disponible, manteniendo una cuadrícula 5 × 5.
3. **Acciones táctiles cómodas:** botones y casillas con un área de interacción adecuada; evitar controles demasiado juntos.
4. **Información en orden de importancia:** puntuaciones, tablero, penalizaciones y total provisional.
5. **Acciones claras:** el texto de cada botón debe describir su efecto real.
6. **Responsive real:** reorganizar la composición en vez de escalar todo el diseño de escritorio.
7. **Accesibilidad:** contraste legible, foco visible, navegación por teclado y estados que no dependan únicamente del color.

## 3. Dirección visual

**Concepto:** compañero digital de mesa, oscuro, moderno y sobrio. Conservar los colores de los azulejos, reducir los bordes decorativos y reservar el azul brillante para la acción principal y los estados activos.

### Paleta sugerida

| Uso | Color |
|---|---|
| Fondo principal | `#080F20` |
| Paneles | `#101D36` |
| Bordes | `#263B60` |
| Acción principal | `#3478F6` |
| Texto principal | `#F4F6FC` |
| Texto secundario | `#A9B9D8` |
| Confirmación | `#22C55E` |
| Azul | `#1765E8` |
| Amarillo | `#F4BD27` |
| Rojo | `#E5483F` |
| Celeste | `#65C7D7` |
| Oscuro | `#30323B` |
| Oliva | `#777D43` |

Los colores de los azulejos deben ser consistentes y distinguibles. La selección debe tener una señal adicional —por ejemplo, borde, marca o estado— y no depender exclusivamente del color.

## 4. Diseño para móvil

### Orden de pantalla recomendado

```text
┌──────────────────────────┐
│ ☰  Azul       Ronda 4/5  │
├──────────────────────────┤
│ ┌──────────┐ ┌─────────┐ │
│ │ Marcos   │ │ Geovanny│ │
│ │ 26       │ │ 29      │ │
│ └──────────┘ └─────────┘ │
├──────────────────────────┤
│ Tu tablero               │
│                          │
│      CUADRÍCULA 5 × 5    │
│                          │
├──────────────────────────┤
│ Ficha inicial            │
├──────────────────────────┤
│ Suelo / penalizaciones   │
│ -1  -1  -2  -2  ...      │
│ Penalización actual      │
├──────────────────────────┤
│ Colocados         0      │
│ Total provisional 29     │
├──────────────────────────┤
│ [    Confirmar ronda   ] │
└──────────────────────────┘
```

### Cabecera

- Mantener la marca compacta.
- Mostrar el progreso de ronda de forma breve.
- Si se necesita un menú, mantenerlo secundario; no debe competir con el tablero.
- Evitar una cabecera demasiado alta que reste espacio útil.

### Puntuaciones

- Dos tarjetas en una fila, con puntuación grande.
- Nombre en tamaño secundario.
- El jugador activo debe mostrar una etiqueta como **“Tu turno”** y un indicador visual adicional.
- No usar solamente un borde luminoso para comunicar quién está activo.

### Tablero

- Cuadrícula 5 × 5 con celdas uniformes.
- El tablero debe usar el ancho interior de la pantalla, respetando márgenes pequeños pero cómodos.
- Mantener una separación constante entre casillas.
- Las casillas deben tener áreas táctiles adecuadas sin que el tablero provoque desplazamiento horizontal.
- Diferenciar estados como disponible, seleccionado, colocado y bloqueado.
- Añadir feedback visual inmediato al tocar una casilla.
- Evitar animaciones largas o que retrasen la selección.

### Ficha inicial

- Presentarla en una tarjeta compacta debajo del tablero o en el lugar que indique el flujo real de la partida.
- Mostrar el nombre y una explicación breve.
- Si es información principalmente explicativa, se puede permitir expandirla o contraerla.

### Suelo y penalizaciones

- Mantener los valores de penalización visibles y fáciles de tocar.
- Separar los valores de penalización del control para sumar o restar el total, si son acciones distintas.
- Dar feedback inmediato al cambiar la penalización.
- Restringir valores inválidos de acuerdo con las reglas reales del juego.

### Resumen de ronda

En móvil, mostrar siempre lo esencial:
- Azulejos colocados.
- Penalización actual.
- Total provisional.

Los detalles secundarios pueden estar en una sección plegable, pero el total provisional debe ser visible sin navegar a otra pantalla.

### Barra inferior fija

- Botón primario de ancho amplio: **“Confirmar ronda”**, si ese es el efecto real.
- Debe respetar las áreas seguras del dispositivo y el teclado virtual cuando aparezca.
- Añadir espacio inferior al contenido para que el botón no tape el último elemento.
- Si hay dos acciones, dar prioridad visual a la principal y dejar la secundaria como enlace o botón de menor énfasis.
- Deshabilitar la confirmación cuando la ronda no sea válida y explicar el motivo.

## 5. Diseño para escritorio y tablet

El escritorio debe reutilizar los mismos componentes y estados. Solo cambia la composición.

- **Móvil:** una columna; puntuaciones arriba, tablero, controles y resumen debajo; acción principal fija.
- **Tablet:** tablero principal y resumen en columnas si el ancho lo permite.
- **Escritorio:** tablero amplio a la izquierda; ficha inicial, penalizaciones y resumen a la derecha.
- Definir un ancho máximo para evitar que el tablero y las líneas de texto se estiren demasiado.
- No fijar dimensiones absolutas que rompan el diseño en tamaños intermedios.

## 6. Tipografía y espaciado

- Usar una sans-serif legible para interfaz y controles, por ejemplo Inter, Manrope o system-ui.
- Reservar una tipografía con personalidad para el logotipo, si se desea conservar ese carácter.
- Crear una escala consistente para título, secciones, texto normal y etiquetas.
- Utilizar múltiplos de 4 u 8 px para el espaciado.
- Mantener radios de borde y alturas de control consistentes.
- Asegurar que el texto secundario conserve contraste suficiente en pantallas con brillo bajo.

## 7. Interacción y accesibilidad

- Cada control debe tener estados normal, presionado, foco, deshabilitado y error cuando corresponda.
- No comunicar selección únicamente mediante color.
- Permitir navegación por teclado en escritorio.
- Mantener un foco visible.
- Usar etiquetas accesibles en iconos y botones sin texto.
- Prevenir toques accidentales en acciones que cambien o finalicen la ronda.
- Pedir confirmación solo para acciones irreversibles o especialmente sensibles; no añadir pasos innecesarios a acciones reversibles.
- Ofrecer “Deshacer” cuando el modelo de la aplicación permita revertir la última acción.

## 8. Prioridades de implementación

### P0 — Estructura y móvil
- Adoptar un enfoque mobile-first.
- Ampliar el tablero en relación con el ancho disponible.
- Hacer más claras las puntuaciones y el jugador activo.
- Organizar suelo, penalizaciones y total provisional.
- Crear una barra inferior que no tape contenido.
- Comprobar que no exista desplazamiento horizontal en móvil.

### P1 — Interacciones
- Estados consistentes de los azulejos.
- Feedback inmediato en selección y penalizaciones.
- Confirmación con validaciones claras.
- Deshacer cuando sea viable.
- Revisar navegación táctil y por teclado.

### P2 — Acabado
- Transiciones breves y discretas.
- Pulido de iconos y ficha inicial.
- Pruebas en distintos tamaños de móvil, tablet y escritorio.
- Revisión de contraste y accesibilidad.

## 9. Criterios de aceptación

- La interfaz es usable desde un móvil sin zoom.
- El tablero cabe en el ancho disponible y las casillas se pueden tocar con comodidad.
- Las puntuaciones y el jugador activo se identifican de inmediato.
- La penalización y el total provisional se encuentran sin buscar entre varios paneles.
- El botón principal no tapa contenido ni controles.
- No hay desplazamiento horizontal accidental.
- En tablet y escritorio, el espacio extra se aprovecha mediante una composición de columnas.
- Las acciones y sus textos corresponden a la lógica real de la aplicación.
- Los cambios visuales no alteran las reglas ni la puntuación de Azul.

## 10. Nota de implementación

Esta propuesta define dirección visual y UX, no reglas de juego nuevas. Antes de implementar, verificar el flujo real de selección, penalizaciones, cálculo provisional, confirmación de ronda y cambio de jugador. La maqueta visual debe adaptarse a esa lógica, no reemplazarla.
