# TREMOLO FRONTEND CODE SPECIFICATIONS

**Document Purpose:** Code practices, patterns, and architecture reference for frontend rewrite  
**Version:** 1.0  
**Last Updated:** January 2026  
**Project:** Tremolo Music Education Platform

---

## 📋 EXECUTIVE SUMMARY

The Tremolo frontend is a **React 18 + TypeScript** single-page application (SPA) designed for music education. It features a microservices-oriented architecture with JWT authentication, Material UI components, Chart.js visualizations, and OpenSheetMusicDisplay integration for rendering musical notation.

**Total Codebase Size:** ~5,947 lines of TypeScript/TSX code  
**Component Count:** 32+ components

---

## 🏗️ PROJECT STRUCTURE

```
frontend/
├── src/
│   ├── components/          # 32 reusable components
│   │   ├── auth/           # Authentication UI (6 components)
│   │   ├── charts/         # Data visualization (2 files)
│   │   ├── musical/        # Music-specific UI (2 components)
│   │   ├── navbar/         # Navigation (2 components)
│   │   ├── note-game/      # Note game UI (11 components)
│   │   ├── users/          # User profile UI (5 components)
│   │   ├── PasswordRequirements.tsx
│   │   └── ProtectedRoute.tsx
│   ├── contexts/           # React Context API
│   │   ├── AuthContext.tsx
│   │   └── AuthContextDefinition.ts
│   ├── DTOs/               # Data Transfer Objects
│   │   ├── chart.ts
│   │   └── user.ts
│   ├── hooks/              # Custom React hooks (7 hooks)
│   │   ├── useAuth.ts
│   │   ├── useGameCounters.ts
│   │   ├── useGameSettings.ts
│   │   ├── useGameStatus.ts
│   │   ├── useGameTimer.ts
│   │   ├── useNoteGame.ts
│   │   └── useNoteGeneration.ts
│   ├── models/             # TypeScript interfaces
│   │   └── models.tsx
│   ├── pages/              # Route components (12 pages)
│   │   ├── generated-music/
│   │   ├── note-game/
│   │   ├── users/
│   │   ├── About.tsx
│   │   ├── Converter.tsx
│   │   ├── ErrorPage.tsx
│   │   ├── FileUpload.tsx
│   │   ├── HomePage.tsx
│   │   ├── LoginPage.tsx
│   │   └── SignupPage.tsx
│   ├── services/           # API service layers (5 services)
│   │   ├── axiosInstance.ts
│   │   ├── AuthService.tsx
│   │   ├── ChartService.tsx
│   │   ├── MusicService.tsx
│   │   ├── NoteGameService.ts
│   │   └── UserInfoService.ts
│   ├── utils/              # Utility functions
│   │   ├── environmentValidation.ts
│   │   ├── formValidation.ts
│   │   └── passwordValidation.ts
│   ├── App.tsx             # Root component with theme
│   ├── main.tsx            # Entry point + routing
│   └── styles.tsx          # Centralized MUI styles
├── public/                 # Static assets
│   └── audio/             # Sound files for note game
└── index.html
```

---

## 📦 DEPENDENCIES & FRAMEWORKS

### **Core Framework**
- **React:** 18.3.1 (latest stable)
- **React DOM:** 18.3.1
- **TypeScript:** 5.6.3 (strict mode enabled)
- **Vite:** 5.4.9 (build tool + dev server)

### **UI Framework**
- **Material UI (MUI):** 6.1.4
  - `@mui/material` - Core components
  - `@mui/icons-material` - Icon library
  - `@emotion/react` + `@emotion/styled` - MUI's CSS-in-JS engine

### **Routing**
- **React Router DOM:** 6.26.1
  - `createBrowserRouter` for declarative routing
  - `ProtectedRoute` wrapper for auth-required pages

### **HTTP Client**
- **Axios:** 1.7.7
  - Configured with interceptors for JWT refresh
  - Custom `axiosInstance.ts` with automatic token handling

### **Music Rendering**
- **OpenSheetMusicDisplay:** 1.8.9
  - Renders MusicXML to SVG notation
  - Used in Note Game and practice pages

