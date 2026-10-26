#!/usr/bin/env bash
# Publica una versión: sube package.json, compila, etiqueta, sube a GitHub,
# crea el release, pone develop al día y despliega. Lo llama `make release`.
#
#   scripts/release.sh [patch|minor|major] [--dry-run]
#
# Sin tipo, enseña lo que entra en la versión, sugiere uno y pregunta.
# Con --dry-run solo enseña lo que saldría: no toca nada.
#
# Flujo: feat/* → PR → develop → PR → main → release. Los releases salen
# siempre de main, que es lo único que despliega Vercel.
set -euo pipefail

RAMA=main
INTEGRACION=develop
REPO=geomark27/azul-score

C=$'\033[0;36m'; G=$'\033[0;32m'; Y=$'\033[0;33m'; R=$'\033[0;31m'; B=$'\033[1m'; N=$'\033[0m'

falla() { echo "${R}❌ $*${N}" >&2; exit 1; }
aviso() { echo "${Y}⚠ $*${N}"; }
ok()    { echo "${G}✓ $*${N}"; }
paso()  { echo "${Y}[$1/6]${N} $2"; }

# ---------------------------------------------------------------- argumentos

TIPO=""
SECO=0
for a in "$@"; do
  case "$a" in
    patch|parche) TIPO=patch ;;
    minor) TIPO=minor ;;
    major) TIPO=major ;;
    --dry-run) SECO=1 ;;
    "") ;;
    *) falla "Tipo desconocido: «$a». Usa patch, minor o major." ;;
  esac
done

cd "$(git rev-parse --show-toplevel)"

# ---------------------------------------------------------------- comprobaciones
# En la vista previa los problemas solo avisan: sirve para mirar desde develop.

problema() { if [ "$SECO" = 1 ]; then aviso "$1"; else falla "$1"; fi; }

ACTUAL_RAMA=$(git branch --show-current)
if [ "$ACTUAL_RAMA" != "$RAMA" ]; then
  problema "Los releases salen de $RAMA y estás en ${ACTUAL_RAMA:-un HEAD suelto}.
   Mergea $INTEGRACION en $RAMA con una PR y luego: git checkout $RAMA && git pull"
fi

if [ -n "$(git status --porcelain)" ]; then
  [ "$SECO" = 1 ] || git status --short
  problema "Hay cambios sin commitear. Commitea o descarta antes de publicar."
fi

git fetch -q origin --tags
if [ "$SECO" = 0 ] && [ "$(git rev-parse HEAD)" != "$(git rev-parse "origin/$RAMA")" ]; then
  if git merge-base --is-ancestor HEAD "origin/$RAMA"; then
    falla "Tu $RAMA va por detrás de origin/$RAMA. Haz git pull primero."
  elif git merge-base --is-ancestor "origin/$RAMA" HEAD; then
    falla "Tu $RAMA tiene commits que no están en origin/$RAMA. Todo lo que entra en $RAMA pasa por PR."
  else
    falla "Tu $RAMA y origin/$RAMA han divergido. Revísalo antes de publicar."
  fi
fi

# ---------------------------------------------------------------- versiones
# package.json es la fuente de verdad; el último tag dice qué cambió desde entonces.

ACTUAL=$(node -p "require('./package.json').version")
[[ $ACTUAL =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]] || falla "La versión de package.json no es X.Y.Z: $ACTUAL"
MA=${BASH_REMATCH[1]}; MI=${BASH_REMATCH[2]}; PA=${BASH_REMATCH[3]}

declare -A SIGUIENTE=(
  [patch]="$MA.$MI.$((PA + 1))"
  [minor]="$MA.$((MI + 1)).0"
  [major]="$((MA + 1)).0.0"
)

ULTIMO=$(git describe --tags --abbrev=0 --match 'v[0-9]*' 2>/dev/null || true)
if [ -n "$ULTIMO" ] && [ "$ULTIMO" != "v$ACTUAL" ]; then
  aviso "package.json dice v$ACTUAL pero el último tag es $ULTIMO."
