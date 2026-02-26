/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_BACKEND_MUSIC: string;
	readonly VITE_BACKEND_MAIN: string;
	// Add other env variables as needed
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
