# 国际化路由全量修复方案

## 1. 目标

- 修复管理端在中英文切换时仍出现中英混杂的问题。
- 覆盖当前活跃路由页面、布局壳层、共享 UI、Toast/Modal/EmptyState 等用户可见文案入口。
- 收敛旧 `src/pages/*` 与新 `src/modules/*` 两套路由实现造成的国际化分叉。

## 2. 范围

### 2.1 活跃路由

当前真实生效路由定义在 `src/app/AppRouter.tsx`，包含：

- `/login` → `src/modules/login/LoginPage.tsx`
- `/dashboard` → `src/modules/dashboard/DashboardPage.tsx`
- `/monitor`、`/monitor/request-logs` → `src/modules/monitor/*`
- `/ai-providers` → `src/modules/providers/ProvidersPage.tsx`
- `/auth-files` → `src/modules/auth-files/AuthFilesPage.tsx`
- `/oauth` → `src/modules/oauth/OAuthPage.tsx`
- `/quota` → `src/modules/quota/QuotaPage.tsx`
- `/config` → `src/modules/config/ConfigPage.tsx`
- `/logs` → `src/modules/logs/LogsPage.tsx`
- `/system` → `src/modules/system/SystemPage.tsx`
- `/api-keys` → `src/modules/api-keys/ApiKeysPage.tsx`
- `/models` → `src/modules/models/ModelsPage.tsx`
- `/apikey-lookup` → `src/modules/apikey-lookup/ApiKeyLookupPage.tsx`

### 2.2 关联共享层

- `src/modules/ui/AppShell.tsx`
- `src/modules/ui/LanguageSelector.tsx`
- `src/modules/ui/ConfirmModal.tsx`
- `src/modules/ui/ToastProvider.tsx`
- `src/modules/ui/VirtualTable.tsx`
- `src/modules/monitor/*` 下被多个页面复用的图表/弹窗/表格组件
- `src/modules/providers/*` 下编辑器与列表组件
- `src/i18n/index.ts`
- `src/i18n/locales/*.json`

### 2.3 历史实现

- `src/router/MainRoutes.tsx` 仍维护旧 `src/pages/*` 路由体系
- `src/management.tsx`、`src/App.tsx`、`src/pages/*` 属于历史入口/历史页面
- 这些历史文件虽不一定是默认构建入口，但仍可能继续承载旧文案和旧 key，影响后续维护与误改

## 3. 已确认问题

## 3.1 语言包不对齐

- `zh-CN.json` 共 `2365` 个 key，`en.json` 共 `2158` 个 key，`zh-CN` 比 `en` 多 `207` 个 key。
- 按源码 `t("...")` 静态扫描，当前使用中的 key 里有 `219` 个在 `en.json` 缺失。
- 缺失集中在这些命名空间：
  - `providers`：84
  - `api_keys_page`：67
  - `models_page`：27
  - `common`：7
  - `ai_providers`：6
  - `auth_files`：6
- 这意味着即便页面写成 `t("...")`，切到英文后仍会回退到中文。

## 3.2 活跃页面硬编码文案

已确认存在直接写死文案的代表性位置：

- `src/modules/login/LoginPage.tsx`
  - 登录失败/成功/必填提示仍为英文硬编码，如 `Enter management key`、`Login successful`、`Login failed, check address and key`
  - 地址输入 placeholder 仍写死为 `e.g. http://localhost:8317`
- `src/modules/oauth/OAuthPage.tsx`
  - 页面按钮与状态区混有中文和英文硬编码，如 `开始授权`、`授权链接`、`复制`、`打开`、`状态：`、`Polling...`、`Success`
  - 多个 Toast 为英文拼接，如 `Authorization successful`、`Copy failed`、`Please enter Cookie`
- `src/modules/auth-files/AuthFilesPage.tsx`
  - 错误提示与批量操作结果仍有英文硬编码，如 `Failed to load auth files`、`All auth files deleted`
  - 局部 UI 仍有中文硬编码，如 `共 {count} 条`
  - 多处 loading 文案仍为 `Loading…`
- `src/modules/providers/ProvidersPage.tsx`
  - Tab 工具栏按钮仍有中文硬编码，如 `刷新`
  - 多个表单 placeholder 仍为业务侧英文原样暴露，如 `proxyUrl`、`baseUrl`、`testModel`
- `src/modules/apikey-lookup/ApiKeyLookupPage.tsx`
  - 统计摘要和表格描述混有英文硬编码，如 `records`、`Token`、`Request Logs Table`、`No request logs in this time range`、`Loading…`
  - 个别 `t(key, fallback)` 仍直接带中文 fallback，例如 `请求数`

## 3.3 共享层会放大混乱

