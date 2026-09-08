const { Modal, Notice, Setting } = require('obsidian');
const { localDate } = require('./data');

const STATUS_OPTIONS = [
  ['planning', '计划中'],
  ['doing', '进行中'],
  ['complete', '已完成'],
  ['blocked', '受阻']
];

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

    this.addRelationSelect('project');
    this.addRelationSelect('compound');
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

  addRelationSelect(kind) {
    const store = this.options.entityStore;
    const items = store ? (kind === 'project' ? store.listProjects() : store.listCompounds()) : [];
    const label = kind === 'project' ? '关联课题（可选）' : '关联化合物（可选）';
    new Setting(this.contentEl).setName(label).addDropdown((dropdown) => {
      dropdown.addOption('', '不关联');
      items.forEach((item) => dropdown.addOption(item.id, `${item.title} · ${item.id}`));
      dropdown.onChange((value) => { this.state[`${kind}Id`] = value; const item = items.find((candidate) => candidate.id === value); this.state[kind] = item?.title || ''; });
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

module.exports = { ExperimentModal };
