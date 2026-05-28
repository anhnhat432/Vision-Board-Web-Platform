import { builtinEnvironments } from "vitest/environments";
import type { Environment } from "vitest";

// Capture the native Node.js AbortController and AbortSignal
const nativeAbortController = globalThis.AbortController;
const nativeAbortSignal = globalThis.AbortSignal;

export default <Environment>{
  name: "custom-jsdom",
  transformMode: "web",
  async setup(global, options) {
    // Run the built-in JSDOM setup first
    const { teardown } = await builtinEnvironments.jsdom.setup(global, options);

    // Restore the native Node.js AbortController and AbortSignal onto JSDOM's global scope
    global.AbortController = nativeAbortController;
    global.AbortSignal = nativeAbortSignal;

    return {
      teardown,
    };
  },
};
