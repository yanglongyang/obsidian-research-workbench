# Changelog

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
