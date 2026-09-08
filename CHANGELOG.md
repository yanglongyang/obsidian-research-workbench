# Changelog

## 0.4.1 — Entity Layer Final Closure

### Fixed

- 永久 ID 迁移预览改为显示真实 `LEGACY-*` 身份，并增加 apply 阶段 TOCTOU 跳过保护。
- 实体 selector 只接受合法且类型匹配的永久 ID。
- 关系检查增加跨 Project / Experiment / Compound / DataAsset 的 `relation_conflict` 检测。
- 实验和 NMR 关系下拉框增加轻量联动与冲突提醒。
- 锁定 NMR → DataAsset 的成功、注册失败、最终审计失败和 started 审计失败语义。

### Changed

- 扩充实体创建、迁移、关系、数据库 schema v3 和 NMR 回归测试。
- Research Entity Layer 在 v0.4.1 冻结，后续新科研能力进入 v0.5.0+。

## 0.4.0 — Research Entity Layer

### Added

- 课题、化合物、数据资产实体及其 Markdown 文件入口。
- 永久 ID 迁移、关系完整性检查和重复/缺失/错误类型/旧 ID/自引用诊断。
- NMR 归档后自动登记 `data-asset`，支持关联课题、实验和化合物。
- Quick Create 新增课题、化合物和数据资产入口。

### Scope

- 本版本明确排除 TLC、AI、SQLite、移动端核心和全局搜索。

## 0.3.1 — UI Closure

### Fixed

- Quick Create 命令在工作台关闭时会先激活视图再打开新增菜单。
- 修正 NMR 行的三列布局和窄窗口换行。
- 未知核种（包括 19F、31P）统一显示 warning badge。
- Sidebar 导航改为可 Tab/Enter/Space 操作的按钮，并标记当前页面。
- Quick Create Modal 继承科研工作台主题变量。
- 切换页面时清空当前页搜索条件。

## 0.3.0 — UI Refinement

### Added

- Quick Create：任务、实验记录和今日复盘入口。
- 科研数据库类型、状态和课题筛选。
- 统一状态/优先级/NMR badge，以及重复 ID 折叠警告。
- activeSection 页面状态持久化。

### Changed

- 精简 Sidebar 信息架构并移除无功能头像。
- 概览改为紧凑 KPI 和今日优先任务。
- 实验记录改为结构化状态、课题、日期和下一步列表。
- NMR 改为处理队列式行，并在归档确认中展示来源、目标和安全检查。
- 搜索 placeholder 改为“搜索当前页面…”，与实际行为一致。

## 0.2.1 — Data Foundation Final Closure

### Added

- 重复永久 ID 检测和数据库页面警告。
- 真实 NMR preflight/archive 回归测试。

### Fixed

- 修复科研文件从受管目录移出时不触发数据库刷新的 rename 边界。
- NMR 归档改为 started → move → success/failed 两阶段审计。
- 归档预检拒绝跨磁盘分区移动。
- 移除无实际迁移能力的可编辑工作台根目录设置。

## 0.2.0 — Data Foundation

### Added

- Settings：NMR 路径、工作台根目录和启动行为。
- 任务/实验永久 `record_id`。
- NMR JSONL 审计日志和批量归档结果。
- 数据库 schema v2、关系字段预留和基础测试。

### Changed

- 数据库明确为 Markdown 的派生索引。
- 旧记录使用 `LEGACY-*` 身份标识。
- 数据库刷新过滤非受管路径，并排除派生文件。
- 插件声明为 Desktop-only。

### Fixed

- 路径身份不再被误认为稳定身份。
- NMR 路径不再必须修改源码。
- 启动时不再默认抢占工作区。
