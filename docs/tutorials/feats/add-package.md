> Parent: [index.md](../index.md)

# 新增一个 package（通用流程）

## 背景
当前仓库采用 `pkg-c` 作为唯一 bundle 入口，统一编译 `packages/` 下多个 package 的源码到 `dist/bundle.lua`。因此新增 package 的关键不在“单包独立构建”，而在让 `pkg-c` 正确接入该包。

## 适用范围
适用于新增任意 `packages/pkg-x`（普通 TS 包或纯 `.d.ts` 声明包）。

## 操作步骤
1. 创建目录与基础文件：
   - `packages/pkg-x/package.json`
   - `packages/pkg-x/tsconfig.json`
   - `packages/pkg-x/index.ts`（或纯声明包使用 `index.d.ts`）
2. 在 `packages/pkg-c/tsconfig.json` 接入新包：
   - `compilerOptions.paths["pkg-x"] = ["../pkg-x/index"]`
   - `include` 增加 `"../pkg-x/**/*.ts"`（纯声明包使用 `"../pkg-x/**/*.d.ts"`）
3. 在 `packages/pkg-c/package.json` 增加依赖：
   - `"pkg-x": "workspace:*"`
4. 在 `packages/pkg-c/main.ts`（或其它入口代码）中导入并使用新包。
5. 验证：
   - `pnpm build`
   - 必要时检查 `dist/bundle.lua` 是否包含预期模块逻辑。

## 推荐的 tsconfig 约定
为了减少跨包 include 带来的 IDE 配置问题：
- 非入口包（如 `pkg-a` / `pkg-b` / `pkg-x`）推荐使用 IDE-only 配置：
  - `compilerOptions.noEmit: true`
- 仅 `pkg-c` 负责实际 bundle 构建。

## 纯 `.d.ts` 包的补充
当 `pkg-x` 是运行时由引擎提供实现、仓库内只放声明文件时：
- 在 `packages/pkg-c/tsconfig.json` 的 `tstl` 中加入：
  - `"noResolvePaths": ["pkg-x"]`
- 声明文件如需无 `self` 调用语义，在文件顶部添加：
  - `/** @noSelfInFile */`
- 如需本地运行验证，建议在独立 e2e 目录提供 Lua stubs，不混入业务 package。

## 常见问题
1. **能否只改 `package.json`，不改 `pkg-c/tsconfig`？**
   - 不能。当前架构依赖 `pkg-c` 的 `paths + include` 来把源码纳入同一次编译。
2. **新增包需要独立 build 吗？**
   - 通常不需要。当前仓库只有 `pkg-c` 的构建产物有意义。
