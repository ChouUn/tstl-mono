# TSTL Monorepo Demo

演示如何使用 [TypeScriptToLua](https://typescripttolua.github.io/) + pnpm workspace 构建多包 monorepo，并通过 `luaBundle` 打包为单个 Lua 文件。

## 目录结构

```
tstl-mono/
├── packages/
│   ├── pkg-a/              # 基础库（数学工具、日志、格式化）
│   ├── pkg-b/              # 单位系统（依赖 pkg-a）
│   ├── pkg-c/              # 主入口（依赖 pkg-a + pkg-b + pkg-engine-api，luaBundle 打包）
│   ├── pkg-engine-api/     # 引擎 API 类型声明（纯 .d.ts，Global + Module 双模型）
│   └── e2e-engine-api/     # 引擎 API 的 E2E 测试（Lua stubs）
├── docs/                   # 项目文档
├── biome.json              # Biome 代码质量配置
├── tsconfig.base.json      # 共享编译选项
└── pnpm-workspace.yaml
```

## 依赖关系

```
pkg-c ──→ pkg-b ──→ pkg-a
  ├───────────────→ pkg-a
  └───────────────→ pkg-engine-api

e2e-engine-api ──→ dist/bundle.lua (构建产物)
```

## 使用

```bash
pnpm install
pnpm build            # 构建 pkg-c → dist/bundle.lua
lua dist/bundle.lua   # 运行
```

## 代码质量

```bash
pnpm check            # Biome: 格式化 + lint + import 排序（一条命令全搞定）
pnpm format           # Biome: 仅格式化
pnpm lint             # Biome: 仅 lint
```

- [Biome 2.x](https://biomejs.dev/) 统一处理格式化、lint 和 import 排序
- [simple-git-hooks](https://github.com/toplenboren/simple-git-hooks) 在每次 commit 前自动运行 `biome check --staged`

## 关键设计

- 采用 **源码编译** 模式：pkg-c 通过 `tsconfig.json` 的 `paths` 直接引用 pkg-a/pkg-b 的 TypeScript 源码，而非编译产物
- pkg-a/pkg-b 不单独构建，它们的 `tsconfig.json` 仅供 IDE 使用
- pkg-engine-api 提供 **Global + Module 双模型** 的引擎 API 类型声明，通过 `noResolvePaths` 实现运行时动态加载
- 目标环境：Lua 5.3（Warcraft III）
