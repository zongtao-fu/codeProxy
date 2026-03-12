# tasks

## 当前状态

- 状态: `DEVELOP 完成，已完成首轮修复与验证`
- 计划包: `202603121500_i18n-route-audit`
- 更新时间: `2026-03-12 15:55:48 +08:00`

## 执行清单

- [x] 基于 `src/app/AppRouter.tsx` 生成活跃路由页面与直接依赖组件清单
- [x] 为活跃路由页面扫描并登记所有硬编码中文/英文可见文案
- [x] 为 `notify`、`Modal`、`placeholder`、`caption`、`emptyText` 等入口建立统一审计口径
- [x] 补齐 `src/i18n/locales/en.json` 中活跃页面缺失 key
- [x] 复查 `src/i18n/locales/zh-CN.json` 与 `src/i18n/locales/en.json` 命名空间对齐
- [x] 修复 `src/modules/login/LoginPage.tsx` 中硬编码通知与 placeholder
- [x] 修复 `src/modules/oauth/OAuthPage.tsx` 中混合中英按钮、状态文案与 Toast
- [x] 修复 `src/modules/auth-files/AuthFilesPage.tsx` 中批量操作、加载态和局部计数文案
- [x] 修复 `src/modules/providers/ProvidersPage.tsx` 中工具栏按钮、placeholder 与提示文案
- [x] 修复 `src/modules/apikey-lookup/ApiKeyLookupPage.tsx` 中统计摘要、表格 caption、加载态与 fallback 文案
- [x] 复查 `src/modules/ui/LanguageSelector.tsx`、`src/modules/ui/VirtualTable.tsx`、`src/modules/monitor/*Modal.tsx` 等共享组件默认文案
- [ ] 评估 `src/router/MainRoutes.tsx`、`src/pages/*`、`src/management.tsx`、`src/App.tsx` 的保留策略，并明确“弃用/迁移/继续维护”结论
- [ ] 增加最小国际化审计脚本或命令，防止新增硬编码回归
- [x] 执行 `bun run lint`
- [x] 执行 `bun run build`

## 本次规划结论

- [x] 已确认当前活跃路由入口在 `src/app/AppRouter.tsx`
- [x] 已确认 `en.json` 相比 `zh-CN.json` 至少缺失 `207` 个 key
- [x] 已确认活跃页面存在大量硬编码文案，重点集中在 `login`、`oauth`、`auth-files`、`providers`、`apikey-lookup`
- [x] 已确认旧 `src/pages/*` 路由体系仍保留，需要在实施阶段明确收口策略
