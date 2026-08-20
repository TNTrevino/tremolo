/** @type {import('tailwindcss').Config} */
export default {
	darkMode: ["class"],
	// Angular templates are .html (and inline `template:` strings in .ts),
	// where the React app's were .tsx. Otherwise unchanged from
	// frontend-react/tailwind.config.js -- the design tokens below are the
	// contract the screenshot baselines are diffed against.
	content: ["./src/**/*.{ts,html}"],
	/**
	 * Utilities are emitted as `html .h-6 { ... }` rather than `.h-6 { ... }`.
	 *
	 * The React app had no component styles, so a utility class was the only
	 * thing setting a property and it always won. Angular injects each
	 * component's styles into `<head>` **after** `styles.css`, as
	 * `[_nghost-…] { ... }` -- the same specificity as a class -- so a
	 * library component that sizes its own host beats the utility written on
	 * it. `@ng-icons` does exactly that
	 * (`:host { width: var(--ng-icon__size, 1em) }`), which made every one of
	 * the 47 `<ng-icon class="h-N w-N">` call sites render at 1em: the nav
	 * bar's icons measured 14-16px against React's 16-24px.
	 *
	 * The selector strategy costs one element of specificity (0,1,1) and
	 * nothing else -- no `!important` anywhere, so inline styles and real
	 * `!important` rules still win, exactly as in React. `html` is chosen
	 * because every utility must keep applying.
	 *
	 * Phase 3.1 fixed the same defect for the nav by writing `<ng-icon
	 * size="1.25rem">` alongside the `h-N w-N` class. Both mechanisms are
	 * live and both are load-bearing: this one is the only thing sizing the
	 * call sites that carry a class and no `size=`, and `size=` is the only
	 * thing sizing the two auth-page logos, which carry `size="2rem"` and no
	 * class. Where a call site has both, they agree exactly -- `size=` sets
	 * nothing but `--ng-icon__size`, which `@ng-icons` reads only for the
	 * host's `width`/`height`, and the inner `svg` is `width: inherit`. So
	 * either may size an icon; write one of them, and if you write both,
	 * keep them in step (`h-3`/0.75rem, `h-4`/1rem, `h-5`/1.25rem,
	 * `h-6`/1.5rem, `h-8`/2rem).
	 */
	important: "html",
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
