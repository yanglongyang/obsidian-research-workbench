const { Modal, Notice, Setting } = require('obsidian');
const { localDate } = require('./data');

const CATEGORIES = ['科研/小论文', '实验', '文献', '英语学习', '健康', '复盘'];

class TaskModal extends Modal {
  constructor(app, taskStore, options = {}) {
    super(app);
    this.taskStore = taskStore;
    this.options = options;
    this.state = {
      title: String(options.title || ''),
      category: CATEGORIES.includes(options.category) ? options.category : CATEGORIES[0],
      priority: ['high', 'medium', 'low'].includes(options.priority) ? options.priority : 'high',
      due: /^\d{4}-\d{2}-\d{2}$/.test(options.due || '') ? options.due : localDate(),
      estimate: 60,
      details: String(options.details || ''),
      saving: false
    };
    this.ctaButton = null;
  }

  onOpen() {
    const { contentEl } = this;
    this.modalEl.addClass('phdcc-task-modal');
    contentEl.createEl('h2', { text: '新增任务' });

    new Setting(contentEl).setName('标题').addText((text) => {
      text.inputEl.placeholder = '例如：整理本周实验结果';
      text.inputEl.required = true;
      text.setValue(this.state.title);
      text.inputEl.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.isComposing) {
          event.preventDefault();
          void this.submit(this.ctaButton);
        }
      });
      text.onChange((value) => { this.state.title = value; });
      window.setTimeout(() => text.inputEl.focus(), 50);
    });

    new Setting(contentEl).setName('分类').addDropdown((dropdown) => {
      CATEGORIES.forEach((category) => dropdown.addOption(category, category));
      dropdown.setValue(this.state.category);
      dropdown.onChange((value) => { this.state.category = value; });
    });

    new Setting(contentEl).setName('优先级').addDropdown((dropdown) => {
      dropdown.addOption('high', '高');
      dropdown.addOption('medium', '中');
      dropdown.addOption('low', '低');
      dropdown.setValue(this.state.priority);
      dropdown.onChange((value) => { this.state.priority = value; });
    });

    const dueSetting = new Setting(contentEl).setName('计划日期');
    const dueInput = dueSetting.controlEl.createEl('input', { type: 'date' });
    dueInput.value = this.state.due;
    dueInput.addEventListener('change', () => { this.state.due = dueInput.value; });

    new Setting(contentEl).setName('预计时长（分钟）').addText((text) => {
      text.inputEl.type = 'number';
      text.inputEl.min = '0';
      text.inputEl.step = '5';
      text.setValue(String(this.state.estimate));
      text.onChange((value) => { this.state.estimate = Number(value) || 0; });
    });

    new Setting(contentEl).setName('说明').addTextArea((area) => {
      area.inputEl.rows = 4;
      area.setValue(this.state.details);
      area.inputEl.placeholder = '完成标准、相关笔记或补充说明';
      area.onChange((value) => { this.state.details = value; });
      area.inputEl.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault();
          void this.submit(this.ctaButton);
        }
      });
    });

    const footer = contentEl.createDiv({ cls: 'modal-button-container' });
    const cancel = footer.createEl('button', { text: '取消', type: 'button' });
    cancel.addEventListener('click', () => this.close());
    this.ctaButton = footer.createEl('button', { text: '创建任务', cls: 'mod-cta', type: 'button' });
    this.ctaButton.addEventListener('click', () => { void this.submit(this.ctaButton); });
  }

  async submit(button) {
    if (this.state.saving) return;
    const title = this.state.title.trim();
    if (!title) return void new Notice('请输入任务标题');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(this.state.due)) return void new Notice('请选择有效日期');

    const formState = {
      title,
      category: this.state.category,
      priority: this.state.priority,
      due: this.state.due,
      estimate: Number(this.state.estimate) || 0,
      details: this.state.details
    };
    this.state.saving = true;
    if (button) {
      button.disabled = true;
      button.setText('创建中…');
    }

    try {
      const file = await this.taskStore.createTask(formState);
      if (typeof this.options.onCreated === 'function') await this.options.onCreated(file, formState);
      this.close();
      new Notice('任务已创建');
    } catch (error) {
      new Notice(error instanceof Error ? error.message : '任务创建失败');
      this.state.saving = false;
      if (button) {
        button.disabled = false;
        button.setText('创建任务');
      }
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}

module.exports = { TaskModal };
