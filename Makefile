.PHONY: help \
	test test-frontend test-music test-go \
	lint lint-frontend lint-music lint-go vet-go \
	format format-frontend format-music format-go \
	format-check format-check-frontend format-check-music format-check-go \
	check check-frontend check-music check-go \
	build-frontend

help:
	@echo "Targets:"
	@echo "  test                   run all test suites (frontend, music, go)"
	@echo "  test-frontend          vitest single run"
	@echo "  test-music             pytest (backend/music)"
	@echo "  test-go                go test ./... -race (backend/main)"
	@echo ""
	@echo "  lint                   run all linters"
	@echo "  lint-frontend          eslint --max-warnings 0"
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

# ---- frontend ----

test-frontend:
	cd frontend && npm run test:run

lint-frontend:
	cd frontend && npm run lint

format-frontend:
	cd frontend && npm run format

format-check-frontend:
	cd frontend && npm run format:check

build-frontend:
	cd frontend && npm run build

check-frontend: format-check-frontend lint-frontend test-frontend build-frontend

# ---- backend/music ----

# Activate the venv when present (local dev); CI installs deps into the
# system environment, where there is no venv to activate.
MUSIC_RUN = cd backend/music && { [ -f env/bin/activate ] && . env/bin/activate || true; } &&

test-music:
	$(MUSIC_RUN) pytest

lint-music:
	$(MUSIC_RUN) flake8 . --count --statistics

format-music:
	$(MUSIC_RUN) black .

format-check-music:
	$(MUSIC_RUN) black --check .

check-music: format-check-music lint-music test-music

# ---- backend/main ----

test-go:
	cd backend/main && go test ./... -race

vet-go:
	cd backend/main && go vet ./...

lint-go: vet-go
	cd backend/main && golangci-lint run

format-go:
	cd backend/main && gofmt -s -w .

format-check-go:
	@echo "cd backend/main && gofmt -s -l ."
	@cd backend/main && \
	files="$$(gofmt -s -l .)" && \
	if [ -n "$$files" ]; then \
		echo "gofmt needed on:"; echo "$$files"; exit 1; \
	else \
		echo "gofmt: all files formatted"; \
	fi

check-go: format-check-go lint-go test-go

# ---- aggregate ----

test: test-frontend test-music test-go

lint: lint-frontend lint-music lint-go

format: format-frontend format-music format-go

format-check: format-check-frontend format-check-music format-check-go

check: check-frontend check-music check-go
