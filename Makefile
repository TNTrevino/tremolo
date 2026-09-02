.PHONY: help \
	test test-frontend test-music test-go test-api test-api-music \
	lint lint-frontend lint-music lint-go vet-go \
	format format-frontend format-music format-go \
	format-check format-check-frontend format-check-music format-check-go \
	check check-frontend check-music check-go \
	build-frontend build-music build-go build-hardware openapi-go

# ---- pretty output ----
# $(call banner,MESSAGE) prints "[ STEP ] MESSAGE". STEP is passed down by the
# aggregate targets (e.g. STEP=1/3); it defaults to a bullet for lone runs.
STEP ?= •
banner = printf '\033[1m\033[36m[ %s ]\033[0m %s\n' '$(STEP)' '$(1)'

help:
	@echo "Targets:"
	@echo "  test                   run all suites (frontend, music, go)"
	@echo "  test-frontend          ng test single run (frontend/)"
	@echo "  test-music             pytest (music-api)"
	@echo "  test-go                go test ./... -race (core-api)"
	@echo "  test-api               kulala HTTP smoke tests (needs the service running)"
	@echo "  test-api-music         kulala HTTP smoke tests for music-api (needs the service running)"
	@echo ""
	@echo "  lint                   run all linters"
	@echo "  lint-frontend          ng lint --max-warnings 0"
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
	@echo "  check                  format-check + lint + build + test everything;"
	@echo "                         never mutates -- this is what CI runs"
	@echo "  check-frontend         format-check + lint + build + test"
	@echo "  check-music            format-check + lint + build + test"
	@echo "  check-go               format-check + vet + golangci-lint + build + test"
	@echo ""
	@echo "  openapi-go             regenerate core-api/openapi/swagger.{json,yaml}"
	@echo ""
	@echo "  build-hardware         render the keyboard-overlay STLs + previews (openscad)"

# ---- frontend (Angular -- frontend/) ----
# The app. It was migrated from React in 2026; frontend/.migration/ holds the
# plan, the phase ledger and the parity report, and frontend/e2e/ holds the
# regression suite that migration left behind.

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

check-frontend: format-check-frontend lint-frontend build-frontend test-frontend

# ---- music-api ----

# Activate the venv when present (local dev); CI installs deps into the
# system environment, where there is no venv to activate.
MUSIC_RUN = cd music-api && { [ -f env/bin/activate ] && . env/bin/activate || true; } &&

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

# There is no compiled artifact to produce -- this is the closest analog to
# `go build`/`ng build`: it imports the exact object gunicorn serves in prod
# (wsgi_app = "main:app" in gunicorn_config.py), so a missing symbol or
# broken import fails here instead of only surfacing at deploy/start time.
build-music:
	@$(call banner,Building music service (import check)...)
	$(MUSIC_RUN) python -c "from main import app"

check-music: format-check-music lint-music build-music test-music

# ---- core-api ----

test-go:
	@$(call banner,Testing go service (go test -race + coverage)...)
	cd core-api && go test ./... -race -coverprofile=coverage.out
	@$(call banner,Go coverage by function...)
	cd core-api && go tool cover -func=coverage.out

vet-go:
	@$(call banner,Vetting go service (go vet)...)
	cd core-api && go vet ./...

lint-go: vet-go
	@$(call banner,Linting go service (golangci-lint)...)
	cd core-api && golangci-lint run

# gofumpt, not gofmt: it is a strict superset of `gofmt -s` (every -s
# simplification plus its own rules), and the one rule that matters here is
# that it splits imports into a stdlib group and everything else. The version
# is pinned by the `tool` directive in core-api/go.mod, so `go tool` and the
# pre-commit hook and CI can never run three different gofumpts.
format-go:
	@$(call banner,Formatting go service (gofumpt)...)
	cd core-api && go tool gofumpt -w .

format-check-go:
	@$(call banner,Checking go service formatting (gofumpt)...)
	@cd core-api && \
	files="$$(go tool gofumpt -l .)" && \
	if [ -n "$$files" ]; then \
		echo "gofumpt needed on:"; echo "$$files"; exit 1; \
	else \
		echo "gofumpt: all files formatted"; \
	fi

