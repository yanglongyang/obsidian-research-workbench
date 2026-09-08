const { Modal, Notice } = require('obsidian');

class NmrArchiveModal extends Modal {
  constructor(app, nmrInboxStore, relativePaths, options = {}) {
    super(app);
    this.nmrInboxStore = nmrInboxStore;
    this.relativePaths = relativePaths;
    this.options = options;
    this.plans = [];
    this.errors = [];
    this.saving = false;
    this.ctaButton = null;
    this.body = null;
  }

  onOpen() {
    this.modalEl.addClass('phdcc-task-modal');
    this.contentEl.createEl('h2', { text: '确认归档核磁原始数据' });
    this.body = this.contentEl.createDiv();
    this.body.createDiv({ cls: 'phdcc-empty', text: '正在检查来源、核种和目标路径…' });
    const footer = this.contentEl.createDiv({ cls: 'modal-button-container' });
    const cancel = footer.createEl('button', { text: '取消', type: 'button' });
    cancel.addEventListener('click', () => this.close());
    this.ctaButton = footer.createEl('button', { text: '预检中…', cls: 'mod-cta', type: 'button' });
    this.ctaButton.disabled = true;
    this.ctaButton.addEventListener('click', () => { void this.submit(); });
    void this.prepare();
  }

  async prepare() {
    try {
      const result = await this.nmrInboxStore.preflightArchive(this.relativePaths);
      this.plans = result.plans;
      this.errors = result.errors;
      this.renderPlan();
      this.ctaButton.disabled = this.errors.length > 0 || this.plans.length === 0;
      this.ctaButton.setText(this.ctaButton.disabled ? '存在阻塞项' : `确认归档 ${this.plans.length} 套`);
    } catch (error) {
      this.errors = [error instanceof Error ? error.message : '预检失败'];
      this.renderPlan();
      this.ctaButton.disabled = true;
      this.ctaButton.setText('预检失败');
    }
  }

  renderPlan() {
    this.body.empty();
    if (this.errors.length) {
      this.body.createDiv({ cls: 'phdcc-empty', text: '以下项目不能归档；请取消后调整选择。' });
      this.errors.forEach((error) => this.body.createDiv({ cls: 'phdcc-file-next', text: error }));
    }
    this.plans.forEach((plan) => {
      const row = this.body.createDiv({ cls: 'phdcc-file-row' });
      row.createDiv({ cls: 'phdcc-file-title', text: `${plan.nucleus === '1H' ? '¹H 氢谱' : '¹³C 碳谱'} · ${plan.relativeScanPath}` });
      row.createDiv({ cls: 'phdcc-file-meta', text: `${plan.scanFolder} → ${plan.destinationPath}` });
      if (plan.siblingFiles.length) row.createDiv({ cls: 'phdcc-file-next', text: `提示：同级有 ${plan.siblingFiles.length} 个附带文件，不会随原始采集目录移动。` });
    });
    if (this.plans.length && !this.errors.length) this.body.createDiv({ cls: 'phdcc-file-next', text: '确认后将整套移动原始采集目录（含 fid、acqus、pdata）；不会覆盖目标、不会删除空的来源目录。' });
  }

  async submit() {
    if (this.saving || this.errors.length || !this.plans.length) return;
    this.saving = true;
    this.ctaButton.disabled = true;
    this.ctaButton.setText('归档中…');
    try {
      const moved = await this.nmrInboxStore.archiveSelected(this.plans.map((plan) => plan.relativeScanPath));
      if (typeof this.options.onArchived === 'function') await this.options.onArchived(moved);
      this.close();
      new Notice(`已归档 ${moved.length} 套核磁原始数据`);
    } catch (error) {
      this.saving = false;
      this.ctaButton.disabled = false;
      this.ctaButton.setText('归档失败');
      new Notice(error instanceof Error ? error.message : '核磁归档失败');
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}

module.exports = { NmrArchiveModal };