### **Data Visualization**
- **Chart.js:** 4.5.1
- **react-chartjs-2:** 5.3.1
- **chartjs-adapter-date-fns:** 3.0.0
- **date-fns:** 4.1.0
  - Time-series performance charts
  - Multi-metric line graphs (NPM, accuracy, session count)

### **Audio**
- **use-sound:** 4.0.3
  - Audio feedback for correct note answers

### **Legacy/Additional**
- **Bootstrap:** 5.3.3 (minimal usage, imported in `main.tsx`)
- **@auth0/auth0-react:** 2.2.4 (installed but **NOT actively used** - custom JWT implementation used instead)

### **Development Tools**
- **ESLint:** 9.17.0
  - TypeScript ESLint parser
  - React hooks plugin
  - React refresh plugin
- **Prettier:** 3.6.2
  - Enforced via Husky pre-commit hooks
- **Testing Libraries:** Installed but no test suite implemented
  - `@testing-library/react`
  - `@testing-library/jest-dom`
  - `@testing-library/user-event`

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### **Authentication Pattern: JWT with Refresh Tokens**

**Implementation:** Custom JWT-based authentication (NOT using Auth0 despite dependency)

#### **Token Storage**
```typescript
// localStorage keys (axiosInstance.ts)
const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
```

#### **Token Flow**
1. **Login** (`LoginPage.tsx` → `AuthService.login()`)
   - User submits email + password
   - Backend returns `{ user, access_token, refresh_token }`
   - Tokens stored in `localStorage`
   - User object stored in `AuthContext`

2. **Authenticated Requests** (`axiosInstance.ts`)
   - Request interceptor automatically attaches `Authorization: Bearer <token>` header
   - All requests to `VITE_BACKEND_MAIN` include JWT

3. **Token Refresh** (`axiosInstance.ts` response interceptor)
   - On 401 response, automatically calls `/api/auth/refresh`
   - If refresh succeeds: retry original request with new token
   - If refresh fails: clear tokens, redirect to login

4. **Logout** (`AuthService.logout()`)
   - Remove both tokens from `localStorage`
   - Clear user from `AuthContext`

### **AuthContext Provider**

**File:** `src/contexts/AuthContext.tsx`

```typescript
interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}
```

**Usage Pattern:**
```typescript
const { currentUser, isAuthenticated, login, logout } = useAuth();
```

### **Protected Routes**

**File:** `src/components/ProtectedRoute.tsx`

- Wraps protected pages (`/dashboard`, `/profile`, `/account`)
- Checks `isAuthenticated` from `AuthContext`
- Shows loading spinner during auth initialization
- Redirects to `/login` if not authenticated

### **User Roles**
```typescript
type UserRole = "student" | "teacher" | "parent";
```

Role-based features:
- **Teachers:** Can view aggregated class performance data
- **Students/Parents:** Personal data only
- Role selection during signup

---

## 🌐 HTTP CLIENT CONFIGURATION

### **Axios Instance** (`src/services/axiosInstance.ts`)

#### **Configuration**
```typescript
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_MAIN,  // Go backend (port 5001)
  validateStatus: () => true,  // Don't throw on HTTP errors, handle manually
});
```

#### **Request Interceptor**
```typescript
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

**Purpose:** Automatically inject JWT on every request

#### **Response Interceptor (Automatic Token Refresh)**
```typescript
apiClient.interceptors.response.use(async (response) => {
  const originalRequest = response.config;
  
  // On 401, try refreshing token
  if (response.status === 401 && !originalRequest._retried) {
    originalRequest._retried = true;  // Prevent infinite loops
    
    const [newToken, error] = await attemptTokenRefresh();
    
    if (error) {
      // Refresh failed - clear tokens and return 401
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      return response;
    }
    
    // Retry original request with new token
    originalRequest.headers.Authorization = `Bearer ${newToken}`;
    return apiClient(originalRequest);
  }
  
  return response;
});
```

**Key Features:**
- Transparent token refresh (user never sees 401 errors)
- Single retry to prevent infinite loops
- Clears tokens on refresh failure

#### **Helper Function**
```typescript
export const isOk = (response: AxiosResponse): boolean => {
  return response.status >= 200 && response.status < 300;
};
```

Used throughout services to check success status.

---

## 🛠️ SERVICE LAYERS

### **1. AuthService** (`src/services/AuthService.tsx`)

**API Endpoints:**
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/register` - Register new user
- `POST /api/auth/refresh` - Refresh access token

