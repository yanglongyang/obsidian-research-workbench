const { PluginSettingTab, Setting, Notice } = require('obsidian');

const DEFAULT_SETTINGS = {
  openOnStartup: false,
  nmrInboxFolder: '',
  nmrArchiveFolder: '',
  spectrumInboxFolder: 'E:\\待测光谱',
  processingInboxFolder: 'E:\\待处理数据',
  documentInboxFolder: 'E:\\待完成文档',
  uiState: { activeSection: 'today' }
};

function mergeSettings(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    ...DEFAULT_SETTINGS,
    ...source,
    openOnStartup: Boolean(source.openOnStartup ?? DEFAULT_SETTINGS.openOnStartup),
    nmrInboxFolder: String(source.nmrInboxFolder ?? DEFAULT_SETTINGS.nmrInboxFolder).trim(),
    nmrArchiveFolder: String(source.nmrArchiveFolder ?? DEFAULT_SETTINGS.nmrArchiveFolder).trim(),
    spectrumInboxFolder: String(source.spectrumInboxFolder ?? DEFAULT_SETTINGS.spectrumInboxFolder).trim(),
    processingInboxFolder: String(source.processingInboxFolder ?? DEFAULT_SETTINGS.processingInboxFolder).trim(),
    documentInboxFolder: String(source.documentInboxFolder ?? DEFAULT_SETTINGS.documentInboxFolder).trim(),
    uiState: {
      activeSection: typeof source.uiState?.activeSection === 'string' ? source.uiState.activeSection : DEFAULT_SETTINGS.uiState.activeSection
    }
  };
}

class ResearchWorkbenchSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: '科研工作台设置' });
    containerEl.createEl('p', { text: 'Markdown 笔记仍是事实来源；这些设置只控制插件索引和核磁文件操作。' });

    new Setting(containerEl)
      .setName('启动时打开科研工作台')
      .setDesc('关闭后，插件加载不会自动抢占当前工作区。')
      .addToggle((toggle) => toggle
        .setValue(Boolean(this.plugin.settings.openOnStartup))
        .onChange(async (value) => {
          this.plugin.settings.openOnStartup = value;
          await this.plugin.saveSettings();
        }));

    const rootInfo = containerEl.createDiv({ cls: 'setting-item-description' });
    rootInfo.setText('工作台根目录：00-博士工作台（当前版本固定，避免出现设置已修改但目录未迁移的误导）。');

    containerEl.createEl('h3', { text: '核磁文件夹' });
    containerEl.createEl('p', { text: '路径只在实际使用时检查。插件不会自动移动、删除或覆盖原始数据。' });
    this.addPathSetting(containerEl, 'NMR 待处理目录', '扫描 Bruker 原始采集目录的文件夹。', 'nmrInboxFolder');
    this.addPathSetting(containerEl, 'NMR 归档目录', '按氢谱/碳谱分类的目标根目录。', 'nmrArchiveFolder');

    containerEl.createEl('h3', { text: '待处理队列目录' });
    containerEl.createEl('p', { text: '看板按顶级文件夹或根目录文件汇总，默认只读扫描；不会自动移动、删除或改写外部文件。待处理数据中的“待解核磁”由专门的核磁页面管理，不会重复列出。' });
    this.addPathSetting(containerEl, '待测光谱目录', '例如荧光、紫外、质谱等待分析数据。', 'spectrumInboxFolder');
    this.addPathSetting(containerEl, '待处理数据目录', '例如成像、MTT、HPLC、流式等数据。', 'processingInboxFolder');
    this.addPathSetting(containerEl, '待完成文档目录', '待整理的课题文档、图表和写作材料。', 'documentInboxFolder');
  }

  addPathSetting(containerEl, name, description, key) {
    new Setting(containerEl)
      .setName(name)
      .setDesc(description)
      .addText((text) => text
        .setPlaceholder('例如：D:\\科研数据\\待解核磁')
        .setValue(this.plugin.settings[key] || '')
        .onChange(async (value) => {
          this.plugin.settings[key] = value.trim();
          await this.plugin.saveSettings();
          if (!this.plugin.settings[key]) new Notice(`${name}为空，对应看板将提示配置路径。`);
        }));
  }
}

module.exports = { DEFAULT_SETTINGS, mergeSettings, ResearchWorkbenchSettingTab };