fi

mapfile -t COMMITS < <(git log "${ULTIMO:+$ULTIMO..}HEAD" --no-merges --format=%s | grep -v '^release: v' || true)
[ "${#COMMITS[@]}" -gt 0 ] || falla "No hay cambios desde ${ULTIMO:-el inicio}: nada que publicar."

# Sugerencia según los prefijos de los commits (feat:, fix:, feat!: …).
SUGERIDO=patch
if printf '%s\n' "${COMMITS[@]}" | grep -qE '^[a-zA-Z]+(\([^)]*\))?!:|BREAKING CHANGE'; then
  SUGERIDO=major
elif printf '%s\n' "${COMMITS[@]}" | grep -qiE '^feat'; then
  SUGERIDO=minor
fi

# Notas del release agrupadas por tipo de commit, sin el prefijo.
notas() {
  local s txt nov="" cor="" otr=""
  for s in "${COMMITS[@]}"; do
    txt=$(sed -E 's/^[a-zA-Z]+(\([^)]*\))?!?[[:space:]]*[:-][[:space:]]*//' <<< "$s")
    case "$s" in
      [Ff]eat*) nov+="- $txt"$'\n' ;;
      [Ff]ix*)  cor+="- $txt"$'\n' ;;
      *)        otr+="- $txt"$'\n' ;;
    esac
  done
  if [ -n "$nov" ]; then printf '### Novedades\n%s\n' "$nov"; fi
  if [ -n "$cor" ]; then printf '### Correcciones\n%s\n' "$cor"; fi
  if [ -n "$otr" ]; then printf '### Otros cambios\n%s\n' "$otr"; fi
}
NOTAS=$(notas)

# ---------------------------------------------------------------- resumen

echo ""
echo "${C}${B}  Release de azul-marcador${N}"
echo "${C}  versión actual: v$ACTUAL · último tag: ${ULTIMO:-ninguno}${N}"
echo ""
echo "  Cambios desde ${ULTIMO:-el inicio} (${#COMMITS[@]}):"
printf '    · %s\n' "${COMMITS[@]}"
echo ""

if [ -z "$ULTIMO" ]; then
  # Primer release: se publica la versión que ya tiene package.json.
  NUEVA=$ACTUAL
  echo "  Sin tags previos: se publica ${G}v$NUEVA${N} tal cual."
else
  linea() {
    local n=$1 t=$2 desc=$3 marca=""
    [ "$t" = "$SUGERIDO" ] && marca="  ${G}← sugerido${N}"
    [ -n "$TIPO" ] && [ "$t" = "$TIPO" ] && marca="  ${G}← elegido${N}"
    printf "  ${B}%s)${N} %-6s v%s → ${B}v%s${N}   %s%s\n" "$n" "$t" "$ACTUAL" "${SIGUIENTE[$t]}" "$desc" "$marca"
  }
  linea 1 patch "correcciones y retoques"
  linea 2 minor "funciones nuevas"
  linea 3 major "cambios incompatibles"
  echo ""

  if [ "$SECO" = 1 ]; then
    echo "${C}  Vista previa: no se ha tocado nada.${N}"
    echo ""
    echo "$NOTAS"
    exit 0
  fi

  if [ -z "$TIPO" ]; then
    [ -t 0 ] || falla "Indica el tipo: make release tipo=patch|minor|major"
    read -r -p "  Elige 1, 2 o 3 [Enter = $SUGERIDO]: " r
    case "$r" in
      1|patch|parche) TIPO=patch ;;
      2|minor) TIPO=minor ;;
      3|major) TIPO=major ;;
      "") TIPO=$SUGERIDO ;;
      *) falla "Opción no válida: $r" ;;
    esac
  fi
  NUEVA=${SIGUIENTE[$TIPO]}
fi

