# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tremolo is a music education platform designed for students in grades 6-12 to practice sight reading, note recognition, and other musical skills. The application generates dynamic musical exercises using Music21 and displays them using OpenSheetMusicDisplay.

## Architecture

This is a **microservices architecture** with three main components:

### 1. Frontend (React + TypeScript + Vite)
- **Location**: `frontend/`
- **Tech**: React 18, TypeScript, Vite, Material UI, OpenSheetMusicDisplay
- **Purpose**: Web interface for music education exercises
- **Key Service**: `MusicService.tsx` handles all music generation API calls and sheet music rendering via OpenSheetMusicDisplay
- **Routing**: React Router with pages for note games, generated music display, user dashboard, and file conversion

### 2. Music Generation Microservice (Django + Music21)
- **Location**: `backend/music/`
- **Tech**: Django, Django REST Framework, Music21
- **Port**: 8000 (default)
- **Purpose**: Generate MusicXML files for various exercises
- **Key Endpoints**:
  - `/mary` - Generate "Mary Had a Little Lamb" in different keys/octaves
  - `/random` - Generate random notes with specified rhythm patterns
  - `/note-game` - Generate single notes for note identification game
- **Key Files**:
  - `music/views.py` - API endpoints
  - `music/library.py` - Music generation logic
  - `music/dynamic_mary.py` - Dynamic "Mary Had a Little Lamb" generation

### 3. User Tracking Microservice (Go + PostgreSQL)
- **Location**: `backend/main/`
- **Tech**: Go, Gin framework, sqlx, PostgreSQL
- **Port**: 5001 (default)
- **Purpose**: User management, progress tracking, teacher-student relationships
- **Key Packages**:
  - `controllers/` - Route setup
  - `services/` - Business logic for teachers, students, users
  - `database/` - PostgreSQL connection and schema
  - `generation/` - Fake data generation for testing (use `--fake-it` flag)
  - `DTOs/` - Data transfer objects
  - `validations/` - Input validation
- **Database Schema**: Users, Schools, note_game_entries, teacher-student-parent relationships

## Communication Flow

Frontend (React) → Music Generation Service (Django, port 8000) for MusicXML generation
Frontend (React) → User Tracking Service (Go, port 5001) for user data and progress

The frontend uses environment variables `VITE_BACKEND_MUSIC` and `VITE_BACKEND_MAIN` to communicate with the respective backends.

## Common Development Commands

### Environment Setup
Required environment variables:
```bash
export DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<database>"
export DATABASE_USER="<username>"
export DATABASE_PW="<password>"
export VITE_BACKEND_MAIN="http://localhost:5001"
export VITE_BACKEND_MUSIC="http://localhost:8000"
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev          # Start development server
npm run build        # Build for production (runs TypeScript compiler + Vite build)
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Music Generation Service (Django)
```bash
cd backend/music
python3 -m venv env
source env/bin/activate
pip install -r requirements.txt
python3 manage.py migrate          # Run database migrations
python3 manage.py runserver        # Start on port 8000
```

### User Tracking Service (Go)
```bash
cd backend/main
go run main.go                     # Run the service
go run main.go --fake-it           # Run with fake data generation
air                                # Run with hot reload (requires air CLI)
```

The Go service uses Air for hot reloading in development (configured in `.air.toml`).

## Database

The PostgreSQL schema is defined in `backend/main/database/schema.sql`. Key tables:
- `users` - Students, teachers, parents with role-based access
- `schools` - School information
- `note_game_entries` - Performance tracking for note identification game
- `teacher_to_student`, `teacher_to_parent`, `parent_to_child` - Relationship mapping

Database connection is initialized in `backend/main/database/database.go` using the `DATABASE_URL` environment variable.

## Key Technical Details

### Music Generation
- Music is generated as MusicXML format using the Music21 library
- The frontend receives XML strings and renders them using OpenSheetMusicDisplay
- MusicXML is returned with `content_type="application/xml"` from Django endpoints

### Frontend State Management
- No centralized state management (Redux/Zustand) - uses React component state
- Material UI theming configured in `App.tsx` with custom palette

### Go Service Patterns
- Uses `sqlx` for database operations with struct mapping
- Validation handled by `playground/validator`
- Gin framework for HTTP routing
- Database client is a global variable `DBClient` initialized at startup

### Frontend-Backend Integration
- Axios is used for all HTTP requests
- Environment variables set via Vite's `import.meta.env`
- CORS must be configured in Django settings for local development

## Code Quality and Pre-Commit Hooks

This repository uses Husky to enforce code quality standards with pre-commit hooks that automatically run on staged files:

### Frontend Code Formatting
- **Tool**: Prettier (via lint-staged)
- **Trigger**: Runs automatically on staged files in `frontend/`
- **File Types**: `.js`, `.jsx`, `.ts`, `.tsx`, `.css`, `.md`, `.json`
- **Behavior**: Auto-formats files and re-stages them
- **Configuration**: See `frontend/.lintstagedrc.json` for details

### Backend (Python/Django) Code Quality
- **Tools**: Black (formatter) + flake8 (linter)
- **Trigger**: Runs automatically on staged `.py` files in `backend/music/`
- **Behavior**:
  - Black auto-formats files
  - flake8 performs critical error checking
  - Pre-commit fails if flake8 detects critical errors
  - Formatted files are re-staged
- **Setup Required**: Virtual environment (`env/bin/activate`)
- **Location**: See `backend/music/` for setup instructions

### Backend (Go) Code Formatting
- **Tool**: gofmt (standard Go formatter)
- **Trigger**: Runs automatically on staged `.go` files in `backend/main/`
- **Behavior**:
  - Auto-formats all staged Go files
  - Automatically re-stages formatted files
  - No configuration needed (uses Go's standard formatting)
- **Setup Required**: Go installation with `gofmt` available
- **Testing**: Run `bash test-go-hook.sh` to verify the hook works correctly

### Running Hooks Manually
If you need to run a specific formatter outside of git commits:

```bash
# Format all Go files in backend/main
cd backend/main
gofmt -w ./...

# Format specific Go files
gofmt -w file1.go file2.go

# Check formatting without modifying files
gofmt -l ./...
```
