# Obsidian 科研工作台 / Research Workbench

一个本地优先的 Obsidian 科研信息系统，当前版本为 `v0.3.0` UI Refinement。

## 架构原则

- Markdown 是科研记录的事实来源，始终可以直接阅读、移动和迁移。
- `00-博士工作台/应用数据/数据库/records.json` 是可重建的派生索引，不是黑箱数据库。
- `00-博士工作台/应用数据/审计/nmr-archive.jsonl` 记录核磁归档操作历史。
- 新建任务和实验带有永久 `record_id`；旧笔记使用明确标记的 `LEGACY-*` 路径派生 ID。

## 功能

- 任务、实验记录、课题、文献、写作与数据资产入口。
- 统一科研数据库索引和搜索。
- NMR Bruker 原始目录扫描、¹H/¹³C 分类、预检和显式确认归档。
- NMR 归档不自动删除、不覆盖目标，批量操作会报告成功、失败和未执行项目。
- 插件设置中可配置 NMR 待处理目录、归档目录和启动行为。
- 当前版本仅支持同一磁盘分区内归档；跨盘移动会在预检阶段拒绝。

## 构建与测试

```powershell
npm test
npm run build
```

构建后，将 `plugin/main.js`、`plugin/manifest.json` 和 `plugin/styles.css` 复制到 Obsidian vault 的 `.obsidian/plugins/phd-command-center/`。

本版本声明为 Desktop-only，因为 NMR 文件系统集成使用 Node.js/Electron API。核心 Markdown、任务和数据库逻辑保持本地优先，未来可进一步拆分移动端能力。

详细功能和数据路径说明见 [`plugin/README.md`](plugin/README.md)。
