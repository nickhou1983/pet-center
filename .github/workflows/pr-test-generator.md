---
description: |
  每次 PR 新建/更新时，找出变更的代码，跑现有测试建立基线，
  为变更生成高价值单元测试，推到该 PR 分支，并评论总结。

on:
  pull_request:
    types: [opened, synchronize, reopened]
    # forks: ["*"]   # 需要允许 fork PR 时再打开（谨慎）

permissions: read-all

network:
  allowed:
    - defaults
    - node

tools:
  bash: true
  web-fetch:
  github:
    toolsets: [pull_requests, repos, actions]

safe-outputs:
  push-to-pull-request-branch:
  add-comment:
    max: 1

timeout-minutes: 25
---

# PR 单元测试生成器

仓库 ${{ github.repository }} 的 PR #${{ github.event.pull_request.number }} 刚被创建或更新。
你的任务是为本 PR 变更的代码生成高价值单元测试。本仓库是 Next.js 15 + TypeScript 项目。

步骤：

1. 若存在 `AGENTS.md`，先阅读并遵循其约定。
2. 找出本 PR 的变更文件（把 PR 分支与其基分支做对比；基分支名可用
   `gh pr view ${{ github.event.pull_request.number }} --json baseRefName -q .baseRefName` 或 GitHub 工具查询获取）。
   只关注变更的、可测试的源码文件（`.ts`/`.tsx`，如 `lib/`、`app/`、`components/` 下的工具函数与组件）；
   忽略文档、配置、`prisma/`、lock 文件、生成代码和纯样式改动。
3. 检查是否已配置测试框架：若 `package.json` 中没有测试运行器，则搭建 **Vitest**——
   安装 `vitest`、`@testing-library/react`、`@testing-library/jest-dom`、`jsdom` 等 devDependencies，
   添加最小的 `vitest.config.ts`（jsdom 环境）和 `"test": "vitest run"` 脚本；已存在则复用现有配置。
4. 先跑一次测试建立绿色基线；若因无关原因失败，记录说明并谨慎继续。
5. 为变更代码编写聚焦、有意义的单测：覆盖新增/改动的函数、分支、边界与错误路径；
   复用仓库既有测试风格与目录布局；不测第三方代码；不得为通过而弱化断言。
6. 运行新测试确保通过且不破坏既有测试；跑 `next lint` 并修复你新增文件的问题。
7. 把新测试文件（及首次搭建时的测试配置）推送到本 PR 分支，并在测试文件头部加上 AI 生成声明。
8. 在 PR 上发 1 条评论总结：为哪些文件加了测试、覆盖了什么行为、需人工复核之处。

仅改动测试相关文件（测试文件 + 首次搭建时的测试配置/依赖）。本工作流绝不修改生产源码。
若无法安全补测试（如行为不明），在评论里说明原因而非硬写。
