# Tremolo - Music Education Platform

A modern, responsive music education platform designed for students in grades 6-12 to practice sight reading, note recognition, and musical skills.

## Features

- **Note Recognition Game**: Interactive game to test and improve note identification skills
- **Sheet Music Practice**: Generate custom exercises with specific rhythms and scales
- **File Converter**: Upload and preview MusicXML files
- **Progress Tracking**: Detailed analytics and performance charts for logged-in users
- **Dark/Light Mode**: Toggle between themes for comfortable practice sessions
- **Responsive Design**: Works seamlessly on mobile, tablet, and desktop devices

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for styling
- **shadcn/ui** component library
- **React Router** for navigation
- **Recharts** for data visualization
- **Lucide React** for icons

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd tremolo-frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
tremolo-frontend/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── Navigation.tsx
│   │   └── ProtectedRoute.tsx
│   ├── contexts/         # React Context providers
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   ├── pages/            # Page components
│   │   ├── HomePage.tsx
│   │   ├── AboutPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── SignupPage.tsx
│   │   ├── NoteGamePage.tsx
│   │   ├── SheetMusicPage.tsx
│   │   ├── ConverterPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── ProfilePage.tsx
│   │   └── AccountPage.tsx
│   ├── lib/              # Utility functions
│   ├── App.tsx           # Main app component
│   ├── main.tsx          # Entry point
│   └── index.css         # Global styles
├── public/               # Static assets
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## Features by Page

### Public Pages

- **Home (/)**: Landing page with feature overview and call-to-action
- **About (/about)**: Mission statement and educational philosophy
- **Login (/login)**: User authentication
- **Signup (/signup)**: New user registration with validation
- **Note Game (/note-game)**: Interactive note recognition game
- **Sheet Music (/sheet-music)**: Generate custom practice exercises
- **Converter (/convert)**: Upload and preview MusicXML files

### Protected Pages (Require Login)

- **Dashboard (/dashboard)**: Performance analytics and user statistics
- **Profile (/profile)**: User profile and preferences (coming soon)
- **Account (/account)**: Security and privacy settings

## Authentication

The app uses a mock authentication system with localStorage for demonstration purposes. In a production environment, this would be replaced with a real backend API.

Default demo credentials:

- Email: demo@tremolo.com
- Password: (any password)

## Theme Switching

The application supports both dark and light modes. The theme preference is stored in localStorage and persists across sessions. Use the sun/moon icon in the navigation bar to toggle themes.

## Customization

### Colors

Edit the CSS variables in `src/index.css` to customize the color scheme:

```css
:root {
  --primary: 262 83% 58%;
  --accent: 45 93% 47%;
  /* ... more variables */
}
```

### Typography

Modify the font family in `tailwind.config.js`:

```js
fontFamily: {
  sans: ['Your Font', 'system-ui', 'sans-serif'],
  display: ['Your Display Font', 'system-ui', 'sans-serif'],
}
```

## Future Enhancements

- Real backend integration with API
- Actual sheet music rendering with OpenSheetMusicDisplay
- Teacher-student relationship management
- Advanced analytics and reporting
- Achievement system and gamification
- Social features and leaderboards
- Mobile apps (iOS/Android)

## Contributing

This is a demonstration project. For production use, additional features would need to be implemented:

- Backend API integration
- Real authentication and authorization
- Database integration
- Sheet music rendering library integration
- Payment processing (if applicable)
- Email verification system
- Advanced analytics

## License

This project is for educational/demonstration purposes.

## Contact

For questions or feedback about Tremolo, please contact the development team.
