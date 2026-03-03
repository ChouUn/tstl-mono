> Parent: [index.md](./index.md)

# 单元测试技术选型

## 核心约束

本项目是 TSTL（TypeScriptToLua）monorepo，TypeScript 编译到 **Lua 5.3**，不产生 JS 运行时产物。这决定了两个基本问题：

1. **测什么** — TS 源码逻辑，还是 Lua 编译产物？
2. **怎么跑** — 在 Node.js 中跑，还是在 Lua 运行时中跑？

---

## 一、测试策略：为什么要测编译产物

| 策略 | 测 TS 源码 | 测 Lua 编译产物 |
|------|-----------|----------------|
| 能否发现 TSTL 编译 bug | 不能 | 能 |
| Lua API（`math.*`、`string.format`） | 需手动 mock | 原生可用 |
| Lua 语义差异（1-based index、`nil` vs `undefined`） | 不可见 | 可见 |
| 反馈速度 | 最快 | 稍慢（需编译） |

**结论**：demo 阶段代码简单，看不出差异。但面向工业级产品，TSTL 编译层是不可忽视的风险来源。**优先测试编译产物**。

---

## 二、Lua 执行方案对比

### 2.1 方案总览

```
A. Vitest/Jest + Mock Lua Globals   → 在 Node.js 中 mock Lua API，测 TS 源码
B. Vitest/Jest + Lua WASM           → 在 Node.js 中用 WASM VM 执行编译后的 Lua
C. Busted（busted-tstl）            → 在系统 Lua 中运行 BDD 风格测试
D. LuaUnit                          → 在系统 Lua 中运行 xUnit 风格测试
```

### 2.2 对比矩阵

| 维度 | A. Mock Lua | B. Lua WASM | C. Busted | D. LuaUnit |
|------|:-----------:|:-----------:|:---------:|:----------:|
| 测试目标 | TS 源码 | Lua 编译产物 | Lua 编译产物 | Lua 编译产物 |
| 运行环境 | Node.js | Node.js（WASM） | 系统 Lua | 系统 Lua |
| 系统依赖 | 无 | 无 | Lua + LuaRocks | Lua |
| Lua 5.3 兼容 | N/A | 支持 | 有已知问题 | 完全支持 |
| TS 类型声明 | 原生 | 原生 | 5 年未更新 | 无（纯 Lua） |
| 捕获编译 bug | 不能 | 能 | 能 | 能 |
| 搭建成本 | 低 | 中 | 中高 | 低 |

### 2.3 各方案详细分析

**A. Mock Lua Globals** — 将 `math.sqrt` 映射到 `Math.sqrt`，`print` 映射到 `console.log` 等。简单 API 可行，但 `string.format`（C 风格格式化 vs JS）难以准确模拟。更关键的是，完全跳过 TSTL 编译层，无法发现编译引入的 bug。**不推荐作为主策略。**

**B. Lua WASM**（`lua-wasm-bindings`）— TSTL 官方仓库自用的测试方式。在 Node.js 中通过 WASM 加载 Lua 5.3 VM，执行编译后的 Lua 代码。无需系统级 Lua 安装。风险：该库周下载量仅约 42，API 文档标注 "may be added in the future"。

**C. Busted** — Lua 生态最主流的测试框架（LuaRocks 590 万+ 下载），BDD 风格（describe/it）。但 `busted-tstl` 类型声明已 5 年未更新；Lua 5.3 上有兼容性问题（`luaL_checkint` 被移除、LuaFileSystem 版本冲突）。

**D. LuaUnit** — 单文件零依赖，完美支持 Lua 5.3。但没有 TS 类型声明，测试只能写纯 Lua，开发体验与 monorepo 其余部分脱节。

### 2.4 选型结论

**推荐方案 B：Lua WASM**（`lua-wasm-bindings`）。

理由：
- 测试真实 Lua 编译产物，覆盖 TSTL 编译层风险
- 零系统依赖（WASM），CI/本地一致性好
- TSTL 官方验证过的模式
- 留在 Node.js 工具链中，与项目其余基础设施一致

风险及应对：
- `lua-wasm-bindings` 成熟度低 → 先做技术验证 spike（见第四节）
- 如果 spike 失败，退路是方案 A（Mock Lua）用于纯逻辑 + 现有 e2e 覆盖集成

---

## 三、TS 测试框架对比

### 3.1 候选框架

| 维度 | Vitest 4.x | Jest 30.x | node:test |
|------|:----------:|:---------:|:---------:|
| TS 支持 | 零配置（esbuild 转译） | 需 ts-jest | Node 23.6+ 原生剥离类型 |
| ESM 支持 | 原生默认 | 实验性（`--experimental-vm-modules`） | 原生 |
| 冷启动速度 | 快 | 慢 | 最快 |
| Watch 模式 | 极快（Vite HMR 模块图感知） | 慢（整文件重跑） | 基础文件监听 |
| Mock 能力 | 成熟 | 成熟 | 实验性 |
| Monorepo paths | 支持 | 支持（需配置） | 不读 tsconfig paths |
| 依赖占用 | 中等 | 重（~460 传递依赖） | 零 |
| 维护前景 | VoidZero 全职投入 | Jest 30 距 29 隔了 3 年 | 随 Node.js 更新 |

### 3.2 关键差异

**Vitest**：2026 年新项目的主流选择。ESM + TS 零配置、watch 模式极快（~300ms）、monorepo 原生支持。风险是版本迭代快（2 → 3 → 4），大版本可能有 breaking changes。

**Jest**：TSTL 上游仓库在用（Jest 29 + ts-jest）。生态最成熟，但 ESM 支持仍标记为实验性（`unstable_mockModule`），发布节奏慢。选 Jest 的主要理由是与 TSTL 上游保持一致。

