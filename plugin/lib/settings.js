const { PluginSettingTab, Setting, Notice } = require('obsidian');

const DEFAULT_SETTINGS = {
  openOnStartup: false,
  workbenchRootFolder: '00-博士工作台',
  nmrInboxFolder: '',
  nmrArchiveFolder: ''
};

function mergeSettings(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    ...DEFAULT_SETTINGS,
    ...source,
    openOnStartup: Boolean(source.openOnStartup ?? DEFAULT_SETTINGS.openOnStartup),
    workbenchRootFolder: String(source.workbenchRootFolder ?? DEFAULT_SETTINGS.workbenchRootFolder).trim(),
    nmrInboxFolder: String(source.nmrInboxFolder ?? DEFAULT_SETTINGS.nmrInboxFolder).trim(),
    nmrArchiveFolder: String(source.nmrArchiveFolder ?? DEFAULT_SETTINGS.nmrArchiveFolder).trim()
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

    new Setting(containerEl)
      .setName('工作台根目录')
      .setDesc('用于说明和未来目录管理；当前数据库仍兼容既有 00-博士工作台 结构。')
      .addText((text) => text
        .setValue(this.plugin.settings.workbenchRootFolder)
        .onChange(async (value) => {
          this.plugin.settings.workbenchRootFolder = value.trim();
          await this.plugin.saveSettings();
        }));

    containerEl.createEl('h3', { text: '核磁文件夹' });
    containerEl.createEl('p', { text: '路径只在实际使用时检查。插件不会自动移动、删除或覆盖原始数据。' });
    this.addPathSetting(containerEl, 'NMR 待处理目录', '扫描 Bruker 原始采集目录的文件夹。', 'nmrInboxFolder');
    this.addPathSetting(containerEl, 'NMR 归档目录', '按氢谱/碳谱分类的目标根目录。', 'nmrArchiveFolder');
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
          if (!this.plugin.settings[key]) new Notice(`${name}为空，NMR页面将提示配置路径。`);
        }));
  }
}

module.exports = { DEFAULT_SETTINGS, mergeSettings, ResearchWorkbenchSettingTab };
