import { transpileAndExecute } from "test-utils/src/lua-exec";
import { describe, expect, it } from "vitest";

// Inline the clamp source as a TS string for transpileString.
// This avoids needing tsconfig paths/includes — simplest approach for a spike.
const CLAMP_TS = `
export function clamp(value: number, min: number, max: number): number {
	return math.max(min, math.min(max, value));
}
`;

describe("spike: TS → TSTL → Lua WASM → assert", () => {
	it("returns value when within range", () => {
		const result = transpileAndExecute({
			tsCode: CLAMP_TS,
			luaExpression: "exports.clamp(5, 0, 10)",
		});
		expect(result).toBe(5);
	});

	it("clamps below minimum", () => {
		const result = transpileAndExecute({
			tsCode: CLAMP_TS,
			luaExpression: "exports.clamp(-3, 0, 10)",
		});
		expect(result).toBe(0);
	});

	it("clamps above maximum", () => {
		const result = transpileAndExecute({
			tsCode: CLAMP_TS,
			luaExpression: "exports.clamp(15, 0, 10)",
		});
		expect(result).toBe(10);
	});

	it("handles edge: value equals min", () => {
		const result = transpileAndExecute({
			tsCode: CLAMP_TS,
			luaExpression: "exports.clamp(0, 0, 10)",
		});
		expect(result).toBe(0);
	});

	it("handles edge: value equals max", () => {
		const result = transpileAndExecute({
			tsCode: CLAMP_TS,
			luaExpression: "exports.clamp(10, 0, 10)",
		});
		expect(result).toBe(10);
	});
});
