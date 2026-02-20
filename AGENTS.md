<!-- AI-KIT:START -->
# AGENTS.md（入口索引）

本文件是 **code-proxy-admin** 仓库的 AI 规范入口索引（根目录必须保留）。  
目标：让 Agent **按需读取**、低噪声、可追溯地开发，而不是把所有规则堆在一个文件里。

## 0. 必读与优先级（冲突时从高到低）

1. `shrimp-rules.md`（项目硬性约束，最高优先级）
2. `rules/base.md`（通用基线：角色定位、语言、行为优先级）
3. 任务相关专项规则（见下方索引）
4. `docs/evolution.md`（演进记录：仅在需要追溯决策/变更原因时阅读）

## 1. 渐进式按需读取规则（必须遵守）

- 每次任务先判断类型，再 **按需读取** 对应规则文件；禁止一次性通读全部规则（避免噪声与误用）。
- 若不确定适用范围：先读 `rules/base.md`，再扩展到专项规则。
- 交付前必须执行 `rules/workflow.md` 的“交付自检清单”（优雅/复用/冗余/类型/编译/可运行）。
- 若属于复杂改造/大范围重构：按 `rules/workflow.md` 的“会话文档落盘（分级）”要求，在 `.sisyphus/sessions/<session>/plan/` 记录计划/变更/验证（目录约定可按项目调整）。

- **项目路径/目录结构变更联动（强制）**：任何新增/移动/重命名目录或文件、调整导出入口、调整别名（如 `tsconfig.json#paths`）等“路径变更”，必须同步更新相关规范文件：至少更新 `AGENTS.md`（索引/任务映射/关键路径），并按需更新 `rules/project-structure.md`、`README.md` 与 `docs/evolution.md`（涉及结构性变更时）。
- 规则冲突时选择 **更严格** / **更高优先级** 的限制。

## 2. 任务类型 → 必读规则（必须遵守）

- 页面/组件/布局/样式：`shrimp-rules.md`、`rules/base.md`、`rules/frontend.md`、`rules/quality.md`、`rules/workflow.md`、`rules/tooling.md`
- 目录结构/模块重构：上述规则 + `rules/project-structure.md`、`rules/naming.md`
- 后端/API/数据：`shrimp-rules.md`、`rules/base.md`、`rules/quality.md`、`rules/workflow.md`、`rules/tooling.md`
- 依赖升级/版本固定：`shrimp-rules.md`、`rules/base.md`、`rules/quality.md`、`rules/tooling.md`（必要时用 Context7 核对，不要猜）
- 规则维护/新增规范：`rules/rules-authoring.md`（并同步更新本文件索引）

## 3. 规则索引（rules/）

- `rules/base.md`：角色定位、语言、优先级、输出基准
- `rules/workflow.md`：执行流程、交付自检清单、风险操作确认
- `rules/quality.md`：架构原则、代码质量、性能与测试
- `rules/project-structure.md`：目录职责、依赖方向、最小模块化策略
- `rules/tooling.md`：常用命令、构建校验、升级与验证约定
- `rules/naming.md`：命名规范（文件/组件/hook/常量）
- `rules/frontend.md`：前端样式与组件约定（无前端则忽略）
- `rules/rules-authoring.md`：规范写作与演进方式

## 4. 文档归档（docs/）

- `docs/evolution.md`：演进记录（时间线 + 关键决策）
- （可选）`docs/optimization-plan.md`：可维护性优化计划（按需）
- （可选）`docs/adr/*`：架构决策记录（按需）

## 5. 常用命令（按需补全）

- 安装依赖：`bun install`
- 开发启动：`bun run dev`
- 构建：`bun run build`
- 测试：暂无（当前仓库未配置测试框架/用例）
- Lint：`bun run lint`
- 格式化：`bun run format`
- 一键验证：`bun run check`

## 6. 关键路径速查（按需补全）

- 应用入口：`src/main.tsx`
- 主要模块目录：`src/`
- 关键配置文件：`package.json`, `tsconfig.json`, `vite.config.ts`

## 7. 项目内 Skills（可选）

- 如果出现重复性工作流（如“生成会话文档”“批量重构”“生成规范”），建议在 `.agents/skills/` 下创建项目内技能，并在此处索引。
<!-- AI-KIT:END -->

<!-- PROJECT-OVERRIDES:START -->
（可选）在此处追加本项目特有的关键路径、命令、约束与注意事项。该区块不会被生成脚本覆盖。
<!-- PROJECT-OVERRIDES:END -->
