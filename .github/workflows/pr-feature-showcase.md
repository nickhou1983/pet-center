---
description: |
  每次 PR 新建/更新时，分析 PR 新增的功能，生成一个自包含的 HTML 展示页，
  用一个独立 PR 承载该 HTML，并在原 PR 上评论链接。

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions: read-all

network: defaults

tools:
  bash: true
  web-fetch:
  github:
    toolsets: [pull_requests, repos]

safe-outputs:
  create-pull-request:
    draft: true
    title-prefix: "[feature-showcase] "
    labels: [documentation, showcase]
  add-comment:
    max: 1

timeout-minutes: 20
---

# PR 功能展示页生成器

仓库 ${{ github.repository }} 的 PR #${{ github.event.pull_request.number }}
（标题："${{ github.event.pull_request.title }}"）被创建。
请生成一个美观、自包含的 HTML 页，介绍本 PR 新增的功能。

步骤：

1. 阅读 PR 标题、描述，以及变更 diff（可用 `gh pr diff ${{ github.event.pull_request.number }}` 获取 PR 分支与其基分支的差异；
   基分支名可用 `gh pr view ${{ github.event.pull_request.number }} --json baseRefName -q .baseRefName` 获取），
   理解本次新增的面向用户的功能或能力。
2. 在 `docs/showcase/pr-${{ github.event.pull_request.number }}.html` 生成单个自包含 HTML 文件：
   - 内联全部 CSS（及必要的少量 JS），无需构建即可独立打开。
   - 包含：功能名称、一句话“是什么&为什么”、关键能力亮点、一个简单的使用/前后对比示例、
     以及回链到 PR #${{ github.event.pull_request.number }}。
   - 采用简洁、现代、响应式的样式，专业易读。
   - 内容严格基于真实变更，不得编造 diff 中不存在的功能。
3. 开一个只含这个 HTML 文件的新 PR。
4. 在原 PR #${{ github.event.pull_request.number }} 上发 1 条评论，说明已生成展示页并附上新 PR 链接。

仅改动这一个 HTML 文件，不修改任何源码。