**Key Methods:**
```typescript
AuthService.login(email, password): Promise<LoginResponse>
AuthService.getCurrentUser(): Promise<User>
AuthService.register(userData): Promise<RegisterResponse>
AuthService.isAuthenticated(): boolean
AuthService.logout(): void
AuthService.getToken(): string | null
```

### **2. MusicService** (`src/services/MusicService.tsx`)

**Backend:** FastAPI music generation service (`VITE_BACKEND_MUSIC`, port 8000)

**API Endpoints:**
- `POST /mary` - Generate "Mary Had a Little Lamb" in different keys
- `POST /random` - Generate random notes with rhythm patterns
- `POST /note-game` - Generate single note for note identification game

**Key Methods:**
```typescript
MusicService.getMaryMusic({ scale, octave }): Promise<void>
MusicService.getRhythmMusic({ scale, octave, rhythmType, rhythm }): Promise<void>
MusicService.getNoteGameXml(scale, octave): Promise<noteGameProps>
MusicService.displayXml(files): Promise<void>  // For file upload
```

**Note:** These methods render directly to DOM element `#sheet-music-div` using OpenSheetMusicDisplay.

### **3. NoteGameService** (`src/services/NoteGameService.ts`)

**API Endpoints:**
- `POST /api/note-game/entry` - Save game results
- `GET /api/note-game/recent` - Get recent game entries

**Data Structure:**
```typescript
interface NoteGameEntryRequest {
  user_id: number;
  time_length: string;  // "HH:MM:SS" format
  total_questions: number;
  correct_questions: number;
  notes_per_minute: number;
}
```

### **4. UserInfoService** (`src/services/UserInfoService.ts`)

**API Endpoints:**
- `GET /api/users/:userId/general-info` - Get user stats

**Response:**
```typescript
interface GeneralUserInfo {
  first_name: string;
  last_name: string;
  created_date: string;  // "Joined 12 Mar 2024"
  total_entries: number;
  total_duration: string;  // "2h 15m"
}
```

### **5. ChartService** (`src/services/ChartService.tsx`)

**API Endpoints:**
- `GET /api/charts/user/:userId/metrics` - Personal performance data
- `GET /api/charts/teacher/class-metrics` - Class aggregate data (teachers only)

**Query Parameters:**
```typescript
type TimeInterval = "day" | "week" | "month" | "year" | "all";

params: {
  interval: TimeInterval,
  days: number  // Mapped from interval
}
```

**Response:**
```typescript
interface MultiMetricChartData {
  npm: ChartDataPoint[];          // Notes per minute
  accuracy: ChartDataPoint[];     // Accuracy percentage
  sessionCount: ChartDataPoint[]; // Number of sessions
  totalQuestions: ChartDataPoint[]; // Questions answered
}

interface ChartDataPoint {
  x: Date;  // Timestamp
  y: number; // Value
}
```

**Date Parsing:** Backend returns ISO 8601 strings, service converts to `Date` objects.

---

## 🎯 STATE MANAGEMENT

### **Pattern: Local State + Context API**

**NO global state management library** (Redux, Zustand, MobX)

#### **1. React Context API**

**AuthContext** - Global authentication state
```typescript
// src/contexts/AuthContext.tsx
const [currentUser, setCurrentUser] = useState<User | null>(null);
const [loading, setLoading] = useState<boolean>(true);
```

**Usage:**
```typescript
import { useAuth } from "../hooks/useAuth";

const { currentUser, isAuthenticated, login, logout } = useAuth();
```

#### **2. Component Local State**

All other state managed with `useState` hooks:

**Example: Note Game**
```typescript
// src/hooks/useNoteGame.ts - Orchestrator hook
const status = useGameStatus();      // gameStarted, gameOver
const settings = useGameSettings();  // gameMode, timeLimit, noteLimit
const counters = useGameCounters();  // correctCounter, totalCounter
const timer = useGameTimer();        // elapsedTime, timeRemaining
const noteGen = useNoteGeneration(); // Current note data
```

