module.exports = {
	root: true,
	env: {
		browser: true,
		es2020: true,
		node: true,
	},
	extends: [
		"eslint:recommended",
		"plugin:@typescript-eslint/recommended",
		"plugin:react/recommended",
		"plugin:react/jsx-runtime",
		"plugin:react-hooks/recommended",
		"plugin:@tanstack/eslint-plugin-query/recommended",
		"plugin:jsx-a11y/recommended",
		"prettier",
	],
	ignorePatterns: ["dist", ".eslintrc.cjs", "node_modules"],
	parser: "@typescript-eslint/parser",
	parserOptions: {
		ecmaVersion: "latest",
		sourceType: "module",
		ecmaFeatures: {
			jsx: true,
		},
	},
	plugins: ["react", "react-hooks", "@typescript-eslint", "jsx-a11y"],
	settings: {
		react: {
			version: "detect",
		},
	},
	rules: {
		// TypeScript
		"@typescript-eslint/no-unused-vars": [
			"warn",
			{ argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
		],
		"@typescript-eslint/no-explicit-any": "warn",
		"@typescript-eslint/consistent-type-imports": [
			"warn",
			{ prefer: "type-imports" },
		],

		// React
		"react/prop-types": "off",
		"react/jsx-no-target-blank": "warn",

		// React Hooks
		"react-hooks/rules-of-hooks": "error",
		"react-hooks/exhaustive-deps": "warn",

		// General
		"no-console": ["warn", { allow: ["warn", "error"] }],
		"prefer-const": "warn",
	},
	overrides: [
		{
			files: ["src/lib/logger.ts"],
			rules: {
				"no-console": "off",
			},
		},
	],
};
