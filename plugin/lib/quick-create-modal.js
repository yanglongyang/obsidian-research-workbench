const { Modal, setIcon } = require('obsidian');

class QuickCreateModal extends Modal {
  constructor(app, options = {}) {
    super(app);
    this.options = options;
  }

  onOpen() {
    this.modalEl.addClass('phdcc-task-modal', 'phdcc-quick-create-modal');
    this.contentEl.createEl('h2', { text: '快速新增' });
    this.contentEl.createDiv({ cls: 'phdcc-modal-subtitle', text: '选择要创建的科研对象' });
    const options = [
      ['check-square', '任务', '安排一个需要完成的工作', 'task'],
      ['test-tube', '实验记录', '记录实验目标、过程和下一步', 'experiment'],
      ['folder-kanban', '课题', '建立一个可关联实验和数据的课题', 'project'],
      ['atom', '化合物', '登记化合物与表征信息', 'compound'],
      ['database', '数据资产', '登记 NMR、HPLC、MS 等数据', 'data-asset'],
      ['notebook-pen', '今日复盘', '创建一条复盘任务', 'review']
    ];
    const list = this.contentEl.createDiv({ cls: 'phdcc-quick-create-list' });
    options.forEach(([icon, title, description, type], index) => {
      const button = list.createEl('button', { cls: 'phdcc-quick-create-option', attr: { type: 'button' } });
      const iconEl = button.createSpan({ cls: 'phdcc-quick-create-icon' });
      try { setIcon(iconEl, icon); } catch (error) { iconEl.setText('•'); }
      const copy = button.createSpan({ cls: 'phdcc-quick-create-copy' });
      copy.createSpan({ cls: 'phdcc-quick-create-title', text: title });
      copy.createSpan({ cls: 'phdcc-quick-create-description', text: description });
      button.addEventListener('click', () => {
        this.close();
        if (type === 'task' && typeof this.options.onTask === 'function') this.options.onTask();
        if (type === 'experiment' && typeof this.options.onExperiment === 'function') this.options.onExperiment();
        if (type === 'project' && typeof this.options.onProject === 'function') this.options.onProject();
        if (type === 'compound' && typeof this.options.onCompound === 'function') this.options.onCompound();
        if (type === 'data-asset' && typeof this.options.onDataAsset === 'function') this.options.onDataAsset();
        if (type === 'review' && typeof this.options.onReview === 'function') this.options.onReview();
      });
      if (index === 0) window.setTimeout(() => button.focus(), 50);
    });
    const footer = this.contentEl.createDiv({ cls: 'modal-button-container' });
    const cancel = footer.createEl('button', { text: '取消', attr: { type: 'button' } });
    cancel.addEventListener('click', () => this.close());
  }

  onClose() {
    this.contentEl.empty();
  }
}

module.exports = { QuickCreateModal };