**Focused Hook Pattern:** Each hook manages a single concern, composed by orchestrator.

#### **3. URL State (React Router)**

**PerformanceChart** uses URL params for state:
```typescript
const [searchParams, setSearchParams] = useSearchParams();

// Read from URL
const interval = searchParams.get("interval") || "day";
const view = searchParams.get("view") || "personal";

// Update URL
setSearchParams({ interval: "week", view: "class" });
```

**Benefits:**
- Shareable links
- Browser back/forward navigation
- Persistent state across page refreshes

---

## 🔒 SECURITY IMPLEMENTATIONS

### **1. Environment Variable Validation**

**File:** `src/utils/environmentValidation.ts`

**Implementation:**
```typescript
// Validates required environment variables at build time and runtime
buildTimeEnvironmentCheck(process.env)      // Build time
environmentAndHttpsCheck()                   // Runtime (in main.tsx)
```

**Checks:**
- Ensures `VITE_BACKEND_MAIN` and `VITE_BACKEND_MUSIC` are set
- Enforces HTTPS URLs in production
- Allows HTTP for local development

### **2. Form Validation**

**Email Validation:**
```typescript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
```

**Password Requirements:** (matches backend Go validators)
```typescript
// src/utils/passwordValidation.ts
{
  minLength: 8,
  hasUppercase: /[A-Z]/,
  hasLowercase: /[a-z]/,
  hasNumber: /[0-9]/,
  hasSpecial: /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/
}
```

**Real-time Feedback:**
- Live password strength meter
- Immediate validation on blur
- Visual requirement checklist

### **3. Protected Routes**

```typescript
// src/components/ProtectedRoute.tsx
if (!isAuthenticated) {
  return <Navigate to="/login" replace />;
}
```

### **4. Token Security**

- **Storage:** `localStorage` (accessible only to same-origin)
- **Transmission:** HTTPS only in production
- **Lifecycle:** Automatic cleanup on logout/refresh failure
- **Expiry:** Automatic refresh via interceptor

**Security Considerations:**
- ⚠️ `localStorage` vulnerable to XSS attacks
- ✅ CSP helps mitigate XSS risk
- ✅ HTTPS prevents token interception
- ⚠️ No HTTP-only cookies (trade-off for simplicity)

---

## 🎨 STYLING & THEMING

### **Pattern: Material UI `sx` Prop (NO inline styles)**

**Coding Convention:** All styling via MUI's `sx` prop, never `style={}`.

### **Three Style Organization Patterns:**

#### **1. Centralized Styles File**
```typescript
// src/styles.tsx
const navbarStyles: Record<string, SxProps> = {
  musicNoteIcon: { display: { xs: "none", md: "flex" }, mr: 1 },
  button: { my: 2, color: "white", display: "block" }
};

export { navbarStyles, generatedMusicStyles, landingPageStyles, ... };
```

**Exports:** 5 style collections
- `navbarStyles`
- `generatedMusicStyles`
- `landingPageStyles`
- `userInfoStyles`
- `authPageStyles`

#### **2. Page-Specific Style Files**
```typescript
// src/pages/note-game/NoteGameStyles.tsx
const noteGameStyles: Record<string, SxProps> = {
  mainDiv: { display: "flex", flexDirection: "row" },
  musicContainer: { flex: "2", width: "50%" }
};
```

#### **3. Component-Local Styles**
```typescript
// src/pages/users/Dashboard.tsx
const mainDiv: SxProps = {
  display: "flex",
  flexDirection: "column",
  p: { xs: "0.5rem", sm: "1rem", md: "2rem" }
};
```

### **Custom Theme** (`src/App.tsx`)

```typescript
const theme = createTheme({
  palette: {
    primary: { main: "#1E201E" },    // Dark charcoal
    secondary: { main: "#3C3D37" }   // Medium gray
  },
  components: {
    MuiButton: {
      defaultProps: { variant: "outlined", disableElevation: true },
      styleOverrides: { root: { marginTop: 8 } }
    },
    MuiCard: {
      defaultProps: { variant: "outlined" }
    }
  }
});
```

