# Obsidian 科研工作台 / Research Workbench

一个本地优先的 Obsidian 科研信息系统，当前版本为 `v0.4.1` Research Entity Layer Final Closure。

## 架构原则

- Markdown 是科研记录的事实来源，始终可以直接阅读、移动和迁移。
- `00-博士工作台/应用数据/数据库/records.json` 是可重建的派生索引，不是黑箱数据库。
- `00-博士工作台/应用数据/审计/nmr-archive.jsonl` 记录核磁归档操作历史。
- 新建任务和实验带有永久 `record_id`；旧笔记使用明确标记的 `LEGACY-*` 路径派生 ID。
- 课题、实验、化合物和数据资产通过永久 ID 建立关系；支持旧记录永久 ID 迁移和关系完整性检查。
- NMR 归档成功后追加到同一份 `NMR 归档台账.md`，可选关联课题、实验和化合物；不会为每套核磁新建数据资产笔记。
- NMR 归档确认时可重命名批次文件夹（例如 `09082026-YLY-144`），并保留最末级扫描号（如 `10`、`11`）；会进行 Windows 名称和目标重名检查。
- 待解核磁支持“删除已选（永久）”：逐套展示精确来源路径，需再次勾选确认，只能删除待解目录内的原始采集文件夹，并写入审计。
- 关系完整性检查会报告缺失目标、类型错误、旧 ID、重复 ID、自引用和跨实体关系冲突。
- 永久 ID 迁移预览显示真实 Legacy ID；迁移只写入缺失的 `record_id`。

## 功能

- 任务、实验记录、课题、文献、写作与数据资产入口。
- 统一科研数据库索引和搜索。
- NMR Bruker 原始目录扫描、¹H/¹³C 分类、预检和显式确认归档；归档历史集中维护在一份可编辑台账中。
- 待处理队列：汇总 `E:\待测光谱`、`E:\待处理数据` 和 `E:\待完成文档` 的顶级项目，支持搜索、刷新、打开原始位置和创建处理任务；不自动移动外部文件。
- NMR 归档不自动删除、不覆盖目标，批量操作会报告成功、失败和未执行项目；需要清理时可使用独立的、明确确认的永久删除操作。
- 插件设置中可配置 NMR 待处理目录、归档目录和启动行为。
- 当前版本仅支持同一磁盘分区内归档；跨盘移动会在预检阶段拒绝。
- 本版本不包含 TLC、AI、SQLite 或全局搜索功能。
- v0.4.1 冻结 Research Entity Layer；后续新能力进入 v0.5.0+。

## 构建与测试

```powershell
npm test
npm run build
```

构建后，将 `plugin/main.js`、`plugin/manifest.json` 和 `plugin/styles.css` 复制到 Obsidian vault 的 `.obsidian/plugins/phd-command-center/`。

本版本声明为 Desktop-only，因为 NMR 文件系统集成使用 Node.js/Electron API。核心 Markdown、任务和数据库逻辑保持本地优先，未来可进一步拆分移动端能力。

详细功能和数据路径说明见 [`plugin/README.md`](plugin/README.md)。
