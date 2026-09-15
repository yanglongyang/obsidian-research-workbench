const { Modal, Notice, Setting } = require('obsidian');
const { createDataAsset, ASSET_TYPES } = require('../entities/data-asset');
const { generateRecordId } = require('../data');

const ASSET_LABELS = { nmr: 'NMR', hplc: 'HPLC', ms: 'MS', uvvis: 'UV-Vis', fluorescence: '荧光', image: '图像', orca: 'ORCA', raw: '原始数据', other: '其他' };
const MANUAL_ASSET_TYPES = ASSET_TYPES.filter((type) => type !== 'nmr');

function validateDataAssetRelations(state, entityStore) {
  const projects = entityStore.listProjects(); const experiments = entityStore.listExperiments(); const compounds = entityStore.listCompounds(); const errors = [];
  const project = projects.find((item) => item.id === state.projectId); const experiment = experiments.find((item) => item.id === state.experimentId); const compound = compounds.find((item) => item.id === state.compoundId);
  if (state.projectId && !project) errors.push('所选课题不存在或 ID 无效');
  if (state.experimentId && !experiment) errors.push('所选实验不存在或 ID 无效');
  if (state.compoundId && !compound) errors.push('所选化合物不存在或 ID 无效');
  if (project && experiment?.projectId && experiment.projectId !== project.id) errors.push('所选实验属于其他课题');
  if (project && compound?.projectId && compound.projectId !== project.id) errors.push('所选化合物属于其他课题');
  if (experiment?.compoundId && compound?.id && experiment.compoundId !== compound.id) errors.push('所选实验与化合物关联不一致');
  return errors;
}

class DataAssetModal extends Modal {
  constructor(app, entityStore, options = {}) { super(app); this.entityStore = entityStore; this.options = options; this.state = { title: '', assetType: 'hplc', dataPath: '', projectId: '', project: '', experimentId: '', experiment: '', compoundId: '', compound: '', acquiredAt: '', notes: '', saving: false }; }
  onOpen() {
    this.modalEl.addClass('phdcc-task-modal');
    this.contentEl.createEl('h2', { text: '新增数据资产' });
    new Setting(this.contentEl).setName('标题').addText((text) => { text.inputEl.required = true; text.inputEl.placeholder = '例如：YLY-145 1H NMR'; text.onChange((value) => { this.state.title = value; }); setTimeout(() => text.inputEl.focus(), 30); });
    this.contentEl.createDiv({ cls: 'phdcc-empty', text: '核磁原始数据请通过“待解核磁 → 归档”登记到统一台账；此处用于登记其他类型的数据资产。' });
    new Setting(this.contentEl).setName('类型').addDropdown((dropdown) => { MANUAL_ASSET_TYPES.forEach((type) => dropdown.addOption(type, ASSET_LABELS[type] || type)); dropdown.setValue(this.state.assetType); dropdown.onChange((value) => { this.state.assetType = value; }); });
    new Setting(this.contentEl).setName('数据路径').addText((text) => { text.inputEl.required = true; text.inputEl.placeholder = 'Vault 内路径或 Windows 外部路径'; text.onChange((value) => { this.state.dataPath = value; }); });
    this.addRelationSelect('project');
    this.addRelationSelect('experiment');
    this.addRelationSelect('compound');
    new Setting(this.contentEl).setName('采集日期（可选）').addText((text) => { text.inputEl.type = 'date'; text.onChange((value) => { this.state.acquiredAt = value; }); });
    new Setting(this.contentEl).setName('备注（可选）').addTextArea((area) => { area.inputEl.rows = 3; area.onChange((value) => { this.state.notes = value; }); });
    const footer = this.contentEl.createDiv({ cls: 'modal-button-container' });
    footer.createEl('button', { text: '取消', attr: { type: 'button' } }).addEventListener('click', () => this.close());
    const save = footer.createEl('button', { text: '创建数据资产', cls: 'mod-cta', attr: { type: 'button' } });
    save.addEventListener('click', async () => { if (this.state.saving || !this.state.title.trim() || !this.state.dataPath.trim()) return void new Notice('请填写标题和数据路径'); const relationErrors = validateDataAssetRelations(this.state, this.entityStore); if (relationErrors.length) return void new Notice(relationErrors.join('；')); this.state.saving = true; save.disabled = true; try { const result = await createDataAsset(this.app, this.state, generateRecordId); if (this.options.onCreated) await this.options.onCreated(result.file, result.asset); this.close(); new Notice('数据资产已创建'); } catch (error) { this.state.saving = false; save.disabled = false; new Notice(error instanceof Error ? error.message : '数据资产创建失败'); } });
  }
  addRelationSelect(kind) {
    const config = { project: ['课题', this.entityStore.listProjects()], experiment: ['实验', this.entityStore.listExperiments()], compound: ['化合物', this.entityStore.listCompounds()] }[kind];
    const [label, items] = config;
    new Setting(this.contentEl).setName(`${label}（可选）`).addDropdown((dropdown) => { dropdown.addOption('', '不关联'); items.forEach((item) => { if (item.id) dropdown.addOption(item.id, `${item.title} · ${item.id}`); }); dropdown.onChange((value) => { this.state[`${kind}Id`] = value; const item = items.find((candidate) => candidate.id === value); this.state[kind] = item?.title || ''; }); });
  }
  onClose() { this.contentEl.empty(); }
}
module.exports = { DataAssetModal, ASSET_LABELS, MANUAL_ASSET_TYPES, validateDataAssetRelations };
