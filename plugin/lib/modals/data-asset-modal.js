const { Modal, Notice, Setting } = require('obsidian');
const { createDataAsset, ASSET_TYPES } = require('../entities/data-asset');
const { generateRecordId } = require('../data');

const ASSET_LABELS = { nmr: 'NMR', hplc: 'HPLC', ms: 'MS', uvvis: 'UV-Vis', fluorescence: '荧光', image: '图像', orca: 'ORCA', raw: '原始数据', other: '其他' };

class DataAssetModal extends Modal {
  constructor(app, entityStore, options = {}) { super(app); this.entityStore = entityStore; this.options = options; this.state = { title: '', assetType: 'nmr', dataPath: '', projectId: '', project: '', experimentId: '', experiment: '', compoundId: '', compound: '', acquiredAt: '', notes: '', saving: false }; }
  onOpen() {
    this.modalEl.addClass('phdcc-task-modal');
    this.contentEl.createEl('h2', { text: '新增数据资产' });
    new Setting(this.contentEl).setName('标题').addText((text) => { text.inputEl.required = true; text.inputEl.placeholder = '例如：YLY-145 1H NMR'; text.onChange((value) => { this.state.title = value; }); setTimeout(() => text.inputEl.focus(), 30); });
    new Setting(this.contentEl).setName('类型').addDropdown((dropdown) => { ASSET_TYPES.forEach((type) => dropdown.addOption(type, ASSET_LABELS[type] || type)); dropdown.setValue(this.state.assetType); dropdown.onChange((value) => { this.state.assetType = value; }); });
    new Setting(this.contentEl).setName('数据路径').addText((text) => { text.inputEl.required = true; text.inputEl.placeholder = 'Vault 内路径或 Windows 外部路径'; text.onChange((value) => { this.state.dataPath = value; }); });
    this.addRelationSelect('project');
    this.addRelationSelect('experiment');
    this.addRelationSelect('compound');
    new Setting(this.contentEl).setName('采集日期（可选）').addText((text) => { text.inputEl.type = 'date'; text.onChange((value) => { this.state.acquiredAt = value; }); });
    new Setting(this.contentEl).setName('备注（可选）').addTextArea((area) => { area.inputEl.rows = 3; area.onChange((value) => { this.state.notes = value; }); });
    const footer = this.contentEl.createDiv({ cls: 'modal-button-container' });
    footer.createEl('button', { text: '取消', attr: { type: 'button' } }).addEventListener('click', () => this.close());
    const save = footer.createEl('button', { text: '创建数据资产', cls: 'mod-cta', attr: { type: 'button' } });
    save.addEventListener('click', async () => { if (this.state.saving || !this.state.title.trim() || !this.state.dataPath.trim()) return void new Notice('请填写标题和数据路径'); this.state.saving = true; save.disabled = true; try { const result = await createDataAsset(this.app, this.state, generateRecordId); if (this.options.onCreated) await this.options.onCreated(result.file, result.asset); this.close(); new Notice('数据资产已创建'); } catch (error) { this.state.saving = false; save.disabled = false; new Notice(error instanceof Error ? error.message : '数据资产创建失败'); } });
  }
  addRelationSelect(kind) {
    const config = { project: ['课题', this.entityStore.listProjects()], experiment: ['实验', this.entityStore.listExperiments()], compound: ['化合物', this.entityStore.listCompounds()] }[kind];
    const [label, items] = config;
    new Setting(this.contentEl).setName(`${label}（可选）`).addDropdown((dropdown) => { dropdown.addOption('', '不关联'); items.forEach((item) => { if (item.id) dropdown.addOption(item.id, `${item.title} · ${item.id}`); }); dropdown.onChange((value) => { this.state[`${kind}Id`] = value; const item = items.find((candidate) => candidate.id === value); this.state[kind] = item?.title || ''; }); });
  }
  onClose() { this.contentEl.empty(); }
}
module.exports = { DataAssetModal, ASSET_LABELS };