**Global Defaults:**
- All buttons outlined by default
- All cards outlined
- Elevation disabled
- Consistent spacing

### **Responsive Design**

MUI breakpoints used throughout:
```typescript
sx={{
  width: { xs: "100%", sm: "80%", md: "50%" },
  display: { xs: "none", md: "flex" },
  p: { xs: "0.5rem", sm: "1rem", md: "2rem" }
}}
```

Breakpoints:
- `xs`: 0-600px (mobile)
- `sm`: 600-900px (tablet)
- `md`: 900-1200px (desktop)
- `lg`: 1200-1536px
- `xl`: 1536px+

---

## 🧩 CUSTOM HOOKS ARCHITECTURE

### **Hook Composition Pattern**

The Note Game uses a **focused hooks pattern** where each hook manages a single concern, then an orchestrator hook composes them.

#### **1. useGameStatus** (`src/hooks/useGameStatus.ts`)
```typescript
return {
  gameStarted: boolean,
  gameOver: boolean,
  startGame: () => void,
  endGame: () => void,
  reset: () => void
}
```

#### **2. useGameSettings** (`src/hooks/useGameSettings.ts`)
```typescript
return {
  gameMode: "time" | "notes",
  timeLimit: number,
  noteLimit: number,
  scaleChoice: string,
  octaveChoice: string,
  setGameMode, setTimeLimit, setNoteLimit, setScale, setOctave
}
```

#### **3. useGameCounters** (`src/hooks/useGameCounters.ts`)
```typescript
return {
  correctCounter: number,
  totalCounter: number,
  accuracy: number,
  increment: (isCorrect: boolean) => void,
  reset: () => void,
  calculateNotesPerMinute: (elapsedSeconds: number) => number
}
```

#### **4. useGameTimer** (`src/hooks/useGameTimer.ts`)
```typescript
return {
  currentTime: number,      // Unix timestamp
  startTime: number,
  elapsedTime: number,      // Seconds since start
  timeRemaining: number,    // For timed mode
  start: () => void,
  reset: () => void
}
```

**Performance Optimization:**
- Uses `Date.now()` instead of `setInterval` to prevent drift
- Only re-renders when displayed second changes (not every tick)
- Checks every 100ms for second changes (responsive)

#### **5. useNoteGeneration** (`src/hooks/useNoteGeneration.ts`)
```typescript
return {
  noteInformation: noteGameProps | undefined,
  sound: string | null,
  fetchNote: () => Promise<void>
}
```

#### **6. useNoteGame** (`src/hooks/useNoteGame.ts`) - **Orchestrator**
```typescript
export function useNoteGame() {
  const status = useGameStatus();
  const settings = useGameSettings();
  const counters = useGameCounters();
  const timer = useGameTimer(...);
  const noteGen = useNoteGeneration(...);
  
  // Orchestration logic
  const handleAnswer = useCallback(...);
  const handleKeyDown = useCallback(...);
  const resetGame = useCallback(...);
  const saveGame = useCallback(...);  // Calls NoteGameService
  
  return {
    // Expose unified API
    gameStarted, gameOver, currentTime, totalCounter, ...
    handleKeyDown, handleButtonClick, resetGame, ...
  };
}
```

**Benefits:**
- Single source of truth for game state
- Easy to test individual concerns
- Reusable across desktop/mobile views
- Clear separation of concerns

#### **7. useAuth** (`src/hooks/useAuth.ts`)
```typescript
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
```

Simple wrapper with runtime validation.

---

## 🔄 ROUTING CONFIGURATION

**File:** `src/main.tsx`

### **Router Setup**
```typescript
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,  // Layout with Navbar
    errorElement: <ErrorPage />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/signup", element: <SignupPage /> },
      { path: "/about", element: <About /> },
      { path: "/convert", element: <Converter /> },
      { path: "/note-game", element: <NoteGame /> },
      { path: "/sheet-music", element: <SheetMusicDisplay /> },
      
      // Protected routes
      { 
        path: "/profile", 
        element: <ProtectedRoute><Profile /></ProtectedRoute> 
      },
      { 
        path: "/dashboard", 
        element: <ProtectedRoute><Dashboard /></ProtectedRoute> 
      },
      { 
        path: "/account", 
        element: <ProtectedRoute><Account /></ProtectedRoute> 
      },
      { path: "/logout", element: <Logout /> }
    ]
  }
]);
```



