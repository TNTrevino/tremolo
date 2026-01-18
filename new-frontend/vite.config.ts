import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			"@/features": path.resolve(__dirname, "./src/features"),
			"@/shared": path.resolve(__dirname, "./src/shared"),
			"@/services": path.resolve(__dirname, "./src/services"),
			"@/stores": path.resolve(__dirname, "./src/stores"),
			"@/config": path.resolve(__dirname, "./src/config"),
		},
	},
});
