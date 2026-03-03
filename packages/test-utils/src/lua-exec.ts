/**
 * Test helper: TypeScript → TSTL → Lua 5.3 WASM execution pipeline.
 *
 * Workflow:
 *   1. transpileString() compiles TypeScript source to Lua via TSTL
 *   2. The generated Lua is wrapped to expose the module exports
 *   3. A Lua 5.3 WASM VM (lua-wasm-bindings) executes the code
 *   4. The result is read from the Lua stack and returned to Node.js
 *
 * This mirrors the pattern used by TSTL's own test suite (test/util.ts),
 * adapted for our monorepo's unit testing needs.
 */

import { LUA_OK } from "lua-wasm-bindings/dist/lua";
import { lauxlib, lua, lualib } from "lua-wasm-bindings/dist/lua.53";
import { transpileString } from "typescript-to-lua";

// Minimal Lua global declarations for transpileString.
//
// Why not use `types: ["lua-types/5.3"]`?
//   transpileString creates a virtual TS program whose file resolver cannot
//   follow pnpm symlinks to find node_modules type packages.
//
// Why not use `lib: ["lib.esnext.d.ts"]` + Math.sqrt() (TSTL's own test style)?
//   TSTL's tests write JS-style APIs (Math.sqrt) and rely on builtin transformers
//   to auto-map them to Lua (math.sqrt). That works, but our source code uses
//   Lua-native APIs (math.sqrt via lua-types), so test code should match source.
//
// So we inline declare statements — lightweight, no dependencies, and test code
// mirrors the actual source code that uses lua-types/5.3.
const LUA_GLOBALS_PREAMBLE = `
declare namespace math {
	function max(...args: number[]): number;
	function min(...args: number[]): number;
	function sqrt(x: number): number;
	function floor(x: number): number;
	function ceil(x: number): number;
	function abs(x: number): number;
}
declare namespace string {
	function format(fmt: string, ...args: unknown[]): string;
}
declare function print(...args: unknown[]): void;
`;

export interface ExecOptions {
	/** TypeScript source code to transpile (e.g. an exported function) */
	tsCode: string;
	/**
	 * Lua expression to evaluate after loading the module.
	 * Has access to `exports` table (the module's exported members).
	 * Example: `"exports.clamp(5, 0, 10)"`
	 */
	luaExpression: string;
}

/**
 * Transpile TypeScript to Lua via TSTL, execute in a Lua 5.3 WASM VM,
 * and return a numeric result.
 *
 * Currently only supports numeric return values. For strings/tables,
 * extend with JSON serialization on the Lua side (see TSTL test/util.ts).
 */
export function transpileAndExecute({
	tsCode,
	luaExpression,
}: ExecOptions): number {
	// --- Step 1: Transpile TS → Lua ---
	//
	// transpileString options rationale:
	// - luaTarget "5.3": match our project target (Warcraft III / Lua 5.3)
	// - noImplicitSelf: strip TSTL's default `self` parameter so Lua calls
	//   are straightforward: `exports.clamp(5, 0, 10)` not `exports.clamp(nil, 5, 0, 10)`
	// - luaLibImport "inline": transpileString operates on a single string with
	//   no file system context, so `require("lualib_bundle")` would fail at runtime.
	//   "inline" embeds any needed TSTL runtime helpers directly in the output.
	//   For pure math.* calls, no helpers are needed so zero overhead.
	// - noHeader: skip the "Generated with TSTL" comment
	const result = transpileString(LUA_GLOBALS_PREAMBLE + tsCode, {
		luaTarget: "5.3" as never,
		noImplicitSelf: true,
		luaLibImport: "inline" as never,
		noHeader: true,
	});

	const errors = result.diagnostics.filter((d) => d.category === 1);
	if (errors.length > 0) {
		const messages = errors.map((d) =>
			typeof d.messageText === "string"
				? d.messageText
				: d.messageText.messageText,
		);
		throw new Error(`TSTL transpilation failed:\n${messages.join("\n")}`);
	}

	const luaCode = result.file?.lua;
	if (!luaCode) {
		throw new Error("TSTL produced no Lua output");
	}

	// --- Step 2: Execute in Lua 5.3 WASM VM ---
	//
	// transpileString generates module-style Lua:
	//   local ____exports = {}
	//   function ____exports.clamp(value, min, max) ... end
	//   return ____exports
	//
	// We wrap it to capture the exports table, then evaluate the user's
	// luaExpression which can reference `exports.<fn>(...)`.
	const wrappedLua = `
local exports = (function(...)
${luaCode}
end)()
return ${luaExpression}
`;

	const L = lauxlib.luaL_newstate();
	lualib.luaL_openlibs(L);

	try {
		const status = lauxlib.luaL_dostring(L, wrappedLua);

		if (status !== LUA_OK) {
			const errMsg = lua.lua_tostring(L, -1);
			throw new Error(`Lua execution failed: ${errMsg}`);
		}

		// lua_tonumber is a C macro in Lua 5.3 (expands to lua_tonumberx(L, i, NULL))
		// and is NOT exposed by lua-wasm-bindings. Read as string then convert.
		// lua_isstring returns true for numbers too (Lua auto-coerces), so this is safe.
		const resultStr = lua.lua_tostring(L, -1);
		return Number(resultStr);
	} finally {
		lua.lua_close(L);
	}
}
