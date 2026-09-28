const { Modal, Notice } = require('obsidian');

function resourcePath(app, file) {
  if (typeof app?.vault?.getResourcePath === 'function') return app.vault.getResourcePath(file);
  if (typeof app?.vault?.adapter?.getResourcePath === 'function') return app.vault.adapter.getResourcePath(file.path);
  return file?.path || '';
}

class CompoundStructureModal extends Modal {
  constructor(app, compound, candidates = [], options = {}) {
    super(app);
    this.compound = compound;
    this.candidates = [...new Set(candidates || [])].filter(Boolean);
    this.options = options;
    this.saving = false;
  }

  onOpen() {
    this.modalEl.addClass('phdcc-task-modal', 'phdcc-structure-picker-modal');
    const { contentEl } = this;
    contentEl.createEl('h2', { text: '选择主结构式' });
    contentEl.createDiv({ cls: 'phdcc-modal-subtitle', text: '选择 Compound Registry 中用于预览的 ChemDraw 结构。其他结构不会被删除。' });
    const grid = contentEl.createDiv({ cls: 'phdcc-structure-picker-grid' });
    if (!this.candidates.length) grid.createDiv({ cls: 'phdcc-empty', text: '当前笔记中没有找到可选择的 ChemDraw 预览图。' });
    this.candidates.forEach((candidate) => {
      const file = this.app.vault.getAbstractFileByPath(candidate);
      if (!file) return;
      const card = grid.createEl('button', { cls: 'phdcc-structure-picker-card', attr: { type: 'button', title: candidate } });
      const img = card.createEl('img', { attr: { alt: candidate } });
      img.src = `${resourcePath(this.app, file)}${file.stat?.mtime ? `?mtime=${file.stat.mtime}` : ''}`;
      card.createDiv({ cls: 'phdcc-structure-picker-name', text: file.name });
      card.addEventListener('click', () => { void this.select(candidate, card); });
    });
    const footer = contentEl.createDiv({ cls: 'modal-button-container' });
    footer.createEl('button', { text: '取消', attr: { type: 'button' } }).addEventListener('click', () => this.close());
  }

  async select(candidate, button) {
    if (this.saving || !this.compound?.file) return;
    this.saving = true;
    button.disabled = true;
    try {
      if (!this.app?.fileManager?.processFrontMatter) throw new Error('当前 Obsidian 版本不支持更新 frontmatter');
      await this.app.fileManager.processFrontMatter(this.compound.file, (frontmatter) => {
        frontmatter.structure_preview = candidate;
        frontmatter.updated = new Date().toISOString();
      });
      if (typeof this.options.onSelected === 'function') await this.options.onSelected(candidate);
      this.close();
      new Notice('主结构式已更新');
    } catch (error) {
      this.saving = false;
      button.disabled = false;
      new Notice(error instanceof Error ? error.message : '更新主结构式失败');
    }
  }

  onClose() { this.contentEl.empty(); }
}

module.exports = { CompoundStructureModal };
