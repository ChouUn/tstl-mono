> Parent: [index.md](../index.md)

# 双模型类型声明实现规范

## 背景
项目需要新增一个纯 `.d.ts` package，用于描述由 Lua/C 引擎提供的 API。要求同时支持：
1. Global API（直接全局调用）
2. Module API（可 import，运行时模块提供）

## 设计约束
- `packages/pkg-engine-api` 仅存放 `.d.ts` 文件，不包含 TS/Lua 运行时代码。
- `pkg-c` 作为唯一 bundle 入口，负责演示两种调用方式。
- 本地验证通过独立 e2e 项目提供 Lua stubs，不把验证桩混入业务包。

## 文件布局
- `packages/pkg-engine-api/index.d.ts`：Module API 声明
- `packages/pkg-engine-api/globals.d.ts`：Global API 声明
- `packages/e2e-engine-api/stubs/pkg-engine-api.lua`：Module API 本地 stub
- `packages/e2e-engine-api/stubs/engine_globals.lua`：Global API 本地 stub

## 接入方式
- 在 `packages/pkg-c/tsconfig.json` 增加：
  - `paths["pkg-engine-api"]`
  - `include` 对 `../pkg-engine-api/**/*.d.ts`
  - `tstl.noResolvePaths: ["pkg-engine-api"]`（允许模块路径保留为运行时 `require`）
- 在 `packages/pkg-c/package.json` 增加 workspace 依赖 `pkg-engine-api`。
- 在 `packages/pkg-c/main.ts` 同时演示：
  - Module API：`import * as engineModule from "pkg-engine-api"`
  - Global API：直接调用全局函数
- 在 `packages/pkg-engine-api/*.d.ts` 顶部加 `/** @noSelfInFile */`，避免 TSTL 生成带 `self` 的调用约定。
## 验收标准
1. `pnpm build` 成功。
2. `dist/bundle.lua` 中可见 module 形式加载（`require("pkg-engine-api")` 或等价形式）。
3. `dist/bundle.lua` 中存在 global API 调用语句。
4. `pnpm run e2e:engine-api` 成功，日志显示 module 与 global 调用都生效。
