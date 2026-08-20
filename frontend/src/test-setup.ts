/**
 * Global unit-test setup, run before every spec.
 *
 * `@angular/build:unit-test` initializes the TestBed itself, so unlike the
 * React app's `src/test/setup.ts` there is nothing to bootstrap here. It
 * exists as the single seam for global test configuration (custom matchers,
 * DOM shims) that later phases will need -- e.g. Phase 4's OSMD specs,
 * which have to stub canvas/SVG measurement in jsdom.
 */
export {};
