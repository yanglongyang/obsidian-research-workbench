const { Modal, Notice, Setting, normalizePath } = require('obsidian');

const DEFAULT_CANVAS_FOLDER = '00-博士工作台/08-白板';

function sanitizeCanvasName(value) {
  const clean = String(value || '')
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/^[\s.]+|[\s.]+$/g, '')
    .slice(0, 80)
    .replace(/^[\s.]+|[\s.]+$/g, '');
  return clean || '科研白板';
}

async function ensureFolder(vault, folder) {
  const target = normalizePath(folder || DEFAULT_CANVAS_FOLDER).replace(/\/+$/, '');
  if (!target || target.split('/').includes('..')) throw new Error('白板目录无效');
  let current = '';
  for (const segment of target.split('/').filter(Boolean)) {
    current = current ? `${current}/${segment}` : segment;
    if (vault.getAbstractFileByPath(current)) continue;
    try {
      await vault.createFolder(current);
    } catch (error) {
      if (!vault.getAbstractFileByPath(current)) throw error;
    }
  }
  return target;
}

function availableCanvasPath(vault, folder, title) {
  const safe = sanitizeCanvasName(title);
  let index = 1;
  let path = normalizePath(`${folder}/${safe}.canvas`);
  while (vault.getAbstractFileByPath(path)) {
    index += 1;
    path = normalizePath(`${folder}/${safe} ${index}.canvas`);
  }
  return path;
}

class CanvasCreateModal extends Modal {
  constructor(app, options = {}) {
    super(app);
    this.options = options;
    this.state = {
      title: String(options.title || ''),
      folder: String(options.folder || DEFAULT_CANVAS_FOLDER),
      openAfterCreate: options.openAfterCreate !== false,
      saving: false
    };
  }

  onOpen() {
    const { contentEl } = this;
    this.modalEl.addClass('phdcc-task-modal', 'phdcc-canvas-modal');
    contentEl.createEl('h2', { text: '新建白板' });
    contentEl.createDiv({ cls: 'phdcc-modal-subtitle', text: '创建原生 Obsidian Canvas，用于汇总文献、实验、结构式和科研思路。' });

    new Setting(contentEl).setName('名称').addText((text) => {
      text.inputEl.placeholder = '例如：GalP 机制与实验汇总';
      text.setValue(this.state.title);
      text.onChange((value) => { this.state.title = value; });
      window.setTimeout(() => text.inputEl.focus(), 50);
    });

    new Setting(contentEl).setName('保存位置').setDesc('Vault 内路径').addText((text) => {
      text.setValue(this.state.folder);
      text.onChange((value) => { this.state.folder = value; });
    });

    new Setting(contentEl).setName('创建后打开').addToggle((toggle) => {
      toggle.setValue(this.state.openAfterCreate);
      toggle.onChange((value) => { this.state.openAfterCreate = value; });
    });

    const footer = contentEl.createDiv({ cls: 'modal-button-container' });
    footer.createEl('button', { text: '取消', attr: { type: 'button' } }).addEventListener('click', () => this.close());
    const create = footer.createEl('button', { text: '创建白板', cls: 'mod-cta', attr: { type: 'button' } });
    create.addEventListener('click', () => { void this.submit(create); });
  }

  async submit(button) {
    if (this.state.saving) return;
    const title = sanitizeCanvasName(this.state.title);
    this.state.saving = true;
    button.disabled = true;
    try {
      const folder = await ensureFolder(this.app.vault, this.state.folder || DEFAULT_CANVAS_FOLDER);
      const path = availableCanvasPath(this.app.vault, folder, title);
      const file = await this.app.vault.create(path, JSON.stringify({ nodes: [], edges: [] }, null, 2) + '\n');
      this.close();
      if (this.state.openAfterCreate) await this.app.workspace.getLeaf(false).openFile(file);
      if (typeof this.options.onCreated === 'function') await this.options.onCreated(file);
      new Notice(`已创建白板：${file.basename}`);
    } catch (error) {
      this.state.saving = false;
      button.disabled = false;
      new Notice(error instanceof Error ? error.message : '创建白板失败');
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}

module.exports = { DEFAULT_CANVAS_FOLDER, CanvasCreateModal };
