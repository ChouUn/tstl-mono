> Parent: [index.md](../index.md)

# 以 git submodule 方式接入 package 的补充要点

## 背景
本教程仅讨论“submodule 特有”事项。新增 package 的通用步骤（`pkg-c` 的 `paths/include`、`workspace:*` 依赖、构建验证等）请先参考：
- [新增一个 package（通用流程）](./add-package.md)

## submodule 额外步骤
1. 添加 submodule：
   - `git submodule add <repo-url> packages/pkg-x`
2. 初始化并拉取内容：
   - `git submodule update --init --recursive`
3. 提交主仓库变更（包含 `.gitmodules` 与 submodule 指针）。

## CI / 新环境注意事项
1. 克隆后必须初始化 submodule，否则 `packages/pkg-x` 可能为空目录。
2. 在 CI 中显式执行：
   - `git submodule update --init --recursive`
3. 排查时优先看：
   - `git submodule status`

## 版本升级与协作要点
1. submodule 升级本质是“更新指针”，主仓库提交的是目标 commit 引用。
2. 升级后需要在主仓库再次提交，团队成员拉取后同步 submodule 才会拿到新版本。
3. 若出现“本地能编译、他人不能编译”，优先检查是否忘记提交 submodule 指针变更。

## 常见问题
1. **submodule 会改变当前 monorepo 的编译模型吗？**
   - 不会。`pkg-c` 仍是唯一 bundle 入口，submodule 只改变 package 的来源方式。
2. **submodule 适合什么场景？**
   - 适合需要独立版本管理、跨仓库复用，但又希望在本仓库按源码接入的 package。
