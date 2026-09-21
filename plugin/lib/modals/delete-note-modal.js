const { Modal, Notice } = require('obsidian');

class DeleteNoteModal extends Modal {
  constructor(app, file, options = {}) {
    super(app);
    this.file = file;
    this.options = options;
    this.deleting = false;
  }

  onOpen() {
    const { contentEl } = this;
    this.modalEl.addClass('phdcc-task-modal', 'phdcc-delete-note-modal');
    contentEl.createEl('h2', { text: '移到回收站？' });
    contentEl.createDiv({ cls: 'phdcc-modal-subtitle', text: '文件会按照 Obsidian 当前的删除设置处理，不会级联删除关联科研记录。' });

    const title = this.options.title || this.file?.basename || this.file?.name || '未命名文件';
    contentEl.createDiv({ cls: 'phdcc-delete-note-title', text: title });
    if (this.file?.path) contentEl.createDiv({ cls: 'phdcc-delete-note-path', text: this.file.path });
    if (this.options.recordId) contentEl.createDiv({ cls: 'phdcc-record-id', text: this.options.recordId });

    const relations = Array.isArray(this.options.relations) ? this.options.relations.filter((item) => Number(item?.count) > 0) : [];
    if (relations.length) {
      const warning = contentEl.createDiv({ cls: 'phdcc-delete-note-warning' });
      warning.createDiv({ cls: 'phdcc-delete-note-warning-title', text: '关联提醒' });
      relations.forEach((item) => warning.createDiv({ text: `${item.label}：${item.count}` }));
      warning.createDiv({ cls: 'phdcc-delete-note-warning-copy', text: '删除当前文件后，这些记录仍会保留；缺失引用会由“关系检查”继续提示。' });
    }

    const footer = contentEl.createDiv({ cls: 'modal-button-container' });
    const cancel = footer.createEl('button', { text: '取消', attr: { type: 'button' } });
    cancel.addEventListener('click', () => this.close());
    const remove = footer.createEl('button', { text: '移到回收站', cls: 'mod-warning phdcc-delete-note-confirm', attr: { type: 'button' } });
    remove.addEventListener('click', async () => {
      if (this.deleting || !this.file) return;
      this.deleting = true;
      remove.disabled = true;
      cancel.disabled = true;
      try {
        await this.app.fileManager.trashFile(this.file);
        this.close();
        new Notice(`已移到回收站：${title}`);
        if (typeof this.options.onDeleted === 'function') await this.options.onDeleted(this.file);
      } catch (error) {
        this.deleting = false;
        remove.disabled = false;
        cancel.disabled = false;
        new Notice(error instanceof Error ? error.message : '删除文件失败');
      }
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}

module.exports = { DeleteNoteModal };
