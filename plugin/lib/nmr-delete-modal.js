const { Modal, Notice } = require('obsidian');

class NmrDeleteModal extends Modal {
  constructor(app, nmrInboxStore, relativePaths, options = {}) {
    super(app);
    this.nmrInboxStore = nmrInboxStore;
    this.relativePaths = relativePaths;
    this.options = options;
    this.plans = [];
    this.errors = [];
    this.saving = false;
    this.resultShown = false;
    this.confirmed = false;
  }

  onOpen() {
    this.modalEl.addClass('phdcc-task-modal');
    this.contentEl.createEl('h2', { text: '确认永久删除核磁原始数据' });
    this.contentEl.createDiv({
      cls: 'phdcc-empty',
      text: '此操作会永久删除待解目录中的整套原始采集文件夹（例如 fid、acqus、pdata），无法恢复；不会影响任何归档目录。'
    });
    this.body = this.contentEl.createDiv();
    this.body.createDiv({ cls: 'phdcc-empty', text: '正在校验待删除的精确路径…' });

    const confirmation = this.contentEl.createDiv({ cls: 'phdcc-archive-checks' });
    this.confirmationInput = confirmation.createEl('input', { attr: { type: 'checkbox', 'aria-label': '确认永久删除' } });
    confirmation.createSpan({ text: '我确认永久删除下列原始数据，且已不再需要它们。' });
    this.confirmationInput.addEventListener('change', () => {
      this.confirmed = this.confirmationInput.checked;
      this.updateCta();
    });

    const footer = this.contentEl.createDiv({ cls: 'modal-button-container' });
    const cancel = footer.createEl('button', { text: '取消', type: 'button' });
    cancel.addEventListener('click', () => this.close());
    this.ctaButton = footer.createEl('button', { text: '预检中…', cls: 'mod-warning', type: 'button' });
    this.ctaButton.disabled = true;
    this.ctaButton.addEventListener('click', () => { void this.submit(); });
    void this.prepare();
  }

  async prepare() {
    try {
      const result = await this.nmrInboxStore.preflightDelete(this.relativePaths);
      this.plans = result.plans;
      this.errors = result.errors;
    } catch (error) {
      this.plans = [];
      this.errors = [error instanceof Error ? error.message : '预检失败'];
    }
    this.renderPlan();
    this.updateCta();
  }

  updateCta() {
    if (!this.ctaButton || this.resultShown) return;
    const canDelete = !this.errors.length && this.plans.length > 0 && this.confirmed && !this.saving;
    this.ctaButton.disabled = !canDelete;
    if (this.saving) this.ctaButton.setText('删除中…');
    else if (this.errors.length) this.ctaButton.setText('存在阻塞项');
    else if (!this.plans.length) this.ctaButton.setText('没有可删除项');
    else if (!this.confirmed) this.ctaButton.setText('请先确认');
    else this.ctaButton.setText(`永久删除 ${this.plans.length} 套`);
  }

  renderPlan() {
    this.body.empty();
    if (this.errors.length) {
      this.body.createDiv({ cls: 'phdcc-empty', text: '以下项目不能删除；请取消后调整选择。' });
      this.errors.forEach((error) => this.body.createDiv({ cls: 'phdcc-file-next', text: error }));
    }
    this.plans.forEach((plan) => {
      const row = this.body.createDiv({ cls: 'phdcc-file-row' });
      row.createDiv({ cls: 'phdcc-file-title', text: `${plan.nucleus || '待核对'} · ${plan.relativeScanPath}` });
      row.createDiv({ cls: 'phdcc-archive-label', text: '将永久删除' });
      row.createDiv({ cls: 'phdcc-archive-path', text: plan.sourcePath });
      row.createDiv({ cls: 'phdcc-file-next', text: `${plan.fileCount} 个文件 · ${plan.directoryCount} 个子目录 · ${formatBytes(plan.totalBytes)}` });
    });
  }

  async submit() {
    if (this.resultShown) return void this.close();
    if (this.saving || this.errors.length || !this.plans.length || !this.confirmed) return;
    this.saving = true;
    this.confirmationInput.disabled = true;
    this.updateCta();
    try {
      const result = await this.nmrInboxStore.deleteSelected(this.plans.map((plan) => plan.relativeScanPath));
      if (typeof this.options.onDeleted === 'function') await this.options.onDeleted(result);
      if (result.status === 'completed') {
        this.close();
        new Notice(`已永久删除 ${result.deleted.length} 套待解核磁原始数据`);
        return;
      }
      this.saving = false;
      this.resultShown = true;
      this.body.empty();
      this.body.createDiv({ cls: 'phdcc-empty', text: `删除结果：${result.status === 'partial_failure' ? '部分成功' : '全部失败'}` });
      this.body.createDiv({ cls: 'phdcc-file-next', text: `已删除 ${result.deleted.length} · 失败 ${result.failed.length} · 审计异常 ${result.auditErrors?.length || 0}` });
      result.failed.forEach((item) => this.body.createDiv({ cls: 'phdcc-file-next', text: `${item.plan?.relativeScanPath || ''}：${item.error}` }));
      result.auditErrors?.forEach((item) => this.body.createDiv({ cls: 'phdcc-file-next', text: `${item.plan?.relativeScanPath || ''}：数据已删除，但最终审计写入失败：${item.error}` }));
      this.ctaButton.disabled = false;
      this.ctaButton.setText('关闭结果');
      this.ctaButton.onclick = () => this.close();
      new Notice(`核磁删除完成：已删除 ${result.deleted.length}，失败 ${result.failed.length}`);
    } catch (error) {
      this.saving = false;
      this.confirmationInput.disabled = false;
      this.updateCta();
      new Notice(error instanceof Error ? error.message : '核磁删除失败');
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}

function formatBytes(value) {
  const bytes = Number(value) || 0;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

module.exports = { NmrDeleteModal };
