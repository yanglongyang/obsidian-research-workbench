const { Modal, Notice, Setting } = require('obsidian');
const {
  CHARACTERIZATION_TYPES,
  typeLabel,
  normalizeCharacterizationLinks,
  isAbsoluteExternalPath,
  openExternalPath,
  setCharacterizationLinks
} = require('../entities/compound-characterization');

class CompoundCharacterizationModal extends Modal {
  constructor(app, file, options = {}) {
    super(app);
    this.file = file;
    this.options = options;
    this.state = {
      links: normalizeCharacterizationLinks(options.links),
      type: '1h-nmr',
      label: '¹H NMR',
      path: '',
      saving: false
    };
  }

  onOpen() {
    this.modalEl.addClass('phdcc-task-modal', 'phdcc-characterization-modal');
    this.render();
  }

  render() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: '关联表征文件' });
    contentEl.createDiv({ cls: 'phdcc-modal-subtitle', text: '只保存外部文件或文件夹路径；不会扫描、复制或导入原始数据。' });

    const current = contentEl.createDiv({ cls: 'phdcc-characterization-current' });
    current.createDiv({ cls: 'phdcc-characterization-section-title', text: `已关联 ${this.state.links.length} 项` });
    if (!this.state.links.length) {
      current.createDiv({ cls: 'phdcc-characterization-empty', text: '暂未关联表征文件。' });
    } else {
      this.state.links.forEach((link, index) => {
        const row = current.createDiv({ cls: 'phdcc-characterization-link-row' });
        const copy = row.createDiv({ cls: 'phdcc-characterization-link-copy' });
        copy.createDiv({ cls: 'phdcc-characterization-link-label', text: link.label || typeLabel(link.type) });
        copy.createDiv({ cls: 'phdcc-characterization-link-path', text: link.path });
        const actions = row.createDiv({ cls: 'phdcc-characterization-link-actions' });
        const open = actions.createEl('button', { text: '打开', attr: { type: 'button' } });
        open.addEventListener('click', async () => {
          try { await openExternalPath(link.path); }
          catch (error) { new Notice(error instanceof Error ? error.message : '无法打开表征文件'); }
        });
        const remove = actions.createEl('button', { text: '移除', cls: 'mod-warning', attr: { type: 'button' } });
        remove.addEventListener('click', () => {
          this.state.links.splice(index, 1);
          this.render();
        });
      });
    }

    contentEl.createDiv({ cls: 'phdcc-characterization-section-title is-add', text: '新增关联' });

    new Setting(contentEl).setName('类型').addDropdown((dropdown) => {
      CHARACTERIZATION_TYPES.forEach((item) => dropdown.addOption(item.value, item.label));
      dropdown.setValue(this.state.type);
      dropdown.onChange((value) => {
        const previousDefault = typeLabel(this.state.type);
        this.state.type = value;
        if (!this.state.label.trim() || this.state.label === previousDefault) this.state.label = typeLabel(value);
        this.render();
      });
    });

    new Setting(contentEl).setName('显示名称').addText((text) => {
      text.setValue(this.state.label);
      text.inputEl.placeholder = '例如：¹H NMR';
      text.onChange((value) => { this.state.label = value; });
    });

    new Setting(contentEl).setName('文件或文件夹路径').setDesc('填写已经归档好的外部绝对路径').addText((text) => {
      text.setValue(this.state.path);
      text.inputEl.placeholder = '例如：E:\\核磁归档\\YLY-146\\1H';
      text.onChange((value) => { this.state.path = value; });
    });

    const addRow = contentEl.createDiv({ cls: 'phdcc-characterization-add-row' });
    const add = addRow.createEl('button', { text: '+ 添加到列表', attr: { type: 'button' } });
    add.addEventListener('click', () => {
      const externalPath = this.state.path.trim();
      if (!externalPath) return void new Notice('请填写文件或文件夹路径');
      if (!isAbsoluteExternalPath(externalPath)) return void new Notice('请输入绝对路径');
      const type = this.state.type || 'other';
      this.state.links.push({ type, label: this.state.label.trim() || typeLabel(type), path: externalPath });
      this.state.path = '';
      this.render();
    });

    const footer = contentEl.createDiv({ cls: 'modal-button-container' });
    footer.createEl('button', { text: '取消', attr: { type: 'button' } }).addEventListener('click', () => this.close());
    const save = footer.createEl('button', { text: '保存关联', cls: 'mod-cta', attr: { type: 'button' } });
    save.addEventListener('click', async () => {
      if (this.state.saving) return;
      this.state.saving = true;
      save.disabled = true;
      try {
        const links = await setCharacterizationLinks(this.app, this.file, this.state.links);
        if (typeof this.options.onSaved === 'function') await this.options.onSaved(links);
        this.close();
        new Notice('表征关联已保存');
      } catch (error) {
        this.state.saving = false;
        save.disabled = false;
        new Notice(error instanceof Error ? error.message : '保存表征关联失败');
      }
    });
  }

  onClose() { this.contentEl.empty(); }
}

module.exports = { CompoundCharacterizationModal };
