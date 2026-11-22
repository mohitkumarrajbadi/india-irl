# India IRL / OMMO — common workflows
# Usage: make <target>   |   make help

.PHONY: help install env setup \
	dev dev-web relay \
	check typecheck test prod-check \
	build start start-prod \
	clean clean-deps \
	deploy-relay

.DEFAULT_GOAL := help

NPM ?= npm
NODE ?= node

##@ Setup

help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} \
		/^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 4) } \
		/^[a-zA-Z0-9_.-]+:.*?##/ { printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

install: ## Install workspace dependencies
	$(NPM) install

env: ## Copy .env.example → .env.local if missing
	@test -f .env.local || (cp .env.example .env.local && echo "Created .env.local")
	@test -f .env.local && echo ".env.local ready"

setup: install env ## Install deps + ensure .env.local

##@ Develop

dev: ## Web (localhost:3000) + relay (ws://localhost:8787)
	$(NPM) run dev

dev-web: ## Next.js only (no relay; same-browser tabs OK)
	$(NPM) run dev:web

relay: ## Multiplayer relay only (port 8787)
	$(NPM) run relay

##@ Quality

check: ## Run unit / world / collision tests
	$(NPM) run check

typecheck: ## TypeScript check (web workspace)
	$(NPM) run typecheck

test: check ## Alias for check

prod-check: ## Typecheck + production build (pre-deploy gate)
	$(NPM) run prod:check

##@ Production local

build: ## Production Next.js build
	$(NPM) run build

start: ## Serve last production build
	$(NPM) run start

start-prod: ## Serve build with NODE_ENV=production
	$(NPM) run start:prod

##@ Deploy helpers

deploy-relay: ## Deploy WebSocket relay to Fly.io (ommo-relay)
	fly deploy -c fly.relay.toml --ha=false

##@ Clean

clean: ## Remove Next.js build output
	rm -rf apps/web/.next apps/web/out

clean-deps: ## Remove node_modules (all workspaces)
	rm -rf node_modules apps/*/node_modules packages/*/node_modules
