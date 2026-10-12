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
	@echo "    sync m='msg'    Pull + commit + push en un solo paso"
	@echo "    status          Muestra el estado del repositorio"
	@echo "    log             Muestra los últimos commits"
	@echo ""
	@echo "$(YELLOW)  🚀 Versionado & Release:$(NC)"
	@echo "    version         Ver la versión actual y el último tag"
	@echo "    release         Bump patch  (0.1.0 -> 0.1.1) + tag + push"
	@echo "    release-minor   Bump minor  (0.1.0 -> 0.2.0) + tag + push"
	@echo "    release-major   Bump major  (0.1.0 -> 1.0.0) + tag + push"
	@echo ""
	@echo "$(YELLOW)  🩺 Despliegue:$(NC)"
	@echo "    deploy          Lanza un despliegue en Vercel (Deploy Hook)"
	@echo "    health URL=...  Consulta /api/health de un despliegue"
	@echo ""
	@echo "$(YELLOW)  💡 Ejemplos:$(NC)"
	@echo "    make dev"
	@echo "    make lan                      # para entrar desde el móvil"
	@echo "    make push m='fix: corrijo el suelo'"
	@echo "    make release-minor"
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

# $(1) = parte a subir: major | minor | patch
define do_release
	@if [ -n "$$(git status --porcelain)" ]; then \
		echo "$(RED)❌ Hay cambios sin commitear. Commitea o descarta antes de publicar.$(NC)"; \
		git status --short; \
		exit 1; \
	fi
	@$(MAKE) --no-print-directory lint
	@CUR=$$(git describe --tags --abbrev=0 2>/dev/null); \
	NEW=$$(node -e "const v=require('./package.json').version; \
		if (!process.argv[1]) { console.log(v); process.exit(0); } \
		const [a,b,c]=v.split('.').map(Number); const p='$(1)'; \
		console.log(p==='major'?[a+1,0,0].join('.'):p==='minor'?[a,b+1,0].join('.'):[a,b,c+1].join('.'))" \
		"$$CUR"); \
	NEW_TAG=v$$NEW; \
	echo ""; \
	echo "$(CYAN)╔════════════════════════════════════════════════════════════╗$(NC)"; \
	echo "$(CYAN)║                  RELEASE - INICIANDO                       ║$(NC)"; \
	echo "$(CYAN)╚════════════════════════════════════════════════════════════╝$(NC)"; \
	echo ""; \
	if [ -z "$$CUR" ]; then \
		echo "$(YELLOW)  Sin tags previos: se publica la versión de package.json$(NC)"; \
	else \
		echo "$(YELLOW)  Versión actual : $$CUR$(NC)"; \
	fi; \
	echo "$(GREEN)  Nueva versión  : $$NEW_TAG$(NC)"; \
	echo ""; \
	if git rev-parse "$$NEW_TAG" >/dev/null 2>&1; then \
		echo "$(RED)❌ El tag $$NEW_TAG ya existe.$(NC)"; exit 1; \
	fi; \
	echo "$(YELLOW)[1/4]$(NC) Subiendo la versión en package.json..."; \
	node -e "const f='package.json',fs=require('fs'); \
		const j=JSON.parse(fs.readFileSync(f)); j.version='$$NEW'; \
		fs.writeFileSync(f, JSON.stringify(j,null,2)+'\n')"; \
	echo "$(YELLOW)[2/4]$(NC) Compilando con la versión nueva..."; \
	npm run build >/dev/null || { git checkout -- package.json; \
		echo "$(RED)❌ La compilación falló; package.json restaurado.$(NC)"; exit 1; }; \
	echo "$(YELLOW)[3/4]$(NC) Commiteando y creando el tag..."; \
	git add package.json; \
	git commit -q -m "release: $$NEW_TAG"; \
	git tag -a $$NEW_TAG -m "Release $$NEW_TAG"; \
	echo "$(YELLOW)[4/4]$(NC) Subiendo a GitHub..."; \
	git push -q origin $(BRANCH) --follow-tags; \
	if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then \
		if [ -n "$$CUR" ]; then NOTES=$$(git log $$CUR..$$NEW_TAG --oneline --no-merges); \
		else NOTES="Primera versión publicada."; fi; \
		gh release create $$NEW_TAG --title "$$NEW_TAG" --notes "$$NOTES" \
			>/dev/null && echo "$(GREEN)✓ Release publicado en GitHub$(NC)"; \
	else \
		echo "$(YELLOW)  (gh no disponible: no se creó el release en GitHub)$(NC)"; \
	fi; \
	echo ""; \
	$(MAKE) --no-print-directory deploy || \
		echo "$(YELLOW)  El release está publicado; despliega cuando configures el hook.$(NC)"; \
	echo ""; \
	echo "$(GREEN)✓ Release $$NEW_TAG completado$(NC)"; \
	echo "$(CYAN)  https://github.com/$(REPO)/releases/tag/$$NEW_TAG$(NC)"; \
	echo ""
endef

.PHONY: release
release:
	$(call do_release,patch)

.PHONY: release-minor
release-minor:
	$(call do_release,minor)

.PHONY: release-major
release-major:
	$(call do_release,major)

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