---

## 📊 DATA VISUALIZATION

### **Chart.js Integration**

**Libraries:**
- `chart.js` v4.5.1
- `react-chartjs-2` v5.3.1
- `chartjs-adapter-date-fns` v3.0.0 (time-series support)

### **PerformanceChart Component** (`src/components/charts/PerformanceChart.tsx`)

**Features:**
- **Multi-metric line chart** (4 datasets)
- **Time-series visualization** (x-axis: dates)
- **Dynamic time intervals:** day/week/month/year/all
- **Teacher view toggle:** Personal data vs. class aggregate
- **URL state management:** Shareable links
- **Responsive design:** Mobile-optimized

**Chart Configuration** (`src/components/charts/chartConfig.ts`):
```typescript
export const CHART_THEME_COLORS = {
  primary: "#1E201E",
  secondary: "#3C3D37",
  tertiary: "#697565",
  light: "#ECDFCC"
};

export const getDatasetStyle = (color: string) => ({
  borderColor: color,
  backgroundColor: `${color}33`,  // 20% opacity
  borderWidth: 2,
  pointRadius: 4,
  tension: 0.4  // Smooth curves
});
```

**Metrics Tracked:**
1. **NPM** (Notes Per Minute)
2. **Accuracy %**
3. **Session Count**
4. **Total Questions**

---

## 🎵 MUSIC RENDERING

### **OpenSheetMusicDisplay Integration**

**Library:** `opensheetmusicdisplay` v1.8.9

**Usage Pattern:**
```typescript
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";

const container = document.getElementById("sheet-music-div");
const osmd = new OpenSheetMusicDisplay(container);

await osmd.load(musicXmlString);  // MusicXML from backend
osmd.render();                     // Render to SVG
```

**Services Using OSMD:**
- `MusicService.getMaryMusic()` - "Mary Had a Little Lamb" generator
- `MusicService.getRhythmMusic()` - Random rhythm patterns
- `MusicService.getNoteGameXml()` - Single note for identification game
- `MusicService.displayXml()` - File upload converter

**Container Element:**
```html
<div id="sheet-music-div"></div>
```

Must exist in DOM before calling OSMD methods.

---

## 🎮 NOTE GAME ARCHITECTURE

### **Game Flow**

1. **Settings Selection**
   - Game mode: Time-based or Note-count-based
   - Time limit: 15s / 30s / 60s / 120s
   - Note limit: 10 / 25 / 50 / 100
   - Musical settings: Scale (C/D/E/F/G/A/B) + Octave (1-7)

2. **Game Start** (on first answer)
   - Timer starts
   - Note counter begins
   - Sheet music displays random note

3. **Answer Input**
   - **Keyboard:** A-G keys
   - **Button clicks:** Touch-friendly buttons
   - Sound plays on correct answer

4. **End Conditions**
   - **Time mode:** Time limit reached
   - **Notes mode:** Note count reached

5. **Results Save** (authenticated users)
   - POST to `/api/note-game/entry`
   - Includes: user_id, time_length, total_questions, correct_questions, notes_per_minute

6. **Game Over Screen**
   - Final accuracy %
   - Notes per minute
   - "Play Again" button
   - Settings adjustments

### **Mobile vs. Desktop Views**

**Component Split:**
- `NoteGameMobileView.tsx` - Optimized for touch
- `NoteGameDesktopView.tsx` - Keyboard-first
- `NoteGameViewProps.ts` - Shared interface

**Responsive Detection:**
```typescript
const isMobile = useMediaQuery(theme.breakpoints.down("md"));
```

---

## 🔑 KEY TECHNICAL DECISIONS

### **✅ What's Working Well**

1. **Focused Hooks Pattern** - Clean separation of concerns in Note Game
2. **Automatic Token Refresh** - Transparent JWT handling
3. **Material UI Theming** - Consistent, customizable UI
4. **Vite Build Tool** - Fast HMR, modern tooling
5. **TypeScript Strict Mode** - Type safety throughout
6. **Pre-commit Hooks** - Enforced code quality

