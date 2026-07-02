// Registers @testing-library/jest-dom matchers (e.g. toHaveAttribute,
// toBeDisabled) with Vitest's `expect` and augments its Assertion types so the
// jsdom component tests under `components/**` can use them.
import "@testing-library/jest-dom/vitest";
