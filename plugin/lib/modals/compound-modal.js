const { Modal, Notice, Setting } = require('obsidian');
const { createCompound } = require('../entities/compound');
const { generateRecordId } = require('../data');

class CompoundModal extends Modal {
  constructor(app, entityStore, options = {}) { super(app); this.entityStore = entityStore; this.options = options; this.state = { compoundCode: '', name: '', projectId: '', project: '', smiles: '', formula: '', molecularWeight: '', notes: '', saving: false }; }
  onOpen() {
    this.modalEl.addClass('phdcc-task-modal');
    this.contentEl.createEl('h2', { text: '新增化合物' });
    new Setting(this.contentEl).setName('化合物编号').addText((text) => { text.inputEl.required = true; text.inputEl.placeholder = '例如：YLY-145'; text.onChange((value) => { this.state.compoundCode = value; }); setTimeout(() => text.inputEl.focus(), 30); });
    new Setting(this.contentEl).setName('名称（可选）').addText((text) => text.onChange((value) => { this.state.name = value; }));
    this.addProjectSelect();
    new Setting(this.contentEl).setName('SMILES（可选）').addText((text) => text.onChange((value) => { this.state.smiles = value; }));
    new Setting(this.contentEl).setName('分子式（可选）').addText((text) => text.onChange((value) => { this.state.formula = value; }));
    new Setting(this.contentEl).setName('分子量（可选）').addText((text) => text.onChange((value) => { this.state.molecularWeight = value; }));
    new Setting(this.contentEl).setName('备注（可选）').addTextArea((area) => { area.inputEl.rows = 3; area.onChange((value) => { this.state.notes = value; }); });
    const footer = this.contentEl.createDiv({ cls: 'modal-button-container' });
    footer.createEl('button', { text: '取消', attr: { type: 'button' } }).addEventListener('click', () => this.close());
    const save = footer.createEl('button', { text: '创建化合物', cls: 'mod-cta', attr: { type: 'button' } });
    save.addEventListener('click', async () => { if (this.state.saving || !this.state.compoundCode.trim()) return void new Notice('请输入化合物编号'); this.state.saving = true; save.disabled = true; try { const file = await createCompound(this.app, this.state, generateRecordId); if (this.options.onCreated) await this.options.onCreated(file); this.close(); new Notice('化合物已创建'); } catch (error) { this.state.saving = false; save.disabled = false; new Notice(error instanceof Error ? error.message : '化合物创建失败'); } });
  }
  addProjectSelect() {
    const projects = this.entityStore.listProjects();
    new Setting(this.contentEl).setName('所属课题（可选）').addDropdown((dropdown) => { dropdown.addOption('', '不关联'); projects.forEach((project) => { if (project.id) dropdown.addOption(project.id, `${project.title} · ${project.id}`); }); dropdown.onChange((value) => { this.state.projectId = value; const project = projects.find((item) => item.id === value); this.state.project = project?.title || ''; }); });
  }
  onClose() { this.contentEl.empty(); }
}
module.exports = { CompoundModal };
