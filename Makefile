.PHONY: help \
	test test-frontend test-music test-go \
	lint lint-frontend lint-music lint-go \
	format format-frontend format-music format-go \
	check check-frontend check-music check-go \
	build-frontend

help:
	@echo "Targets:"
	@echo "  test              run all test suites (frontend, music, go)"
	@echo "  test-frontend     vitest single run"
	@echo "  test-music        pytest (backend/music)"
	@echo "  test-go           go test ./... (backend/main)"
	@echo ""
	@echo "  lint              run all linters"
	@echo "  lint-frontend     eslint --max-warnings 0"
	@echo "  lint-music        flake8"
	@echo "  lint-go           go vet + golangci-lint"
	@echo ""
	@echo "  format            apply all formatters"
	@echo "  format-frontend   prettier --write"
	@echo "  format-music      black ."
	@echo "  format-go         gofmt -s -w ."
	@echo ""
	@echo "  check             lint + test everything (CI equivalent)"
	@echo "  check-frontend    build + lint + test (frontend)"
	@echo "  check-music       lint + test (music)"
	@echo "  check-go          fmt-check + vet + lint + test (go)"

# ---- frontend ----

test-frontend:
	cd frontend && npm run test:run

lint-frontend:
	cd frontend && npm run lint

format-frontend:
	cd frontend && npm run format

build-frontend:
	cd frontend && npm run build

check-frontend: build-frontend lint-frontend test-frontend

# ---- backend/music ----

test-music:
	cd backend/music && . env/bin/activate && pytest

lint-music:
	cd backend/music && . env/bin/activate && flake8

format-music:
	cd backend/music && . env/bin/activate && black .

check-music: format-music lint-music test-music

# ---- backend/main ----

test-go:
	cd backend/main && go test ./... -race

lint-go:
	cd backend/main && go vet ./... && golangci-lint run

format-go:
	cd backend/main && gofmt -s -w .

check-go: format-go lint-go test-go

# ---- aggregate ----

test: test-frontend test-music test-go

lint: lint-frontend lint-music lint-go

format: format-frontend format-music format-go

check: check-frontend check-music check-go
