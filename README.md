# Obsidian 科研工作台

一个本地优先的 Obsidian 科研工作台插件，集中管理任务、实验记录、科研数据库索引、数据资产和核磁原始数据归档。

完整插件文件位于 [`plugin/`](plugin/)。构建单文件插件：

```powershell
node build-single-file.js
```

安装时将 `plugin/main.js`、`plugin/manifest.json` 和 `plugin/styles.css` 放入 Obsidian vault 的 `.obsidian/plugins/phd-command-center/` 目录。

详细功能和数据路径说明见 [`plugin/README.md`](plugin/README.md)。