# Builds the whole package, matching what deploy.yml ships. Naming a single
# file (`go build main.go`) compiles only that file and silently ignores
# every sibling file in the package -- `.` builds the package as a whole,
# so a symbol defined in another file (e.g. server.go) is actually seen.
build-go:
	@$(call banner,Building go service (go build)...)
	cd core-api && go build -o tremolo-api .

check-go: format-check-go lint-go build-go test-go

# Regenerates core-api/openapi/{swagger.json,swagger.yaml} from the swag
# annotations on each handler (controllers/*.go) plus the general API info
# in main.go. swag is pinned by the `tool` directive in core-api/go.mod, so
# `go tool swag` needs no separate install. Mutates files, like format-go --
# CI verifies the result is committed via a `git diff --exit-code` step.
# --parseDependency is needed because DTOs live in a separate package from
# the handlers that reference them in @Param/@Success/@Failure.
openapi-go:
	@$(call banner,Generating core API OpenAPI spec...)
	cd core-api && go tool swag init -g main.go --output openapi --outputTypes json,yaml --parseDependency

# ---- hardware (OpenSCAD -- hardware/keyboard-overlay/) ----
# Renders the printable STLs and the preview images from overlay.scad.
# The STL exports are pure geometry; the PNG previews need a GL context,
# so the hardware workflow wraps this target in xvfb-run on the headless
# runner. Locally, plain `make build-hardware` works.
OPENSCAD ?= openscad
HW_DIR = hardware/keyboard-overlay
HW_IMG = --imgsize=1400,900 --autocenter --viewall

build-hardware:
	@$(call banner,Rendering keyboard overlay (openscad)...)
	cd $(HW_DIR) && $(OPENSCAD) -o coupon.stl  -D 'mode="coupon"' overlay.scad
	cd $(HW_DIR) && $(OPENSCAD) -o overlay.stl -D 'mode="full"'   overlay.scad
	cd $(HW_DIR) && $(OPENSCAD) -o preview-use.png   $(HW_IMG) -D 'mode="full"' -D 'orient="use"' overlay.scad
	cd $(HW_DIR) && $(OPENSCAD) -o preview-print.png $(HW_IMG) -D 'mode="full"' overlay.scad

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
	@cd core-api/apitests && \
	for dir in */; do \
		$(KULALA) run --tests --halt --env local "$$dir" || exit 1; \
	done

# music-api needs no database and no env vars, just `fastapi dev main.py`
# running on :8000 -- see music-api/apitests/README.md.
test-api-music:
	@$(call banner,Testing music API (kulala smoke tests)...)
	cd music-api/apitests && $(KULALA) run --tests --halt --env local .

# ---- aggregate ----
# Each leaf runs via a recursive make so we can number the steps ([ 1/3 ] ...).

test:
	@$(MAKE) --no-print-directory test-frontend STEP=1/3
	@$(MAKE) --no-print-directory test-music    STEP=2/3
	@$(MAKE) --no-print-directory test-go       STEP=3/3

lint:
	@$(MAKE) --no-print-directory lint-frontend STEP=1/3
	@$(MAKE) --no-print-directory lint-music    STEP=2/3
	@$(MAKE) --no-print-directory lint-go       STEP=3/3

format:
	@$(MAKE) --no-print-directory format-frontend STEP=1/3
	@$(MAKE) --no-print-directory format-music    STEP=2/3
	@$(MAKE) --no-print-directory format-go       STEP=3/3

format-check:
	@$(MAKE) --no-print-directory format-check-frontend STEP=1/3
	@$(MAKE) --no-print-directory format-check-music    STEP=2/3
	@$(MAKE) --no-print-directory format-check-go       STEP=3/3

check:
	@$(MAKE) --no-print-directory check-frontend STEP=1/3
	@$(MAKE) --no-print-directory check-music    STEP=2/3
	@$(MAKE) --no-print-directory check-go       STEP=3/3

## hooks: point git at the repo's pre-commit hook (run once per clone)
hooks:
	git config core.hooksPath .githooks
	@echo "pre-commit hook active from .githooks/"
