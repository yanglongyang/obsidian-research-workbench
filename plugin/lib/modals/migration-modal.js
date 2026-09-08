const { Modal, Notice } = require('obsidian');
const { PermanentIdMigration } = require('../migrations/permanent-id');
const { generateRecordId } = require('../data');

class MigrationModal extends Modal {
  constructor(app, plugin, options = {}) {
    super(app);
    this.plugin = plugin;
    this.options = options;
    this.migration = new PermanentIdMigration(plugin, generateRecordId);
    this.items = [];
    this.busy = false;
  }

  onOpen() {
    this.modalEl.addClass('phdcc-task-modal');
    this.contentEl.createEl('h2', { text: '永久 ID 迁移' });
    this.contentEl.createEl('p', { text: '为仍使用旧路径识别的任务、实验和课题补写永久 record_id。只会新增缺失字段，不会移动或改写其他内容。' });
    this.previewEl = this.contentEl.createDiv({ cls: 'phdcc-migration-preview' });
    this.buttonEl = this.contentEl.createEl('button', { text: '扫描旧记录', cls: 'mod-cta', attr: { type: 'button' } });
    this.buttonEl.addEventListener('click', () => { if (this.items.length) void this.apply(); else this.scan(); });
    this.scan();
  }

  scan() {
    this.items = this.migration.scan();
    this.renderPreview();
  }

  renderPreview() {
    this.previewEl.empty();
    if (!this.items.length) {
      this.previewEl.createEl('p', { text: '没有发现需要迁移的旧记录。' });
      this.buttonEl.disabled = true;
      this.buttonEl.textContent = '无需迁移';
      return;
    }
    this.previewEl.createEl('p', { text: `发现 ${this.items.length} 条记录，确认后写入永久 ID：` });
    const list = this.previewEl.createEl('ul');
    this.items.slice(0, 20).forEach((item) => list.createEl('li', { text: `${item.title} · ${item.type} → ${item.proposedId}` }));
    if (this.items.length > 20) this.previewEl.createEl('p', { text: `另有 ${this.items.length - 20} 条未展开。` });
    this.buttonEl.disabled = false;
    this.buttonEl.textContent = `确认迁移 ${this.items.length} 条记录`;
  }

  async apply() {
    if (this.busy || !this.items.length) return;
    this.busy = true;
    this.buttonEl.disabled = true;
    this.buttonEl.textContent = '迁移中…';
    const result = await this.migration.apply(this.items);
    const failedText = result.failed.length ? `，失败 ${result.failed.length} 条` : '';
    new Notice(`永久 ID 迁移完成：成功 ${result.migrated.length} 条${failedText}`);
    this.previewEl.createEl('p', { text: `结果：${result.status}；成功 ${result.migrated.length} 条${failedText}` });
    if (this.options.onCompleted) await this.options.onCompleted(result);
    this.close();
  }

  onClose() { this.contentEl.empty(); }
}

module.exports = { MigrationModal };
