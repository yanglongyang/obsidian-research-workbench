const { Modal, Notice, Setting } = require('obsidian');
const { createProject } = require('../entities/project');
const { generateRecordId } = require('../data');

class ProjectModal extends Modal {
  constructor(app, options = {}) { super(app); this.options = options; this.state = { title: '', description: '', nextAction: '', saving: false }; }
  onOpen() {
    this.modalEl.addClass('phdcc-task-modal');
    this.contentEl.createEl('h2', { text: '新增课题' });
    new Setting(this.contentEl).setName('课题名称').addText((text) => { text.inputEl.required = true; text.inputEl.placeholder = '例如：β-Galactosidase Probe'; text.onChange((value) => { this.state.title = value; }); setTimeout(() => text.inputEl.focus(), 30); });
    new Setting(this.contentEl).setName('简介（可选）').addTextArea((area) => { area.inputEl.rows = 3; area.onChange((value) => { this.state.description = value; }); });
    new Setting(this.contentEl).setName('下一步（可选）').addText((text) => text.onChange((value) => { this.state.nextAction = value; }));
    const footer = this.contentEl.createDiv({ cls: 'modal-button-container' });
    footer.createEl('button', { text: '取消', attr: { type: 'button' } }).addEventListener('click', () => this.close());
    const save = footer.createEl('button', { text: '创建课题', cls: 'mod-cta', attr: { type: 'button' } });
    save.addEventListener('click', async () => { if (this.state.saving || !this.state.title.trim()) return void new Notice('请输入课题名称'); this.state.saving = true; save.disabled = true; try { const file = await createProject(this.app, this.state, generateRecordId); if (this.options.onCreated) await this.options.onCreated(file); this.close(); new Notice('课题已创建'); } catch (error) { this.state.saving = false; save.disabled = false; new Notice(error instanceof Error ? error.message : '课题创建失败'); } });
  }
  onClose() { this.contentEl.empty(); }
}
module.exports = { ProjectModal };
