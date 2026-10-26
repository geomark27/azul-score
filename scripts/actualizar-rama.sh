#!/usr/bin/env bash
# Cambia a una rama y la trae al día desde origin. Lo llama `make actualizar`.
#
#   scripts/actualizar-rama.sh <rama>
#
# Equivale a `git switch <rama> && git fetch origin <rama> && git pull origin <rama>`,
# pero comprueba cada paso y, si algo falla, dice qué pasó y cómo arreglarlo:
#
# - primero el fetch: así se sabe si la rama existe en origin y si hay red antes
#   de moverse, y `git switch` puede crear la rama local si aún no existe;
# - el pull es --ff-only: si la rama local y la de origin han divergido no se
#   crea un merge por sorpresa, se para y se explica.
set -euo pipefail

C=$'\033[0;36m'; G=$'\033[0;32m'; Y=$'\033[0;33m'; R=$'\033[0;31m'; B=$'\033[1m'; N=$'\033[0m'

falla() { echo "" >&2; echo "${R}❌ $1${N}" >&2; shift; for l in "$@"; do echo "   $l" >&2; done; echo "" >&2; exit 1; }
aviso() { echo "${Y}⚠ $*${N}"; }
ok()    { echo "${G}✓ $*${N}"; }
paso()  { echo "${Y}[$1/3]${N} $2"; }

RAMA=${1:-}

# ---------------------------------------------------------------- comprobaciones

[ -n "$RAMA" ] || falla "Falta la rama." \
  "Uso: make actualizar rama=develop" \
  "     make actualizar rama=main"

git rev-parse --git-dir >/dev/null 2>&1 || falla "Esto no es un repositorio git."
cd "$(git rev-parse --show-toplevel)"

git check-ref-format --branch "$RAMA" >/dev/null 2>&1 || falla "«$RAMA» no es un nombre de rama válido." \
  "Revisa que no tenga espacios ni caracteres como ~ ^ : ? * [" \
  "Ejemplo: make actualizar rama=feat/mi-cambio"

GITDIR=$(git rev-parse --git-dir)
if [ -f "$GITDIR/MERGE_HEAD" ]; then
  falla "Hay un merge a medias." \
    "Termínalo (git commit) o cancélalo (git merge --abort) antes de cambiar de rama."
fi
if [ -d "$GITDIR/rebase-merge" ] || [ -d "$GITDIR/rebase-apply" ]; then
  falla "Hay un rebase a medias." \
    "Termínalo (git rebase --continue) o cancélalo (git rebase --abort) antes de cambiar de rama."
fi

ACTUAL=$(git branch --show-current)

# Con cambios sin commitear, cambiar de rama se los llevaría a la otra (o fallaría
# a medias): mejor pararse y que se decida qué hacer con ellos.
if [ "$ACTUAL" != "$RAMA" ] && [ -n "$(git status --porcelain)" ]; then
  echo ""
  git status --short
  falla "Tienes cambios sin commitear en ${ACTUAL:-un HEAD suelto} y vas a cambiar a $RAMA." \
    "Elige qué hacer con ellos antes de seguir:" \
    "  · guardarlos en la rama actual:  git add -A && git commit -m \"…\"" \
    "  · apartarlos para luego:         git stash   (y después: git stash pop)" \
    "  · descartarlos (no se recuperan): git restore . && git clean -fd"
fi

echo ""
echo "${C}${B}  Actualizar $RAMA${N}${C} · ahora en ${ACTUAL:-un HEAD suelto}${N}"
echo ""

# ---------------------------------------------------------------- 1. fetch

paso 1 "Trayendo origin/$RAMA..."
set +e
SALIDA=$(git ls-remote --exit-code --heads origin "$RAMA" 2>&1)
CODIGO=$?
set -e
if [ "$CODIGO" = 2 ]; then
  if git show-ref -q --verify "refs/heads/$RAMA"; then
    falla "La rama $RAMA existe en tu equipo pero no en origin." \
      "Si es nueva y quieres subirla: git switch $RAMA && git push -u origin $RAMA" \
      "Si la borraron en GitHub tras mergear la PR, ya no hay nada que traer."
  fi
  PARECIDAS=$(git ls-remote --heads origin 2>/dev/null | sed 's#.*refs/heads/##' | grep -i -- "${RAMA##*/}" | head -5 | paste -sd ' ' || true)
  falla "La rama $RAMA no existe ni en origin ni en tu equipo." \
    "¿Está bien escrita? Mira las que hay con: git branch -a" \
    ${PARECIDAS:+"Parecidas en origin: $PARECIDAS"}
