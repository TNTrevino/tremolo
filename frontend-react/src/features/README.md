# Features

This directory contains all feature-specific code organized by domain.

Each feature is self-contained with its own components, hooks, services, types, and business logic.

## Feature Modules

### auth/

Authentication and user management

- Login, Signup, Account management
- Protected routes and authorization
- User session handling

### note-game/

Note identification game

- Interactive note recognition exercises
- Score tracking and progress monitoring
- Game state management

### dashboard/

User dashboard and analytics

- Progress statistics and charts
- Activity overview
- Quick access to exercises

### sheet-music/

Sheet music display and generation

- MusicXML rendering with OpenSheetMusicDisplay
- Music generation integration
- File conversion utilities

## Feature Structure

Each feature follows this standard structure:

```
feature-name/
├── components/     # Feature-specific UI components
├── hooks/          # Custom React hooks for this feature
├── services/       # API calls and external integrations
├── types/          # TypeScript types and interfaces
└── validation/     # Form validation schemas (if needed)
```

## Guidelines

- Features should be as independent as possible
- Shared code goes in `src/shared/`
- API clients go in `src/services/api/`
- Global state stores go in `src/stores/`
