/**
 * Test helper: TypeScript → TSTL → Lua 5.3 WASM execution pipeline.
 *
 * Workflow:
 *   1. Write TS code to a temp file under `.temp/`
 *   2. Use transpileFiles() with `types: ["lua-types/5.3"]`
 *   3. Execute generated Lua in lua-wasm-bindings
 *   4. Return the numeric result to Vitest
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { LUA_OK } from "lua-wasm-bindings/dist/lua";
import { lauxlib, lua, lualib } from "lua-wasm-bindings/dist/lua.53";
import { transpileFiles } from "typescript-to-lua";

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
	// Use transpileFiles so TypeScript resolves lua-types from node_modules normally.
	const tempDir = resolve(".temp", "tstl-test-utils");
	mkdirSync(tempDir, { recursive: true });
	const tempMainFile = resolve(tempDir, "main.ts");
	writeFileSync(tempMainFile, tsCode, "utf8");

	let luaCode: string | undefined;
	const result = transpileFiles(
		[tempMainFile],
		{
			luaTarget: "5.3" as never,
			noImplicitSelf: true,
			luaLibImport: "inline" as never,
			noHeader: true,
			types: ["lua-types/5.3"],
		},
		(fileName, data) => {
			if (fileName.endsWith(".lua")) {
				luaCode = data;
			}
		},
	);

	const errors = result.diagnostics.filter((d) => d.category === 1);
	if (errors.length > 0) {
		const messages = errors.map((d) =>
			typeof d.messageText === "string"
				? d.messageText
				: d.messageText.messageText,
		);
		throw new Error(`TSTL transpilation failed:\n${messages.join("\n")}`);
	}

	// transpileFiles emits via writeFile callback, so capture the generated main Lua there.
	if (!luaCode) {
		throw new Error("TSTL produced no Lua output");
	}

	// --- Step 2: Execute in Lua 5.3 WASM VM ---
	//
	// transpileFiles generates module-style Lua:
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
