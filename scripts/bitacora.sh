#!/usr/bin/env bash
# Crea la entrada de bitácora de la rama actual a partir de la plantilla.
# Lo llama `make bitacora` (opcional: t='Título de la entrada').
#
#   scripts/bitacora.sh ["Título"]
#
# Si la rama ya tiene entrada, la enseña en vez de crear otra.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

DIR=docs/bitacora/entradas
PLANTILLA=docs/bitacora/plantilla-entrada.md
G=$'\033[0;32m'; Y=$'\033[0;33m'; R=$'\033[0;31m'; C=$'\033[0;36m'; N=$'\033[0m'

RAMA=$(git branch --show-current)
case "$RAMA" in
  ""|main|develop)
    echo "${R}❌ Estás en ${RAMA:-un HEAD suelto}. La entrada se escribe en la rama del cambio (feat/…, fix/…).${N}" >&2
    exit 1 ;;
esac

# ¿Ya hay entrada para esta rama?
EXISTENTE=$(grep -lx "rama: $RAMA" "$DIR"/*.md 2>/dev/null | head -n1 || true)
if [ -n "$EXISTENTE" ]; then
  echo "${Y}⚠ Esta rama ya tiene entrada: ${C}$EXISTENTE${N}"
  echo "   Actualízala en vez de crear otra."
  exit 0
fi

# Tipo según el prefijo de la rama: feat/x → feat. Si no encaja, chore.
TIPO=${RAMA%%/*}
case "$TIPO" in feat|fix|chore|docs|refactor|perf|test) ;; *) TIPO=chore ;; esac

TEMA=${RAMA#*/}
TEMA=$(tr '[:upper:]' '[:lower:]' <<< "$TEMA" | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g')
FECHA=$(date +%F)
AUTOR=$(git config user.name || echo "sin-nombre")
TITULO=${1:-$(sed -E 's/-/ /g' <<< "$TEMA")}

DESTINO="$DIR/$FECHA-$TIPO-$TEMA.md"
mkdir -p "$DIR"

# Sustitución con awk para no pelearse con caracteres especiales en el título.
awk -v f="$FECHA" -v r="$RAMA" -v t="$TIPO" -v a="$AUTOR" -v ti="$TITULO" '{
  gsub(/\{\{FECHA\}\}/, f); gsub(/\{\{RAMA\}\}/, r); gsub(/\{\{TIPO\}\}/, t)
  gsub(/\{\{AUTOR\}\}/, a); gsub(/\{\{TITULO\}\}/, ti); print
}' "$PLANTILLA" > "$DESTINO"

echo "${G}✓ Entrada creada: ${C}$DESTINO${N}"
echo "   Rellena «Qué cambia» y «Por qué» antes de abrir la PR."