**node:test**：零依赖，但 `tsconfig.json` 的 `paths` 不支持（对 monorepo 是硬伤），mock 和覆盖率均为实验性，生态工具不成熟。

### 3.3 选型结论

**选定 Vitest**。

理由：
- ESM + TS 零配置，开箱即用
- Watch 模式极快（~300ms，Vite HMR 模块图感知），开发体验最佳
- Monorepo paths 原生支持
- VoidZero 全职维护，迭代活跃
- Jest 的 ESM 支持仍为实验性，node:test 不支持 tsconfig paths

---

## 四、测试目录结构

### 4.1 工业级 monorepo 调研

| 项目 | 测试位置 | 目录名 | 共享测试工具 |
|------|---------|--------|------------|
| **React** | `packages/<pkg>/src/__tests__/` | `__tests__`（在 src 内） | 独立包 `packages/internal-test-utils/` |
| **Vue** | `packages/<pkg>/__tests__/` | `__tests__`（与 src 平级） | 包内 `testUtils.ts` |
| **Babel** | `packages/<pkg>/test/` | `test/`（与 src 平级） | 包内 `test/helpers/` |
| **TypeScript** | 根级 `tests/` | `tests/`（集中式） | `src/harness/` |
| **Vitest** | 根级 `test/` | `test/`（集中式） | `test/test-utils/` |

三种模式：

- **A. 包内 src 里**（React）：测试和源码深度共存
- **B. 包内与 src 平级**（Vue、Babel）：源码目录干净，构建时容易排除
- **C. 根级集中式**（TypeScript、Vitest）：集中管理，但难以定位覆盖关系

多包库型 monorepo 最常用**模式 B**。模式 C 多见于非典型 monorepo（TypeScript 是单包、Vitest 需要 dogfood 自身）。

### 4.2 选型结论

采用**模式 B**（Vue/Babel 风格）：

```
packages/
├── pkg-a/
│   ├── __tests__/              # 单元测试
│   │   └── clamp.test.ts
│   └── math/
│       └── clamp.ts            # 源码
├── test-utils/                 # 共享测试工具（独立包）
│   └── src/
│       └── lua-exec.ts         # transpile + WASM execute helper
```

理由：
- 测试与源码同包，覆盖关系清晰
- `__tests__/` 与 `src/`（或源码目录）平级，构建时自然排除
- 共享测试工具（transpile + execute pipeline）独立成 `test-utils` 包，各包通过 workspace 引用

### 4.3 tsconfig 隔离

`test-utils` 包的 `tsconfig.json` **不继承 `tsconfig.base.json`**。

原因：`tsconfig.base.json` 设置了 `"types": ["lua-types/5.3"]`，会向全局注入 Lua 类型（`math`、`print` 等）。测试工具运行在 Node.js/Vitest 中，需要标准 Node 类型环境，两者冲突。

---

## 五、技术验证（Spike）计划

**目标**：用最小代码验证 Lua WASM 方案的可行性。

**验证内容**：

1. `lua-wasm-bindings` 能否在 Node.js 中正常加载 Lua 5.3 VM
2. Lua 标准库（`math.*`、`string.format`、`print`）是否完整可用
3. TSTL 编译 → WASM 执行的 pipeline 能否串通
4. Vitest 作为 runner 的集成体验
5. 开发体验是否可接受（速度、调试、错误信息）

**验证用例**：选取 `clamp(value, min, max)` 函数 —— 简单纯函数，使用 `math.max` + `math.min`。

**成功标准**：能在 test runner 中执行 `编译 TS → 生成 Lua → WASM 执行 → 断言结果` 全流程。

**失败退路**：退回方案 A（Vitest + Mock Lua Globals），纯逻辑测试 + 现有 e2e 覆盖集成场景。

### 5.2 Spike 结果

**状态：通过**。全链路 `TS → TSTL transpileString → Lua WASM 执行 → 断言` 验证成功。

**踩坑记录**：

1. **`types: ["lua-types/5.3"]` 在 `transpileString` 中不可用**
   - `transpileString` 创建虚拟 TS 程序，无法通过 pnpm 符号链接解析 `node_modules` 中的类型包
   - 解决方案：在 inline TS 代码前拼接 `declare` 声明（声明 `math`、`string`、`print` 等 Lua 全局 API）
   - TSTL 自身的测试采用不同策略：用 `lib: ["lib.esnext.d.ts"]` + `Math.sqrt()` JS 风格，由 builtin 转换器自动映射。但我们的源码用 Lua 风格（`math.sqrt`），测试代码应保持一致

2. **`lua_tonumber` 不存在**
   - Lua 5.3 中 `lua_tonumber` 是 C 宏（展开为 `lua_tonumberx(L, i, NULL)`），`lua-wasm-bindings` 不暴露
   - 解决方案：用 `lua_tostring` + `Number()` 读取数值。`lua_isstring` 对数字也返回 true（Lua 自动类型转换）

3. **TSTL 构建会拉入 `__tests__/` 文件**
   - pkg-c 的 `include: ["../pkg-a/**/*.ts"]` 匹配到了测试文件
   - 解决方案：在 pkg-c 的 tsconfig 中添加 `"exclude": ["../**/__tests__/**"]`

4. **Vitest resolve alias**
   - test-utils 作为 workspace 包，跨包 import 需要配置 resolve alias
   - 解决方案：在根级 `vitest.config.ts` 中配置 `resolve.alias: { "test-utils": "packages/test-utils" }`

**性能数据**（5 个测试，`pnpm test`）：
- 总耗时：~2.9s（含 Vitest 启动）
- 首个测试：~930ms（含 WASM 冷启动）
- 后续测试：~300-450ms 每个