elif [ "$CODIGO" != 0 ]; then
  echo "$SALIDA" | sed 's/^/   /' >&2
  falla "No se pudo hablar con origin ($(git remote get-url origin 2>/dev/null || echo 'sin remoto'))." \
    "Revisa la conexión a internet y que sigas autenticado en GitHub (gh auth status)."
fi

if ! SALIDA=$(git fetch origin "$RAMA" 2>&1); then
  echo "$SALIDA" | sed 's/^/   /' >&2
  falla "Falló el fetch de origin/$RAMA." "Revisa la conexión y vuelve a intentarlo."
fi

# ---------------------------------------------------------------- 2. switch

# Dónde estaba la rama local antes de tocar nada, para el resumen. Si no existe,
# git switch la crea ya al día a partir de origin/<rama>.
ANTES=$(git rev-parse -q --verify "refs/heads/$RAMA" || true)

if [ "$ACTUAL" = "$RAMA" ]; then
  paso 2 "Ya estás en $RAMA."
else
  paso 2 "Cambiando a $RAMA..."
  if ! SALIDA=$(git switch "$RAMA" 2>&1); then
    echo "$SALIDA" | sed 's/^/   /' >&2
    falla "No se pudo cambiar a $RAMA." "Arriba está el motivo que da git."
  fi
fi

# ---------------------------------------------------------------- 3. pull

paso 3 "Actualizando $RAMA desde origin..."
if ! SALIDA=$(git pull --ff-only origin "$RAMA" 2>&1); then
  if ! git merge-base --is-ancestor HEAD "origin/$RAMA" && ! git merge-base --is-ancestor "origin/$RAMA" HEAD; then
    LOCALES=$(git rev-list --count "origin/$RAMA..HEAD")
    REMOTOS=$(git rev-list --count "HEAD..origin/$RAMA")
    falla "Tu $RAMA y origin/$RAMA han divergido: tienes $LOCALES commit(s) que origin no tiene, y origin tiene $REMOTOS que tú no." \
      "No se ha tocado nada. Para resolverlo, elige:" \
      "  · poner tus commits encima de los de origin:  git pull --rebase origin $RAMA" \
      "  · quedarte con lo de origin y tirar los tuyos: git reset --hard origin/$RAMA" \
      "Tus commits locales:" \
      "$(git log --oneline "origin/$RAMA..HEAD" | head -5 | sed 's/^/      /')"
  fi
  echo "$SALIDA" | sed 's/^/   /' >&2
  if grep -q "would be overwritten" <<< "$SALIDA"; then
    falla "Tus cambios sin commitear chocan con lo que llega de origin." \
      "Commitéalos o apártalos (git stash) y vuelve a lanzar: make actualizar rama=$RAMA"
  fi
  falla "Falló el pull de origin/$RAMA." "Arriba está el motivo que da git."
fi

# ---------------------------------------------------------------- resumen

echo ""
DESPUES=$(git rev-parse HEAD)
if [ -z "$ANTES" ]; then
  ok "$RAMA no existía en tu equipo: creada siguiendo a origin/$RAMA."
elif [ "$ANTES" = "$DESPUES" ]; then
  ok "$RAMA ya estaba al día con origin."
else
  NUEVOS=$(git rev-list --count "$ANTES..$DESPUES")
  ok "$RAMA actualizada: $NUEVOS commit(s) nuevo(s)."
  git log --oneline "$ANTES..$DESPUES" | head -10 | sed 's/^/    · /'
  [ "$NUEVOS" -gt 10 ] && echo "    · … y $((NUEVOS - 10)) más"
  if git diff --quiet "$ANTES" "$DESPUES" -- package.json package-lock.json; then :; else
    aviso "Cambiaron las dependencias: ejecuta make install."
  fi
fi

PENDIENTES=$(git rev-list --count "origin/$RAMA..HEAD")
[ "$PENDIENTES" = 0 ] || aviso "Tienes $PENDIENTES commit(s) en $RAMA sin subir a origin."
echo "${C}  Último commit: $(git log -1 --format='%h %s')${N}"
echo ""
