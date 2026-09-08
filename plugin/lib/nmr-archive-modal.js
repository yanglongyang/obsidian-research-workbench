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
    this.resultShown = false;
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
    if (this.resultShown) return void this.close();
    if (this.saving || this.errors.length || !this.plans.length) return;
    this.saving = true;
    this.ctaButton.disabled = true;
    this.ctaButton.setText('归档中…');
    try {
      const result = await this.nmrInboxStore.archiveSelected(this.plans.map((plan) => plan.relativeScanPath));
      if (typeof this.options.onArchived === 'function') await this.options.onArchived(result);
      if (result.status === 'completed') {
        this.close();
        new Notice(`已归档 ${result.archived.length} 套核磁原始数据`);
      } else {
        this.saving = false;
        this.resultShown = true;
        this.ctaButton.disabled = false;
        this.ctaButton.setText('关闭结果');
        this.ctaButton.onclick = () => this.close();
        this.body.empty();
        this.body.createDiv({ cls: 'phdcc-empty', text: `归档结果：${result.status === 'partial_failure' ? '部分成功' : '全部失败'}` });
        this.body.createDiv({ cls: 'phdcc-file-next', text: `成功 ${result.archived.length} · 失败 ${result.failed.length} · 未执行 ${result.skipped.length}` });
        result.failed.forEach((item) => this.body.createDiv({ cls: 'phdcc-file-next', text: `${item.plan?.relativeScanPath || ''}：${item.error}` }));
        new Notice(`核磁归档完成：成功 ${result.archived.length}，失败 ${result.failed.length}，未执行 ${result.skipped.length}`);
      }
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
