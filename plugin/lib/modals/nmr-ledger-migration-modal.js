const { Modal, Notice } = require('obsidian');
const { legacyNmrAssets, consolidateLegacyNmrAssets } = require('../entities/nmr-ledger');

class NmrLedgerMigrationModal extends Modal {
  constructor(app, options = {}) {
    super(app);
    this.options = options;
    this.items = [];
    this.confirmed = false;
    this.busy = false;
  }

  onOpen() {
    this.modalEl.addClass('phdcc-task-modal');
    this.contentEl.createEl('h2', { text: '合并旧核磁数据资产' });
    this.contentEl.createDiv({ cls: 'phdcc-empty', text: '旧的“每套一份”NMR 数据资产会被写入 NMR 归档台账；确认成功后，原单条笔记将移入 Obsidian 回收站，可恢复。原始核磁数据文件不会移动或删除。' });
    this.body = this.contentEl.createDiv();
    this.items = legacyNmrAssets(this.app);
    this.renderPreview();
    const confirmation = this.contentEl.createDiv({ cls: 'phdcc-archive-checks' });
    this.checkbox = confirmation.createEl('input', { attr: { type: 'checkbox', 'aria-label': '确认合并旧核磁数据资产' } });
    confirmation.createSpan({ text: '我确认将这些旧单条笔记合并，并移入 Obsidian 回收站。' });
    this.checkbox.addEventListener('change', () => { this.confirmed = this.checkbox.checked; this.updateButton(); });
    const footer = this.contentEl.createDiv({ cls: 'modal-button-container' });
    const cancel = footer.createEl('button', { text: '取消', type: 'button' });
    cancel.addEventListener('click', () => this.close());
    this.button = footer.createEl('button', { text: '无需合并', cls: 'mod-cta', type: 'button' });
    this.button.addEventListener('click', () => { void this.submit(); });
    this.updateButton();
  }

  renderPreview() {
    this.body.empty();
    if (!this.items.length) return void this.body.createDiv({ cls: 'phdcc-empty', text: '没有发现旧的单条 NMR 数据资产。' });
    this.body.createDiv({ cls: 'phdcc-file-meta', text: `将合并 ${this.items.length} 条：` });
    this.items.forEach(({ file, frontmatter }) => this.body.createDiv({ cls: 'phdcc-file-next', text: `${frontmatter.title || file.basename} · ${file.path}` }));
  }

  updateButton() {
    if (!this.button) return;
    this.button.disabled = this.busy || !this.items.length || !this.confirmed;
    this.button.setText(this.busy ? '合并中…' : !this.items.length ? '无需合并' : !this.confirmed ? '请先确认' : `合并 ${this.items.length} 条记录`);
  }

  async submit() {
    if (this.busy || !this.confirmed || !this.items.length) return;
    this.busy = true;
    this.checkbox.disabled = true;
    this.updateButton();
    try {
      const result = await consolidateLegacyNmrAssets(this.app);
      if (typeof this.options.onCompleted === 'function') await this.options.onCompleted(result);
      const summary = `核磁台账合并完成：${result.migrated.length} 条已合并，${result.skipped.length} 条跳过，${result.failed.length} 条失败。`;
      new Notice(summary);
      this.body.empty();
      this.body.createDiv({ cls: 'phdcc-empty', text: summary });
      result.skipped.forEach((item) => this.body.createDiv({ cls: 'phdcc-file-next', text: `跳过：${item.file.path} · ${item.reason}` }));
      result.failed.forEach((item) => this.body.createDiv({ cls: 'phdcc-file-next', text: `失败：${item.file.path} · ${item.error}` }));
      this.button.disabled = false;
      this.button.setText('关闭');
      this.button.onclick = () => this.close();
    } catch (error) {
      this.busy = false;
      this.checkbox.disabled = false;
      this.updateButton();
      new Notice(error instanceof Error ? error.message : '合并失败');
    }
  }

  onClose() { this.contentEl.empty(); }
}

module.exports = { NmrLedgerMigrationModal };
