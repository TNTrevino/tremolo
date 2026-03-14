import "@testing-library/jest-dom";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Cleanup after each test
afterEach(() => {
	cleanup();
});

// Mock localStorage
const localStorageMock = {
	getItem: () => null,
	setItem: () => undefined,
	removeItem: () => undefined,
	clear: () => undefined,
	length: 0,
	key: () => null,
};

Object.defineProperty(window, "localStorage", {
	value: localStorageMock,
});

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: (query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: () => undefined,
		removeListener: () => undefined,
		addEventListener: () => undefined,
		removeEventListener: () => undefined,
		dispatchEvent: () => false,
	}),
});