- `src/modules/ui/LanguageSelector.tsx` 当前直接把中文简称 `"中"` 作为按钮显示的一部分，语言名称策略需要统一。
- `src/modules/monitor/ErrorDetailModal.tsx`、`src/modules/monitor/LogContentModal.tsx`、`src/modules/ui/VirtualTable.tsx` 一类共享组件包含 `Loading…`、caption、emptyText 等用户可见默认文案，若不统一治理，会在多个路由页重复漏改。
- 部分提示文案来自运行时字符串拼接，而不是稳定 key，后续很难校验覆盖率。

## 3.4 旧新页面并存，造成国际化分叉

- 当前活跃路由使用 `src/modules/*`。
- 旧路由 `src/router/MainRoutes.tsx` 仍引用大量 `src/pages/*` 页面。
- 仓库内还有 `src/manage-entry.tsx`、`src/management.tsx`、`src/App.tsx` 等历史入口。
- 如果只修活跃 `modules`，后续仍可能在旧页面上继续补 key 或复制旧文案，造成回归。

## 4. 根因判断

### 方案判断

更优雅方案（Recommended）：

- 先建立“活跃路由唯一文案源”原则，只以 `src/app/AppRouter.tsx` 对应的 `src/modules/*` 页面为主线修复。
- 再补齐 `en.json` 缺失 key，并把共享组件默认文案全部改为 `t("...")` 或由调用方注入。
- 最后处理历史 `src/pages/*` 路径：要么明确标记弃用，要么收口到共享 key，避免双轨维护。

原因：

- 改动面可控，先解决真实用户路径。
- 与当前架构一致，避免直接回到旧页面体系里补洞。
- 后续可以用扫描脚本持续校验 key 覆盖率和硬编码残留，回归风险更低。

不推荐方案：

- 直接全仓库盲改所有中文/英文字符串。

原因：

- 容易误伤接口字段、占位格式、模型名、外链文案和日志原文。
- 无法区分活跃页面与历史废弃页面，投入大但收益不稳定。

## 5. 实施策略

### 阶段 A：建立审计基线

- 以 `src/app/AppRouter.tsx` 为单一入口生成活跃路由清单。
- 扫描这些页面及其直接依赖组件中的：
  - 硬编码中文
  - 硬编码英文
  - `t(key, fallback)` 中的中文 fallback
  - `notify` / `Modal` / `Confirm` / `placeholder` / `caption` / `emptyText` 文案
- 输出“文件 -> 文案类型 -> 修复方式”的表格。

### 阶段 B：统一 key 与命名空间

- 先补齐 `en.json` 中所有活跃页面使用的缺失 key。
- 复查 `zh-CN.json` 与 `en.json` 是否结构对齐。
- 对动态 key 保留白名单，避免把模板字符串误报为缺失。
- 为共享 UI 建立统一 key 约定，例如：
  - `common.loading`
  - `common.copy_failed`
  - `common.records`
  - `table.request_logs_caption`

### 阶段 C：修复活跃路由页面

- 先修高频页面：
  - `login`
  - `oauth`
  - `auth-files`
  - `providers`
  - `apikey-lookup`
- 再修剩余页面与复用组件。
- 优先把运行时拼接文案拆成稳定 key + 参数插值，而不是继续字符串拼接。

### 阶段 D：收口历史页面与入口

- 识别 `src/pages/*`、`src/router/MainRoutes.tsx`、`src/App.tsx` 是否仍有构建/发布价值。
- 若仅为历史遗留：
  - 标注弃用范围
  - 避免后续国际化继续在旧页面上补丁式演进
- 若仍需保留：
  - 与新 `modules` 页面复用同一套语言 key
  - 至少保证活跃入口不会再引用旧文案

### 阶段 E：验证与守护

- 增加静态校验脚本或最小审计命令，至少校验：
  - 活跃路由页面中的硬编码可见文本
  - `en.json` / `zh-CN.json` key 差异
  - 共享组件默认文案未走 i18n
- 执行 `bun run lint`、`bun run build`。
- 若已有可测页面，补充关键国际化回归测试或最少快照/渲染断言。

## 6. 风险

- 动态 key 与业务原样字符串混在一起，简单正则会有误报。
- placeholder 中部分英文是产品约定术语，不能一律翻译。
- 历史页面如果仍由其他隐藏入口使用，直接忽略会留下线上遗漏。

## 7. 回滚策略

- 以命名空间为单位提交，避免一次提交覆盖所有语言包与页面。
- 每个阶段分别验证构建和关键页面。
- 历史页面仅做收口说明前，不做删除动作。

## 8. 验收标准

- 活跃路由页面切换到英文后，不再出现中文回退文案。
- 切换到中文后，不再出现明显英文 UI 文案（模型名、品牌名、技术术语除外）。
- `zh-CN.json` 与 `en.json` 的活跃 key 覆盖率一致。
- 共享组件默认提示文案全部进入 i18n 体系或由上层注入。
- `bun run lint`、`bun run build` 通过。
