# ================================================================
#  azul-marcador - Makefile
# ================================================================

APP=azul-marcador
REPO=geomark27/azul-score
PORT?=3000
BRANCH := $(shell git branch --show-current 2>/dev/null || echo "main")
PKG_VERSION = $(shell node -p "require('./package.json').version" 2>/dev/null)

.DEFAULT_GOAL=help

# ================================================================
#  Colores
# ================================================================

CYAN=\033[0;36m
GREEN=\033[0;32m
YELLOW=\033[0;33m
RED=\033[0;31m
NC=\033[0m

# ----------------------------------------------------------------
#  Help
# ----------------------------------------------------------------

.PHONY: help
help:
	@echo ""
	@echo "$(CYAN)  azul-marcador - Marcador para el juego de mesa Azul$(NC)"
	@echo "$(CYAN)  v$(PKG_VERSION)$(NC)"
	@echo ""
	@echo "  Uso: make <comando>"
	@echo ""
	@echo "$(YELLOW)  🔨 Desarrollo:$(NC)"
	@echo "    dev          Servidor de desarrollo (PORT=$(PORT))"
	@echo "    lan          Igual que dev, pero accesible desde el móvil"
	@echo "    build        Compilación de producción"
	@echo "    start        Sirve la compilación (requiere build previo)"
	@echo "    clean        Borra .next, .tmp y node_modules/.cache"
	@echo "    install      Instala las dependencias"
	@echo ""
	@echo "$(YELLOW)  🧪 Calidad de código:$(NC)"
	@echo "    typecheck    Comprueba los tipos (tsc --noEmit)"
	@echo "    test         Ejecuta las pruebas de lib/"
	@echo "    lint         typecheck + test"
	@echo "    check        lint + build (lo mismo que valida el release)"
	@echo ""
	@echo "$(YELLOW)  📦 Git ($(BRANCH)):$(NC)"
	@echo "    push m='msg'    Agrega, commitea y pushea a origin/$(BRANCH)"
	@echo "    pull            Hace pull desde origin/$(BRANCH)"
	@echo "    actualizar      Cambia a develop y la trae al día desde origin"
	@echo "    actualizar rama=...  Igual, con otra rama (main, feat/…)"
	@echo "    sync m='msg'    Pull + commit + push en un solo paso"
	@echo "    status          Muestra el estado del repositorio"
	@echo "    log             Muestra los últimos commits"
	@echo ""
	@echo "$(YELLOW)  🚀 Versionado & Release:$(NC)"
	@echo "    version           Ver la versión actual y el último tag"
	@echo "    release-preview   Qué entraría en la versión y qué tipo se sugiere"
	@echo "    release           Pregunta el tipo (patch, minor o major) y publica"
	@echo "    release tipo=...  Igual, sin preguntar el tipo"
	@echo "    release-patch     0.1.0 -> 0.1.1   correcciones y retoques"
	@echo "    release-minor     0.1.0 -> 0.2.0   funciones nuevas"
	@echo "    release-major     0.1.0 -> 1.0.0   cambios incompatibles"
	@echo "    (los releases salen de main y dejan develop al día)"
	@echo ""
	@echo "$(YELLOW)  🩺 Despliegue:$(NC)"
	@echo "    deploy          Lanza un despliegue en Vercel (Deploy Hook)"
	@echo "    health URL=...  Consulta /api/health de un despliegue"
	@echo ""
	@echo "$(YELLOW)  💡 Ejemplos:$(NC)"
	@echo "    make dev"
	@echo "    make lan                      # para entrar desde el móvil"
	@echo "    make actualizar rama=main     # ir a main y traerla al día"
	@echo "    make push m='fix: corrijo el suelo'"
	@echo "    make release-preview          # mirar antes de publicar"
	@echo "    make release                  # elige el tipo en un menú"
	@echo "    make health URL=https://azul-score.vercel.app"
	@echo ""

# ----------------------------------------------------------------
#  Desarrollo
# ----------------------------------------------------------------

.PHONY: install
install:
	@echo "$(YELLOW)Instalando dependencias...$(NC)"
	@npm install
	@echo "$(GREEN)✓ Listo$(NC)"

.PHONY: dev
dev:
	@npm run dev -- -p $(PORT)

.PHONY: lan
lan:
	@echo "$(CYAN)Escuchando en todas las interfaces. Desde el móvil, en la misma red:$(NC)"
	@IP=$$(hostname -I 2>/dev/null | awk '{print $$1}'); echo "$(GREEN)  http://$$IP:$(PORT)$(NC)"; echo ""
	@npm run dev -- -H 0.0.0.0 -p $(PORT)

.PHONY: build
build:
	@echo "$(YELLOW)Compilando v$(PKG_VERSION)...$(NC)"
	@npm run build
	@echo "$(GREEN)✓ Compilado$(NC)"

.PHONY: start
start:
	@npm run start -- -p $(PORT)

.PHONY: clean
clean:
	@echo "$(YELLOW)Limpiando...$(NC)"
	@rm -rf .next .tmp node_modules/.cache tsconfig.tsbuildinfo
	@echo "$(GREEN)✓ Listo$(NC)"

# ----------------------------------------------------------------
#  Calidad de código
# ----------------------------------------------------------------

.PHONY: typecheck
typecheck:
	@echo "$(YELLOW)Comprobando tipos...$(NC)"
	@npm run typecheck --silent
	@echo "$(GREEN)✓ Sin errores de tipos$(NC)"

.PHONY: test
test:
	@echo "$(YELLOW)Ejecutando pruebas...$(NC)"
	@npm run test --silent

.PHONY: lint
lint: typecheck test

.PHONY: check
check: lint build

# ================================================================
#  Git
# ================================================================

.PHONY: push
push:
	@if [ -z "$(m)" ]; then \
		echo "$(RED)❌ Error: Debes proporcionar un mensaje$(NC)"; \
		echo "   Uso: make push m='tu mensaje de commit'"; \
		exit 1; \
	fi
	@echo "$(YELLOW)📦 Agregando archivos...$(NC)"
	@git add .
	@echo "$(YELLOW)✏️  Commiteando: $(m)$(NC)"
	@git commit -m "$(m)"
	@echo "$(YELLOW)🚀 Pusheando a origin/$(BRANCH)...$(NC)"
	@git push origin $(BRANCH)
	@echo "$(GREEN)✓ Push completado!$(NC)"

.PHONY: pull
pull:
	@echo "$(YELLOW)⬇️  Pulling desde origin/$(BRANCH)...$(NC)"
	@git fetch origin
	@git pull origin $(BRANCH)
	@echo "$(GREEN)✓ Pull completado!$(NC)"

# Rama para «make actualizar»: por defecto develop, que es donde se integra todo.
rama?=develop

.PHONY: actualizar
actualizar:
	@bash scripts/actualizar-rama.sh "$(rama)"

.PHONY: sync
sync:
	@if [ -z "$(m)" ]; then \
		echo "$(RED)❌ Error: Debes proporcionar un mensaje$(NC)"; \
		echo "   Uso: make sync m='tu mensaje de commit'"; \
		exit 1; \
	fi
	@echo "$(YELLOW)⬇️  Pulling cambios...$(NC)"
	@git pull origin $(BRANCH)
	@echo "$(YELLOW)📦 Agregando archivos...$(NC)"
	@git add .
	@echo "$(YELLOW)✏️  Commiteando: $(m)$(NC)"
	@git commit -m "$(m)"
	@echo "$(YELLOW)🚀 Pusheando a origin/$(BRANCH)...$(NC)"
	@git push origin $(BRANCH)
	@echo "$(GREEN)✓ Sincronización completada!$(NC)"

.PHONY: status
status:
	@echo "$(CYAN)📊 Estado de Git (rama: $(BRANCH)):$(NC)"
	@echo ""
	@git status

.PHONY: log
log:
	@echo "$(CYAN)📋 Últimos commits (rama: $(BRANCH)):$(NC)"
	@echo ""
	@git log --oneline -10

# ================================================================
#  Versionado & Release
# ================================================================

.PHONY: version
version:
	@TAG=$$(git describe --tags --abbrev=0 2>/dev/null || echo "sin tags"); \
	echo ""; \
	echo "$(CYAN)  package.json : v$(PKG_VERSION)$(NC)"; \
	echo "$(CYAN)  último tag   : $$TAG$(NC)"; \
	echo "$(CYAN)  commit       : $$(git rev-parse --short HEAD 2>/dev/null)$(NC)"; \
	if [ "$$TAG" != "v$(PKG_VERSION)" ] && [ "$$TAG" != "sin tags" ]; then \
		echo "$(YELLOW)  ⚠ package.json y el tag no coinciden$(NC)"; \
	fi; \
	echo ""

# La lógica vive en scripts/release.sh: comprueba que estás en main al día con
# origin, pasa typecheck y pruebas, sube la versión, compila, crea commit y tag,
# publica el release en GitHub, pone develop al día y despliega.
# Tipo para «make release»: patch | minor | major. Vacío = pregunta con un menú.
tipo?=

.PHONY: release release-patch release-minor release-major release-preview
release:
	@bash scripts/release.sh $(tipo)

release-patch:
	@bash scripts/release.sh patch

release-minor:
	@bash scripts/release.sh minor

release-major:
	@bash scripts/release.sh major

release-preview:
	@bash scripts/release.sh $(tipo) --dry-run

# ================================================================
#  Despliegue
# ================================================================

# El Deploy Hook es una URL privada: quien la tenga puede lanzar despliegues.
# Nunca va al repo. Se lee de $$VERCEL_DEPLOY_HOOK o del fichero (ignorado por git).
HOOK_FILE=.vercel-deploy-hook

.PHONY: deploy
deploy:
	@HOOK="$${VERCEL_DEPLOY_HOOK:-$$(cat $(HOOK_FILE) 2>/dev/null)}"; \
	if [ -z "$$HOOK" ]; then \
		echo "$(RED)❌ No hay Deploy Hook configurado.$(NC)"; \
		echo ""; \
		echo "   1. En Vercel: Settings → Git → Deploy Hooks"; \
		echo "   2. Crea uno para la rama $(CYAN)main$(NC) y copia la URL"; \
		echo "   3. Guárdala (queda fuera de git):"; \
		echo "      $(CYAN)echo 'URL_DEL_HOOK' > $(HOOK_FILE)$(NC)"; \
		echo ""; \
		exit 1; \
	fi; \
	echo "$(YELLOW)🚀 Pidiendo despliegue a Vercel...$(NC)"; \
	if curl -fsS -X POST "$$HOOK" -o /dev/null; then \
		echo "$(GREEN)✓ Despliegue solicitado$(NC)"; \
	else \
		echo "$(RED)❌ Vercel no aceptó la petición (¿hook caducado?)$(NC)"; \
		exit 1; \
	fi

.PHONY: health
health:
	@if [ -z "$(URL)" ]; then \
		echo "$(RED)❌ Error: Debes indicar la URL$(NC)"; \
		echo "   Uso: make health URL=https://tu-app.vercel.app"; \
		exit 1; \
	fi
	@echo "$(CYAN)🩺 Consultando $(URL)/api/health$(NC)"
	@echo ""
	@curl -fsS "$(URL)/api/health" | node -e \
		"let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.stringify(JSON.parse(s),null,2)))" \
		|| echo "$(RED)❌ El despliegue no respondió correctamente (mira el campo 'aviso').$(NC)"
	@echo ""
