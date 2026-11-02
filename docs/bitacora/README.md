# Bitácora de cambios — azul-marcador

Registro de **qué** cambiamos, **por qué** y **en qué versión salió**.
Los commits dicen *cómo*; la bitácora dice *por qué*.

Funciona con la skill `devlog` (copiada en `.claude/skills/devlog/`). Guía completa (en inglés):
[HOW-IT-WORKS.md](../../.claude/skills/devlog/HOW-IT-WORKS.md). Configuración: `.devlog.conf`.

## Estructura

```
docs/bitacora/
├── README.md            ← este índice
├── entry-template.md    ← plantilla de entrada
├── entries/             ← una por rama / PR
│   └── AAAA-MM-DD-<tipo>-<tema>.md
└── releases/            ← una por versión publicada (la genera el release)
    └── vX.Y.Z.md
```

## Uso

| Comando | Qué hace |
|---|---|
| `make bitacora t='Título'` | Crea la entrada de la rama actual (o te dice cuál es si ya existe) |
| `make bitacora-check` | Valida la entrada antes de abrir la PR |
| `make release-preview` | Enseña qué entradas saldrían en la próxima versión |
| `make release` | Publica y cierra la bitácora de la versión |

## Reglas

1. Toda rama que llegue a `develop` lleva **una** entrada. Sin entrada, no hay PR.
2. Una rama = una entrada = un dueño. Si la rama crece, se actualiza la misma entrada.
3. El contenido va en español. El frontmatter (`branch`, `version: unreleased`, …) queda en inglés:
   son datos que leen los scripts.
4. `version` empieza en `unreleased` y **nunca** se escribe a mano: la pone el release.
5. Las entradas publicadas no se reescriben (solo erratas). Si algo cambia, entrada nueva.
6. Sin secretos, tokens, URLs privadas (Deploy Hook, Redis) ni datos personales.

Tipos (los prefijos de los commits): `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `test`.

## Versiones publicadas

<!-- releases:start -->
| Versión | Fecha | Tipo | Entradas |
|---|---|---|---|
| [v0.2.0](releases/v0.2.0.md) | 2026-10-26 | minor | reconstruida |
| [v0.1.3](releases/v0.1.3.md) | 2026-10-12 | patch | reconstruida |
| [v0.1.2](releases/v0.1.2.md) | 2026-10-12 | patch | reconstruida |
| [v0.1.1](releases/v0.1.1.md) | 2026-10-12 | patch | reconstruida |
| [v0.1.0](releases/v0.1.0.md) | 2026-10-12 | initial | reconstruida |
<!-- releases:end -->

Las versiones hasta v0.2.0 son anteriores a la bitácora: se reconstruyeron a partir del historial
de git y de los releases de GitHub.
