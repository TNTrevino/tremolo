# New Frontend Structure - Migration Guide

This document describes the new feature-based architecture created for the Tremolo frontend migration.

## Created: January 18, 2026

## New Directory Structure

```
new-frontend/src/
├── features/                    # Feature-based modules
│   ├── auth/                   # Authentication & user management
│   │   ├── components/         # Auth-specific UI components
│   │   ├── hooks/              # Auth hooks (useAuth, useLogin, etc.)
│   │   ├── services/           # Auth API services
│   │   ├── types/              # Auth TypeScript types
│   │   └── validation/         # Form validation schemas
│   ├── note-game/              # Note identification game
│   │   ├── components/         # Game UI components
│   │   ├── hooks/              # Game logic hooks
│   │   ├── services/           # Note generation API
│   │   └── types/              # Game state types
│   ├── dashboard/              # User dashboard & analytics
│   │   ├── components/         # Dashboard components
│   │   ├── hooks/              # Dashboard data hooks
│   │   ├── services/           # Stats & progress APIs
│   │   └── types/              # Dashboard types
│   └── sheet-music/            # Sheet music display
│       ├── components/         # Music viewer components
│       ├── hooks/              # Music rendering hooks
│       └── types/              # MusicXML types
├── shared/                     # Shared across features
│   ├── components/
│   │   ├── ui/                # Base UI components (shadcn/ui)
│   │   ├── forms/             # Reusable form components
│   │   └── layout/            # Navigation, ProtectedRoute
│   ├── hooks/                 # Shared custom hooks
│   ├── utils/                 # Utility functions
│   └── types/                 # Shared TypeScript types
├── services/                   # External services
│   └── api/                   # API client configurations
├── stores/                     # Zustand state stores
├── config/                     # App configuration
├── lib/                        # Third-party lib utilities
├── contexts/                   # React contexts (existing)
└── pages/                      # Page components (existing)
```

## Files Moved

### UI Components
All shadcn/ui components moved from `src/components/ui/` to `src/shared/components/ui/`:
- button.tsx
- card.tsx
- input.tsx
- label.tsx
- select.tsx

### Layout Components
Moved from `src/components/` to `src/shared/components/layout/`:
- Navigation.tsx
- ProtectedRoute.tsx

### Import Updates
Updated in `src/App.tsx`:
- `@/components/Navigation` → `@/shared/components/layout/Navigation`
- `@/components/ProtectedRoute` → `@/shared/components/layout/ProtectedRoute`

## Migration Status

✅ **Completed:**
- Created all feature directories with proper structure
- Created shared components structure
- Moved UI and layout components
- Updated App.tsx imports
- Created README files for each feature
- Added .gitkeep files for empty directories

🔄 **To Be Done (Future Tasks):**
- Migrate page components into feature modules
- Move contexts into appropriate features
- Create API service modules
- Set up Zustand stores
- Migrate business logic into hooks
- Update all import paths throughout the codebase

## Original Structure (Preserved)

The following directories remain unchanged for now:
- `src/components/` - Original components (will be migrated incrementally)
- `src/pages/` - Page components (will be refactored into features)
- `src/contexts/` - React contexts (will be moved or converted to Zustand)
- `src/lib/` - Utility functions (kept as is)

## Notes for Next Steps

1. Each page should be broken down into smaller feature components
2. Business logic should be extracted into custom hooks
3. API calls should be centralized in service modules
4. Consider using Zustand for global state instead of Context API
5. Update tsconfig.json paths if needed for cleaner imports
