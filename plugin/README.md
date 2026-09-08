# 科研工作台（Obsidian 插件）

一个本地优先的科研工作台：把任务、实验记录、数据资产、文献和写作入口集中到 Obsidian 中，同时保留 Markdown 文件作为可读、可迁移的数据源。

## 功能

- 任务创建、日期/优先级/分类管理和完成状态切换。
- 实验记录创建，支持目的、样品、方案、原始数据路径、结果和下一步等字段。
- “科研数据库”统一索引任务、实验、课题、数据、文献、写作和进展记录。
- 数据库记录显示原始 Markdown 路径，支持打开笔记和复制路径。
- 待解核磁扫描：识别 Bruker 原始采集目录，统计文件数量、大小和子目录。
- 核磁数据按氢谱/碳谱分类预检，并支持勾选后确认归档。
- 搜索工作台中的标题、状态、分类、标签和路径。

## 数据位置

- 任务：`00-博士工作台/应用数据/任务`
- 新建实验：`00-博士工作台/03-实验`
- 数据库索引：`00-博士工作台/应用数据/数据库/records.json`
- 原有 `实验记录` 目录只读扫描，不会被覆盖。

核磁目录目前在 `lib/nmr.js` 中配置为 Windows 路径；安装到其他电脑前请按自己的目录修改 `NMR_INBOX_FOLDER` 和 `NMR_ARCHIVE_FOLDER`。

## 构建

```powershell
node build-single-file.js
```

将 `plugin/main.js`、`plugin/manifest.json` 和 `plugin/styles.css` 放入 vault 的 `.obsidian/plugins/phd-command-center/` 目录，然后在 Obsidian 中重新加载插件。

## 使用

在 Obsidian 中点击左侧 `layout-dashboard` 图标，或运行命令“打开科研工作台”。插件默认不联网，不使用 DataviewJS，不会自动删除文件；核磁归档只有在用户勾选并确认后才会移动原始数据目录。