[ "$SECO" = 1 ] && { echo "$NOTAS"; exit 0; }

if git rev-parse -q --verify "refs/tags/v$NUEVA" >/dev/null || git ls-remote --exit-code --tags origin "v$NUEVA" >/dev/null; then
  falla "El tag v$NUEVA ya existe."
fi

if [ -t 0 ]; then
  read -r -p "  ¿Publicar ${B}v$NUEVA${N} y desplegar? [s/N] " r
  [[ $r =~ ^[sSyY] ]] || { echo "  Cancelado: no se ha tocado nada."; exit 0; }
fi
echo ""

# ---------------------------------------------------------------- publicación

paso 1 "Typecheck y pruebas..."
npm run typecheck --silent
npm run test --silent >/dev/null 2>&1 || falla "Las pruebas fallan. Míralas con: make test"

paso 2 "Subiendo la versión a v$NUEVA..."
# npm version actualiza package.json y package-lock.json a la vez.
[ "$NUEVA" = "$ACTUAL" ] || npm version "$NUEVA" --no-git-tag-version >/dev/null
deshacer() { git checkout -q -- package.json package-lock.json; }

paso 3 "Compilando con la versión nueva..."
LOG=$(mktemp)
if ! npm run build >"$LOG" 2>&1; then
  tail -n 30 "$LOG"
  deshacer
  falla "La compilación falló; package.json restaurado. Log completo: $LOG"
fi

paso 4 "Commit y tag v$NUEVA..."
git add package.json package-lock.json
git commit -q --allow-empty -m "release: v$NUEVA"
# verbatim: si no, git toma los «### …» de las notas por comentarios y los borra.
git tag -a --cleanup=verbatim "v$NUEVA" -m "Release v$NUEVA" -m "$NOTAS"

paso 5 "Subiendo a GitHub..."
if ! git push -q origin "$RAMA" --follow-tags; then
  falla "GitHub rechazó el push. Para dejarlo como estaba:
   git tag -d v$NUEVA && git reset --hard origin/$RAMA"
fi

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  CUERPO="$NOTAS"
  [ -n "$ULTIMO" ] && CUERPO+=$'\n\n'"**Comparar:** https://github.com/$REPO/compare/$ULTIMO...v$NUEVA"
  gh release create "v$NUEVA" --title "v$NUEVA" --notes "$CUERPO" --verify-tag >/dev/null \
    && ok "Release publicado en GitHub" \
    || aviso "No se pudo crear el release en GitHub; el tag sí está subido."
else
  aviso "gh no disponible: no se creó el release en GitHub."
fi

paso 6 "Poniendo $INTEGRACION al día..."
# Sin esto develop no tendría el commit de release y enseñaría la versión vieja.
if git ls-remote --exit-code --heads origin "$INTEGRACION" >/dev/null; then
  git fetch -q origin "$INTEGRACION"
  if git merge-base --is-ancestor "origin/$INTEGRACION" HEAD; then
    if git push -q origin "HEAD:$INTEGRACION"; then
      # La rama local solo se mueve si no tiene trabajo propio.
      if git show-ref -q --verify "refs/heads/$INTEGRACION" && git merge-base --is-ancestor "$INTEGRACION" HEAD; then
        git branch -f "$INTEGRACION" HEAD
      fi
      ok "$INTEGRACION apunta a v$NUEVA"
    else
      aviso "No se pudo actualizar origin/$INTEGRACION; hazlo con: git push origin $RAMA:$INTEGRACION"
    fi
  else
    aviso "$INTEGRACION tiene cambios que aún no están en $RAMA; no se toca. Para llevarle la versión:
   git checkout $INTEGRACION && git merge $RAMA && git push"
  fi
fi

echo ""
make --no-print-directory deploy || aviso "El release está publicado; despliega cuando configures el hook."

echo ""
ok "Release v$NUEVA completado"
echo "${C}  https://github.com/$REPO/releases/tag/v$NUEVA${N}"
echo ""
