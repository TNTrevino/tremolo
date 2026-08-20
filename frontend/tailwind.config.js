/** @type {import('tailwindcss').Config} */
export default {
	darkMode: ["class"],
	// Angular templates are .html (and inline `template:` strings in .ts),
	// where the React app's were .tsx. Otherwise unchanged from
	// frontend-react/tailwind.config.js -- the design tokens below are the
	// contract the screenshot baselines are diffed against.
	content: ["./src/**/*.{ts,html}"],
	theme: {
		container: {
			center: true,
			padding: "2rem",
			screens: {
				"2xl": "1400px",
			},
		},
		extend: {
			screens: {
				"phone-landscape": {
					raw: "(orientation: landscape) and (max-height: 500px)",
				},
			},
			colors: {
				border: "hsl(var(--border))",
				input: "hsl(var(--input))",
				ring: "hsl(var(--ring))",
				background: "hsl(var(--background))",
				foreground: "hsl(var(--foreground))",
				primary: {
					DEFAULT: "hsl(var(--primary))",
					foreground: "hsl(var(--primary-foreground))",
				},
				secondary: {
					DEFAULT: "hsl(var(--secondary))",
					foreground: "hsl(var(--secondary-foreground))",
				},
				destructive: {
					DEFAULT: "hsl(var(--destructive))",
					foreground: "hsl(var(--destructive-foreground))",
				},
				muted: {
					DEFAULT: "hsl(var(--muted))",
					foreground: "hsl(var(--muted-foreground))",
				},
				accent: {
					DEFAULT: "hsl(var(--accent))",
					foreground: "hsl(var(--accent-foreground))",
				},
				brass: {
					DEFAULT: "hsl(var(--brass))",
					foreground: "hsl(var(--brass-foreground))",
				},
				correct: {
					DEFAULT: "hsl(var(--correct))",
					foreground: "hsl(var(--correct-foreground))",
				},
				popover: {
					DEFAULT: "hsl(var(--popover))",
					foreground: "hsl(var(--popover-foreground))",
				},
				card: {
					DEFAULT: "hsl(var(--card))",
					foreground: "hsl(var(--card-foreground))",
				},
			},
			borderRadius: {
				lg: "var(--radius)",
				md: "calc(var(--radius) - 2px)",
				sm: "calc(var(--radius) - 4px)",
			},
			keyframes: {
				"accordion-down": {
					from: { height: 0 },
					to: { height: "var(--radix-accordion-content-height)" },
				},
				"accordion-up": {
					from: { height: "var(--radix-accordion-content-height)" },
					to: { height: 0 },
				},
				"fade-in": {
					from: { opacity: 0, transform: "translateY(10px)" },
					to: { opacity: 1, transform: "translateY(0)" },
				},
				"slide-in": {
					from: { transform: "translateX(-100%)" },
					to: { transform: "translateX(0)" },
				},
			},
			animation: {
				"accordion-down": "accordion-down 0.2s ease-out",
				"accordion-up": "accordion-up 0.2s ease-out",
				"fade-in": "fade-in 0.5s ease-out",
				"slide-in": "slide-in 0.3s ease-out",
			},
			fontFamily: {
				sans: ["Inter Variable", "system-ui", "sans-serif"],
				display: [
					"Bricolage Grotesque Variable",
					"Inter Variable",
					"system-ui",
					"sans-serif",
				],
				mono: ["ui-monospace", "monospace"],
			},
		},
	},
	plugins: [require("tailwindcss-animate")],
};
