# Bitácora de cambios

Registro de **qué** cambiamos en azul-marcador, **por qué** y **en qué versión salió**.
Complementa al historial de git: los commits dicen *cómo*, la bitácora dice *por qué*.

## Estructura

```
docs/bitacora/
├── README.md              ← este índice
├── plantilla-entrada.md   ← plantilla para una entrada nueva
├── entradas/              ← una entrada por rama / PR
│   └── AAAA-MM-DD-<tipo>-<tema>.md
└── releases/              ← una por versión publicada (la genera el release)
    └── vX.Y.Z.md
```

- **Entrada** (`entradas/`): la escribe quien hace el cambio, dentro de su rama, antes de abrir la PR.
  Una por rama; si la rama sigue creciendo se actualiza la misma entrada.
- **Release** (`releases/`): la genera `make release`. Junta las entradas con `version: pendiente`,
  les pone la versión publicada y añade las notas de los commits.

## Reglas

1. Toda rama que llegue a `develop` lleva su entrada. Sin entrada, no hay PR.
2. Crea la entrada con `make bitacora` (rellena fecha, rama, tipo y autor).
3. `version` siempre empieza en `pendiente`; **nunca** se escribe a mano: la pone el release.
4. Las entradas ya publicadas no se reescriben (solo erratas). Si algo cambia, nueva entrada.
5. Sin secretos, tokens, URLs privadas (Deploy Hook, Redis) ni datos personales.

Tipos (los mismos prefijos que los commits): `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `test`.

## Versiones publicadas

<!-- releases:inicio -->
| Versión | Fecha | Tipo | Entradas |
|---|---|---|---|
| [v0.2.0](releases/v0.2.0.md) | 2026-10-26 | minor | reconstruida |
| [v0.1.3](releases/v0.1.3.md) | 2026-10-12 | patch | reconstruida |
| [v0.1.2](releases/v0.1.2.md) | 2026-10-12 | patch | reconstruida |
| [v0.1.1](releases/v0.1.1.md) | 2026-10-12 | patch | reconstruida |
| [v0.1.0](releases/v0.1.0.md) | 2026-10-12 | inicial | reconstruida |
<!-- releases:fin -->

Las versiones hasta v0.2.0 son anteriores a la bitácora: se reconstruyeron a partir del historial
de git y de los releases de GitHub.
