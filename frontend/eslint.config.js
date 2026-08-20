// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import angular from "angular-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
	{
		ignores: [
			".angular/",
			"dist/",
			"coverage/",
			"node_modules/",
			"e2e/**/*.js",
		],
	},
	{
		files: ["**/*.ts"],
		extends: [
			eslint.configs.recommended,
			...tseslint.configs.recommended,
			...tseslint.configs.stylistic,
			...angular.configs.tsRecommended,
			// Last: turns off every rule Prettier already decides. Same role
			// it played in the React app's .eslintrc.cjs.
			prettier,
		],
		processor: angular.processInlineTemplates,
		rules: {
			"@angular-eslint/directive-selector": [
				"error",
				{ type: "attribute", prefix: "app", style: "camelCase" },
			],
			"@angular-eslint/component-selector": [
				"error",
				{ type: "element", prefix: "app", style: "kebab-case" },
			],
		},
	},
	{
		files: ["**/*.html"],
		extends: [
			...angular.configs.templateRecommended,
			...angular.configs.templateAccessibility,
		],
		rules: {},
	},
);
