const { Modal, Notice, Setting } = require('obsidian');
const { localDate } = require('./data');

const STATUS_OPTIONS = [
  ['planning', '计划中'],
  ['doing', '进行中'],
  ['complete', '已完成'],
  ['blocked', '受阻']
];

function filterCompoundsByProject(compounds, projectId) {
  const items = Array.isArray(compounds) ? compounds : [];
  return projectId ? items.filter((item) => item.projectId === projectId) : items;
}

function suggestProjectFromCompound(projectId, compound) {
  return projectId || compound?.projectId || '';
}

class ExperimentModal extends Modal {
  constructor(app, taskStore, options = {}) {
    super(app);
    this.taskStore = taskStore;
    this.options = options;
    this.state = {
      title: '',
      experimentDate: /^\d{4}-\d{2}-\d{2}$/.test(options.experimentDate || '') ? options.experimentDate : localDate(),
      status: 'doing',
      project: '',
      projectId: '',
      compound: '',
      compoundId: '',
      experimentType: 'general',
      sample: '',
      objective: '',
      protocol: '',
      dataPath: '',
      keyResult: '',
      problems: '',
      nextAction: '',
      saving: false
    };
    this.ctaButton = null;
  }

  onOpen() {
    const { contentEl } = this;
    this.modalEl.addClass('phdcc-task-modal');
    contentEl.createEl('h2', { text: '新增实验记录' });

    this.addText('实验标题', '例如：YLY-129 细胞活性重复实验', 'title', true, true);

    const dateSetting = new Setting(contentEl).setName('实验日期');
    const dateInput = dateSetting.controlEl.createEl('input', { type: 'date' });
    dateInput.value = this.state.experimentDate;
    dateInput.addEventListener('change', () => { this.state.experimentDate = dateInput.value; });

    new Setting(contentEl).setName('状态').addDropdown((dropdown) => {
      STATUS_OPTIONS.forEach(([value, label]) => dropdown.addOption(value, label));
      dropdown.setValue(this.state.status);
      dropdown.onChange((value) => { this.state.status = value; });
    });

    this.relationContainer = contentEl.createDiv({ cls: 'phdcc-experiment-relations' });
    this.renderRelationSelectors();
    new Setting(contentEl).setName('实验类型').addDropdown((dropdown) => {
      [['general', '通用实验'], ['synthesis', '合成'], ['characterization', '表征'], ['analysis', '分析']]
        .forEach(([value, label]) => dropdown.addOption(value, label));
      dropdown.setValue(this.state.experimentType);
      dropdown.onChange((value) => { this.state.experimentType = value; });
    });
    this.addText('样本 / 材料（可选）', '例如：细胞系、批号或样本编号', 'sample');
    this.addArea('目标 / 假设（可选）', '本次实验想验证什么？', 'objective', 3);
    this.addArea('实验过程（可选）', '关键步骤、条件和参数', 'protocol', 4);
    this.addText('原始数据路径（可选）', '仅记录位置；不会复制或移动文件', 'dataPath');
    this.addArea('观察与关键结果（可选）', '可先简记，后续可在笔记中补充', 'keyResult', 4);
    this.addArea('问题与偏差（可选）', '异常、失败原因或待确认事项', 'problems', 3);
    this.addArea('下一步（可选）', '下一次实验或分析动作', 'nextAction', 3);

    const footer = contentEl.createDiv({ cls: 'modal-button-container' });
    const cancel = footer.createEl('button', { text: '取消', type: 'button' });
    cancel.addEventListener('click', () => this.close());
    this.ctaButton = footer.createEl('button', { text: '创建实验记录', cls: 'mod-cta', type: 'button' });
    this.ctaButton.addEventListener('click', () => { void this.submit(this.ctaButton); });
  }

  addText(name, placeholder, key, required = false, autofocus = false) {
    new Setting(this.contentEl).setName(name).addText((text) => {
      text.inputEl.placeholder = placeholder;
      text.inputEl.required = required;
      text.onChange((value) => { this.state[key] = value; });
      if (autofocus) {
        text.inputEl.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' && !event.isComposing) {
            event.preventDefault();
            void this.submit(this.ctaButton);
          }
        });
        window.setTimeout(() => text.inputEl.focus(), 50);
      }
    });
  }

  renderRelationSelectors() {
    const store = this.options.entityStore;
    if (!this.relationContainer || !store) return;
    this.relationContainer.empty();
    const projects = store.listProjects();
    const compounds = filterCompoundsByProject(store.listCompounds(), this.state.projectId);
    new Setting(this.relationContainer).setName('关联课题（可选）').addDropdown((dropdown) => {
      dropdown.addOption('', '不关联');
      projects.forEach((item) => dropdown.addOption(item.id, `${item.title} · ${item.id}`));
      dropdown.setValue(this.state.projectId);
      dropdown.onChange((value) => { this.state.projectId = value; const item = projects.find((candidate) => candidate.id === value); this.state.project = item?.title || ''; this.renderRelationSelectors(); });
    });
    new Setting(this.relationContainer).setName('关联化合物（可选）').addDropdown((dropdown) => {
      dropdown.addOption('', '不关联');
      compounds.forEach((item) => dropdown.addOption(item.id, `${item.title} · ${item.id}`));
      if (this.state.compoundId && !compounds.some((item) => item.id === this.state.compoundId)) dropdown.addOption(this.state.compoundId, `${this.state.compound || '已选化合物'} · 关系冲突`);
      dropdown.setValue(this.state.compoundId);
      dropdown.onChange((value) => { this.state.compoundId = value; const item = store.listCompounds().find((candidate) => candidate.id === value); this.state.compound = item?.title || ''; const suggested = suggestProjectFromCompound(this.state.projectId, item); if (!this.state.projectId && suggested) { this.state.projectId = suggested; this.state.project = projects.find((candidate) => candidate.id === suggested)?.title || ''; this.renderRelationSelectors(); } else if (this.state.projectId && item?.projectId && item.projectId !== this.state.projectId) new Notice('所选化合物属于其他课题，请检查关联。'); });
    });
  }

  addArea(name, placeholder, key, rows) {
    new Setting(this.contentEl).setName(name).addTextArea((area) => {
      area.inputEl.rows = rows;
      area.inputEl.placeholder = placeholder;
      area.onChange((value) => { this.state[key] = value; });
      area.inputEl.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault();
          void this.submit(this.ctaButton);
        }
      });
    });
  }

  async submit(button) {
    if (this.state.saving) return;
    if (!this.state.title.trim()) return void new Notice('请输入实验标题');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(this.state.experimentDate)) return void new Notice('请选择有效实验日期');

    this.state.saving = true;
    if (button) {
      button.disabled = true;
      button.setText('创建中…');
    }
    try {
      const formState = { ...this.state, title: this.state.title.trim() };
      const file = await this.taskStore.createExperiment(formState);
      if (typeof this.options.onCreated === 'function') await this.options.onCreated(file, formState);
      this.close();
      new Notice('实验记录已创建');
    } catch (error) {
      new Notice(error instanceof Error ? error.message : '实验记录创建失败');
      this.state.saving = false;
      if (button) {
        button.disabled = false;
        button.setText('创建实验记录');
      }
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}

module.exports = { ExperimentModal, filterCompoundsByProject, suggestProjectFromCompound };
