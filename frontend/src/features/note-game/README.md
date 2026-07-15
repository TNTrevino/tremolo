# Note Game Feature

The note identification game: students name the note shown on the
staff. This feature **composes the shared identification-game engine**
(`@/features/identification-game`) and layers the note game's extras on
top — audio feedback, physical keyboard input, and a pitch-range picker.

## Structure

### Components

- **GameBoard.tsx** - Active gameplay layouts (portrait + phone
  landscape). Uses the engine's `QuestionDisplay` and
  `useQuestionLoader`; adds the 21-note answer grid with key hints.
- **GameResults.tsx** - Post-game screen. Composes the engine's
  `GameOverCard` and adds the recent-games chart and save status.
- **SettingsBar.tsx** / **MobileSettingsDrawer.tsx** - Ready-state
  settings surfaces (mode, limit, scale, note range, key bindings).
- **StaffRangePicker.tsx** / **NoteRangeSetting.tsx** - Drag-to-select
  pitch range on a rendered staff.
- **KeyboardBindingsDialog.tsx** / **KeyboardBindingsEditor.tsx** -
  Custom key bindings for answering with a physical keyboard.

### Hooks

- **useNoteGame.ts** - Delegates to the engine's
  `useIdentificationGame`; adds audio on correct answers and keyboard
  input.
- **useNoteQueue.ts** - Prefetch queue: the engine's
  `useQuestionQueue` bound to the note-game fetcher (scale + range).
- **useKeyboardInput.ts** / **useNoteAudio.ts** - Input and audio.

Timer (`useGameTimer`, `useGameLifecycle`) and the in-game `ScoreBar`
live in the engine — import them from `@/features/identification-game`.

### Types

- **types/index.ts** - `GameSettings` (extends the engine's
  `BaseGameSettings`), `NoteGameStats`, `SCALES`, `NOTES`,
  `ACCIDENTALS`.

## Key Behaviors

- Two modes: time (countdown) and notes (fixed count); starts on the
  first answer.
- `octave` in settings is legacy persistence only — the note range
  (lowNote/highNote/clef) is what drives generation.
- Results persist via the engine's `useSaveGameOnEnd("note")`;
  authenticated users see recent-game charts.

## Related Files

- Page orchestrator: `src/pages/NoteGamePage.tsx`
- Engine: `src/features/identification-game/`
- Shared types: `src/shared/types/game.types.ts`
