import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { buildTimeEnvironmentCheck } from "./src/utils/environmentValidation";

// validate environment variables during build. cant extract due to the
// 'process'
function validateEnvironment() {
	return {
		name: "validate-environment",
		config: () => {
			buildTimeEnvironmentCheck(process.env);
		},
	};
}

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react(), validateEnvironment()],
});