### **⚠️ Technical Debt / Considerations**

1. **Auth0 Dependency Not Used**
   - Library installed but custom JWT used instead
   - Consider removing dependency

2. **localStorage for Tokens**
   - Vulnerable to XSS attacks
   - Consider HttpOnly cookies for future

3. **No Test Suite**
   - Testing libraries installed but no tests written
   - Critical for production app

4. **Bootstrap + MUI**
   - Bootstrap imported but minimal usage
   - Redundant with MUI

5. **Manual DOM Manipulation** (OpenSheetMusicDisplay)
   - `document.getElementById()` breaks React paradigm
   - Works but not ideal

6. **Inline Error Handling**
   - No global error boundary
   - No toast/snackbar system for user feedback

7. **Limited Accessibility**
   - No ARIA labels on many components
   - Keyboard navigation not fully tested

---

## 📝 CODING CONVENTIONS (Summary)

**Full details in:** `frontend/CODING_CONVENTIONS.md`

### **Key Rules**

1. **No inline `style` objects** - Always use `sx` prop
2. **TypeScript strict mode** - All types explicit
3. **Functional components only** - No class components
4. **Material UI first** - Prefer MUI over HTML elements
5. **Local state only** - No Redux/Zustand
6. **PascalCase components** - `NoteGame.tsx`
7. **camelCase everything else** - `handleClick`, `scaleChoice`
8. **Service pattern** - Object with async methods



---

## 🎯 RECOMMENDATIONS FOR REWRITE

### **Keep:**
- ✅ Focused hooks pattern
- ✅ Axios interceptor architecture
- ✅ Material UI theming approach
- ✅ TypeScript strict mode
- ✅ Environment validation strategy
- ✅ Service layer pattern

### **Change:**
- 🔄 Add global error boundary
- 🔄 Implement toast/snackbar system
- 🔄 Add comprehensive test suite
- 🔄 Remove Auth0 dependency
- 🔄 Consider HttpOnly cookies for tokens
- 🔄 Add accessibility labels
- 🔄 Remove Bootstrap dependency
- 🔄 Refactor OpenSheetMusicDisplay to use refs instead of `getElementById`

### **Enhance:**
- 🚀 Add loading skeletons
- 🚀 Implement code splitting for large dependencies
- 🚀 Add error tracking service integration
- 🚀 Dark mode toggle

---

## 📞 API COMMUNICATION SUMMARY

### **Backend Services**

**1. Go User Service** (`VITE_BACKEND_MAIN`)
- Authentication (`/api/auth/*`)
- User management (`/api/users/*`)
- Note game entries (`/api/note-game/*`)
- Performance charts (`/api/charts/*`)

**2. FastAPI Music Service** (`VITE_BACKEND_MUSIC`)
- MusicXML generation (`/mary`, `/random`, `/note-game`)
- No authentication required

### **Request/Response Flow**

```
Frontend Component
  → Service Layer (MusicService/AuthService/etc.)
    → axiosInstance (with interceptors)
      → Request Interceptor (inject JWT)
        → HTTP Request
          → Response Interceptor (handle 401, refresh token)
            → Service processes response
              → Component updates state
```

---

## 🎓 CONCLUSION

The Tremolo frontend demonstrates **well-structured code patterns** with strong TypeScript typing, clean separation of concerns via custom hooks, and a robust authentication system.

**Key Code Strengths:**
- Clean hook composition pattern
- Type-safe throughout (strict mode)
- Automatic JWT refresh via interceptors
- Focused service layer pattern
- Consistent styling conventions (sx prop)

**Code Improvements Needed:**
- Testing coverage
- Accessibility (ARIA labels)
- Global error handling
- User feedback system (toasts/snackbars)

**Overall Assessment:** Solid architectural foundation with clear patterns for state management, API communication, and component organization. Ready for rewrite with these proven patterns.

---

**Document Version:** 1.0  
**Created:** January 2026  
**Purpose:** Code practices and architecture reference for frontend rewrite
