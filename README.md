# TSTL Monorepo Demo

演示如何使用 [TypeScriptToLua](https://typescripttolua.github.io/) + pnpm workspace 构建多包 monorepo，并通过 `luaBundle` 打包为单个 Lua 文件。

## 目录结构

```
tstl-mono/
├── packages/
│   ├── pkg-a/          # 基础库（数学工具、日志、格式化）
│   ├── pkg-b/          # 单位系统（依赖 pkg-a）
│   └── pkg-c/          # 主入口（依赖 pkg-a + pkg-b，luaBundle 打包）
├── tsconfig.base.json  # 共享编译选项
└── pnpm-workspace.yaml
```

## 依赖关系

```
pkg-c ──→ pkg-b ──→ pkg-a
  └───────────────→ pkg-a
```

## 使用

```bash
pnpm install
pnpm build          # 构建 pkg-c → packages/pkg-c/dist/bundle.lua
lua packages/pkg-c/dist/bundle.lua
```

## 关键设计

- 采用 **源码编译** 模式：pkg-c 通过 `tsconfig.json` 的 `paths` 直接引用 pkg-a/pkg-b 的 TypeScript 源码，而非编译产物
- pkg-a/pkg-b 不单独构建，它们的 `tsconfig.json` 仅供 IDE 使用
- 目标环境：Lua 5.3（Warcraft III）
