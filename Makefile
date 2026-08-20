.PHONY: help \
	test test-frontend test-react test-music test-go test-api \
	lint lint-frontend lint-react lint-music lint-go vet-go \
	format format-frontend format-react format-music format-go \
	format-check format-check-frontend format-check-react \
	format-check-music format-check-go \
	check check-frontend check-react check-music check-go \
	build-frontend build-react

# ---- pretty output ----
# $(call banner,MESSAGE) prints "[ STEP ] MESSAGE". STEP is passed down by the
# aggregate targets (e.g. STEP=1/4); it defaults to a bullet for lone runs.
STEP ?= •
banner = printf '\033[1m\033[36m[ %s ]\033[0m %s\n' '$(STEP)' '$(1)'

help:
	@echo "Targets:"
	@echo "  test                   run all suites (frontend, react, music, go)"
	@echo "  test-frontend          vitest single run (Angular, frontend/)"
	@echo "  test-react             vitest single run (React, frontend-react/)"
	@echo "  test-music             pytest (backend/music)"
	@echo "  test-go                go test ./... -race (backend/main)"
	@echo "  test-api               kulala HTTP smoke tests (needs the service running)"
	@echo ""
	@echo "  lint                   run all linters"
	@echo "  lint-frontend          ng lint --max-warnings 0 (Angular)"
	@echo "  lint-react             eslint --max-warnings 0 (React)"
	@echo "  lint-music             flake8"
	@echo "  lint-go                go vet + golangci-lint"
	@echo ""
	@echo "  format                 apply all formatters (mutates files)"
	@echo "  format-frontend        prettier --write"
	@echo "  format-music           black ."
	@echo "  format-go              gofmt -s -w ."
	@echo ""
	@echo "  format-check           verify formatting without changing files"
	@echo ""
	@echo "  check                  format-check + lint + test everything;"
	@echo "                         never mutates -- this is what CI runs"
	@echo "  check-frontend         format-check + lint + test + build"
	@echo "  check-music            format-check + lint + test"
	@echo "  check-go               format-check + vet + golangci-lint + test"

# ---- frontend (Angular -- frontend/) ----
# The migration target. See frontend/.migration/ for the plan and ledger.

test-frontend:
	@$(call banner,Testing frontend (vitest)...)
	cd frontend && npm run test:run

lint-frontend:
	@$(call banner,Linting frontend (ng lint)...)
	cd frontend && npm run lint

format-frontend:
	@$(call banner,Formatting frontend (prettier)...)
	cd frontend && npm run format

format-check-frontend:
	@$(call banner,Checking frontend formatting (prettier)...)
	cd frontend && npm run format:check

build-frontend:
	@$(call banner,Building frontend (ng build)...)
	cd frontend && npm run build

check-frontend: format-check-frontend lint-frontend test-frontend build-frontend

# ---- frontend-react (React -- frontend-react/) ----
# The outgoing app. It stays runnable and checked until Phase 7 of the
# migration deletes it: it is the executable spec that the parity harness
# (frontend/e2e/) and the screenshot baselines were captured from.

test-react:
	@$(call banner,Testing react frontend (vitest)...)
	cd frontend-react && npm run test:run

lint-react:
	@$(call banner,Linting react frontend (eslint)...)
	cd frontend-react && npm run lint

format-react:
	@$(call banner,Formatting react frontend (prettier)...)
	cd frontend-react && npm run format

format-check-react:
	@$(call banner,Checking react frontend formatting (prettier)...)
	cd frontend-react && npm run format:check

build-react:
	@$(call banner,Building react frontend (tsc + vite)...)
	cd frontend-react && npm run build

check-react: format-check-react lint-react test-react build-react

# ---- backend/music ----

# Activate the venv when present (local dev); CI installs deps into the
# system environment, where there is no venv to activate.
MUSIC_RUN = cd backend/music && { [ -f env/bin/activate ] && . env/bin/activate || true; } &&

test-music:
	@$(call banner,Testing music service (pytest)...)
	$(MUSIC_RUN) pytest

lint-music:
	@$(call banner,Linting music service (flake8)...)
	$(MUSIC_RUN) flake8 . --count --statistics

format-music:
	@$(call banner,Formatting music service (black)...)
	$(MUSIC_RUN) black .

format-check-music:
	@$(call banner,Checking music service formatting (black)...)
	$(MUSIC_RUN) black --check .

check-music: format-check-music lint-music test-music

# ---- backend/main ----

test-go:
	@$(call banner,Testing go service (go test -race + coverage)...)
	cd backend/main && go test ./... -race -coverprofile=coverage.out
	@$(call banner,Go coverage by function...)
	cd backend/main && go tool cover -func=coverage.out

vet-go:
	@$(call banner,Vetting go service (go vet)...)
	cd backend/main && go vet ./...

lint-go: vet-go
	@$(call banner,Linting go service (golangci-lint)...)
	cd backend/main && golangci-lint run

format-go:
	@$(call banner,Formatting go service (gofmt)...)
	cd backend/main && gofmt -s -w .

format-check-go:
	@$(call banner,Checking go service formatting (gofmt)...)
	@cd backend/main && \
	files="$$(gofmt -s -l .)" && \
	if [ -n "$$files" ]; then \
		echo "gofmt needed on:"; echo "$$files"; exit 1; \
	else \
		echo "gofmt: all files formatted"; \
	fi

check-go: format-check-go lint-go test-go

# ---- API smoke tests (kulala) ----
# End-to-end HTTP tests against a RUNNING service (default :5001). Unlike
# the other targets these need the service up and a reachable database,
# so they're deliberately kept out of the aggregate `check`/`test`; the
# api-smoke workflow (and local devs) boot the service, then call this.
# KULALA is pinned so CI is reproducible; override with `make test-api
# KULALA=kulala` to use a globally installed CLI.
KULALA ?= npx --yes @mistweaverco/kulala-cli@0.13.1

test-api:
	@$(call banner,Testing API (kulala smoke tests)...)
	cd backend/main/apitests && $(KULALA) run --tests --halt --env local .

# ---- aggregate ----
# Each leaf runs via a recursive make so we can number the steps ([ 1/3 ] ...).

test:
	@$(MAKE) --no-print-directory test-frontend STEP=1/4
	@$(MAKE) --no-print-directory test-react    STEP=2/4
	@$(MAKE) --no-print-directory test-music    STEP=3/4
	@$(MAKE) --no-print-directory test-go       STEP=4/4

lint:
	@$(MAKE) --no-print-directory lint-frontend STEP=1/4
	@$(MAKE) --no-print-directory lint-react    STEP=2/4
	@$(MAKE) --no-print-directory lint-music    STEP=3/4
	@$(MAKE) --no-print-directory lint-go       STEP=4/4

format:
	@$(MAKE) --no-print-directory format-frontend STEP=1/4
	@$(MAKE) --no-print-directory format-react    STEP=2/4
	@$(MAKE) --no-print-directory format-music    STEP=3/4
	@$(MAKE) --no-print-directory format-go       STEP=4/4

format-check:
	@$(MAKE) --no-print-directory format-check-frontend STEP=1/4
	@$(MAKE) --no-print-directory format-check-react    STEP=2/4
	@$(MAKE) --no-print-directory format-check-music    STEP=3/4
	@$(MAKE) --no-print-directory format-check-go       STEP=4/4

check:
	@$(MAKE) --no-print-directory check-frontend STEP=1/4
	@$(MAKE) --no-print-directory check-react    STEP=2/4
	@$(MAKE) --no-print-directory check-music    STEP=3/4
	@$(MAKE) --no-print-directory check-go       STEP=4/4
