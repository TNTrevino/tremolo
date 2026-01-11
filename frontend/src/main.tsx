import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "bootstrap/dist/css/bootstrap.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import ErrorPage from "./pages/ErrorPage";
import About from "./pages/About.tsx";
import HomePage from "./pages/HomePage";
import SheetMusicDisplay from "./pages/generated-music/GeneratedMusicDisplay.tsx";
import NoteGame from "./pages/note-game/NoteGame";
import Account from "./pages/users/Account";
import Profile from "./pages/users/Profile";
import Dashboard from "./pages/users/Dashboard";
import Logout from "./pages/users/Logout";
import Converter from "./pages/Converter.tsx";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { environmentAndHttpsCheck } from "./utils/environmentValidation";

environmentAndHttpsCheck();

const router = createBrowserRouter([
	{
		path: "/",
		element: <App />,
		errorElement: <ErrorPage />,
		children: [
			{
				path: "/",
				element: <HomePage />,
			},
			{
				path: "/login",
				element: <LoginPage />,
			},
			{
				path: "/signup",
				element: <SignupPage />,
			},
			{
				path: "/about",
				element: <About />,
			},
			{
				path: "/convert",
				element: <Converter />,
			},
			{
				path: "/note-game",
				element: <NoteGame />,
			},
			{
				path: "/sheet-music",
				element: <SheetMusicDisplay />,
			},
			{
				path: "/profile",
				element: (
					<ProtectedRoute>
						<Profile />
					</ProtectedRoute>
				),
			},
			{
				path: "/dashboard",
				element: (
					<ProtectedRoute>
						<Dashboard />
					</ProtectedRoute>
				),
			},
			{
				path: "/account",
				element: (
					<ProtectedRoute>
						<Account />
					</ProtectedRoute>
				),
			},
			{
				path: "/logout",
				element: <Logout />,
			},
		],
	},
]);

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<RouterProvider router={router} />
	</StrictMode>,
);
