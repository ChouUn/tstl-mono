import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			// Allow test files across packages to import shared helpers via
			// `import { ... } from "test-utils/..."` without adding workspace deps.
			"test-utils": resolve(__dirname, "packages/test-utils"),
		},
	},
	test: {
		// Use process isolation (forks) instead of worker threads.
		// lua-wasm-bindings loads WASM via Emscripten's synchronous fs.readFileSync,
		// which can conflict with SharedArrayBuffer in worker thread pools.
		pool: "forks",
		// First WASM compilation is slow on cold start.
		testTimeout: 10_000,
	},
});
