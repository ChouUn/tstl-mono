# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run

```bash
pnpm install          # Install dependencies
pnpm build            # Build pkg-c → dist/bundle.lua
lua dist/bundle.lua   # Run the output
pnpm -r run clean     # Remove all dist/ directories
```

Only pkg-c has a meaningful build — pkg-a and pkg-b are never built independently.

## Code Quality

```bash
pnpm check            # Biome: format + lint + import sorting (one command)
pnpm format           # Biome: format only (--write)
pnpm lint             # Biome: lint only
```

- **Biome 2.x** handles formatting, linting, and import sorting via `biome.json`
- **simple-git-hooks** runs `biome check --staged` on every commit (pre-commit hook)

## Architecture

This is a TSTL (TypeScriptToLua) monorepo demo targeting Lua 5.3 (Warcraft III). Five packages managed by pnpm workspace:

- **pkg-a** — Base library (math utilities, logging, formatting)
- **pkg-b** — Unit system (depends on pkg-a)
- **pkg-c** — Main entry point (depends on pkg-a + pkg-b + pkg-engine-api, produces single Lua bundle)
- **pkg-engine-api** — Engine API type declarations (pure `.d.ts`, global + module dual model)
- **e2e-engine-api** — E2E tests for engine API (Lua stubs + bundle execution)

### Source Compilation Model

pkg-c compiles all three packages' TypeScript source directly into one `bundle.lua`. This is NOT a traditional "each package builds independently" setup:

- pkg-c's `tsconfig.json` uses `paths` to map `"pkg-a"` and `"pkg-b"` to sibling source directories
- pkg-c's `include` covers `../pkg-a/**/*.ts` and `../pkg-b/**/*.ts`
- pkg-c's `rootDir` is set to `..` (the `packages/` directory) so bundle module keys are clean (e.g. `pkg-a.math.vector`, not `lua_modules.pkg-a.dist.index`)
- pkg-a/pkg-b `tsconfig.json` files exist only for IDE support (Go to Definition, type checking)

### TSTL-Specific Notes

- `luaBundle` + `luaBundleEntry` in pkg-c's tsconfig produce a single-file Lua bundle
- `luaLibImport: "require"` — TSTL's runtime library is loaded via require, not inlined
- `lua-types/5.3` provides type definitions for Lua globals (`math`, `print`, `string`, etc.)
- Use `math.sqrt()` not `Math.sqrt()` — code targets Lua runtime, not JavaScript

### Adding a New Package

1. Create `packages/pkg-x/` with `package.json`, `tsconfig.json`, and `index.ts`
2. Add `paths` entry and `include` glob in pkg-c's `tsconfig.json`
3. If pkg-x depends on other workspace packages, also add `paths`/`include` in pkg-x's own tsconfig (for IDE)
