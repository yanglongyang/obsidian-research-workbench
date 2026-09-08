const { ItemView, Notice, setIcon } = require('obsidian');
const {
  PROJECT_FOLDER,
  PROGRESS_FOLDER,
  EXPERIMENT_FOLDERS,
  DATA_FOLDER,
  LITERATURE_FOLDERS,
  WRITING_FOLDER,
  localDate,
  formatMinutes,
  TaskStore,
  collectReadOnlyFiles
} = require('./data');
const { TaskModal } = require('./modal');
const { ExperimentModal } = require('./experiment-modal');
const { NmrInboxStore } = require('./nmr');
const { NmrArchiveModal } = require('./nmr-archive-modal');
const { QuickCreateModal } = require('./quick-create-modal');
const { ResearchDatabase } = require('./database');

const VIEW_TYPE = 'phd-command-center-view';
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
const PRIORITY_LABEL = { high: '高', medium: '中', low: '低' };
const EXPERIMENT_STATUS_LABEL = { planning: '计划中', doing: '进行中', complete: '已完成', blocked: '受阻' };
const VALID_SECTIONS = new Set(['overview', 'today', 'calendar', 'reviews', 'projects', 'experiments', 'nmr-inbox', 'data', 'literature', 'writing', 'daily-review', 'research-db']);

const NAV_GROUPS = [
  ['总览', [
    ['overview', '工作台总览', 'layout-dashboard'],
    ['today', '今日待办', 'check-square'],
    ['calendar', '日历', 'calendar-days']
  ]],
  ['科研', [
    ['projects', '课题项目', 'flask-conical'],
    ['experiments', '实验记录', 'test-tube'],
    ['data', '数据资产', 'database'],
    ['nmr-inbox', '待解核磁', 'scan-line']
  ]],
  ['复盘', [
    ['reviews', '周月总结', 'rotate-ccw'],
    ['daily-review', '今日复盘', 'notebook-pen']
  ]],
  ['资料', [
    ['research-db', '科研数据库', 'database'],
    ['literature', '文献资料', 'library'],
    ['writing', '写作管线', 'file-pen-line']
  ]],
];

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatBytes(value) {
  const bytes = Number(value) || 0;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function isDone(task) {
  return task.status === 'done';
}

function formatRelativeDate(value, today = localDate()) {
  const date = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return String(value || '');
  if (date === today) return '今天';
  const base = new Date(`${today}T00:00:00`);
  const target = new Date(`${date}T00:00:00`);
  const days = Math.round((target - base) / 86400000);
  if (days === 1) return '明天';
  if (days === -1) return '昨天';
  if (days < -1) return `逾期 ${Math.abs(days)} 天`;
  return date.slice(5);
}

function badgeTone(value, kind = 'status') {
  if (kind === 'priority') return { high: 'danger', medium: 'warning', low: 'neutral' }[value] || 'neutral';
  if (kind === 'nmr') return value === '1H' || value === '13C' ? 'info' : 'warning';
  return { planning: 'neutral', doing: 'info', complete: 'success', blocked: 'danger', todo: 'neutral', done: 'success', deferred: 'warning' }[value] || 'neutral';
}

function createBadge(container, text, tone = 'neutral') {
  return container.createSpan({ cls: `phdcc-badge is-${tone}`, text });
}

class WorkbenchView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    const savedSection = plugin.settings?.uiState?.activeSection;
    this.activeSection = VALID_SECTIONS.has(savedSection) ? savedSection : 'today';
    this.searchQuery = '';
    this.databaseFilters = { type: 'all', status: 'all', project: 'all' };
    this.selectedDate = localDate();
    const today = new Date();
    this.calendarCursor = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`;
    this.taskStore = new TaskStore(plugin);
    this.researchDatabase = new ResearchDatabase(plugin);
    this.nmrInboxStore = new NmrInboxStore(plugin);
    this.tasks = [];
    this.nmrScans = [];
    this.nmrError = '';
    this.selectedNmrPaths = new Set();
    this.root = null;
    this.pageEl = null;
    this.searchInput = null;
    this.keyHandler = (event) => this.handleGlobalKey(event);
  }

  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return '科研工作台'; }
  getIcon() { return 'layout-dashboard'; }

  async onOpen() {
    this.contentEl.empty();
    this.root = this.contentEl.createDiv({ cls: 'phdcc-view' });
    document.addEventListener('keydown', this.keyHandler, true);
    await this.refresh();
  }

  async onClose() {
    document.removeEventListener('keydown', this.keyHandler, true);
    this.contentEl.empty();
    this.root = null;
  }

  async refresh() {
    if (!this.root) return;
    try {
      this.tasks = this.taskStore.listTasks();
    } catch (error) {
      this.tasks = [];
    }
    try {
      await this.researchDatabase.sync();
    } catch (error) {
      this.researchDatabase.records = [];
      this.researchDatabase.error = error instanceof Error ? error.message : String(error);
      console.error('[Research Workbench] refresh failed', error);
    }
    if (this.activeSection === 'nmr-inbox') await this.refreshNmrInbox(false);
    this.root.empty();
    this.renderShell();
  }

  handleGlobalKey(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && this.app.workspace.getActiveViewOfType(WorkbenchView) === this) {
      event.preventDefault();
      this.searchInput?.focus();
    }
  }

  saveUiState() {
    if (!this.plugin.settings) this.plugin.settings = {};
    this.plugin.settings.uiState = { ...(this.plugin.settings.uiState || {}), activeSection: this.activeSection };
    if (typeof this.plugin.saveSettings === 'function') void this.plugin.saveSettings();
  }

  renderShell() {
    const shell = this.root.createDiv({ cls: 'phdcc-shell' });
    this.renderSidebar(shell);
    const main = shell.createDiv({ cls: 'phdcc-main' });
    this.renderTopbar(main);
    this.pageEl = main.createDiv({ cls: 'phdcc-page' });
    this.renderPage();
  }

  renderSidebar(shell) {
    const sidebar = shell.createDiv({ cls: 'phdcc-sidebar' });
    const brand = sidebar.createDiv({ cls: 'phdcc-brand' });
    brand.createDiv({ cls: 'phdcc-brand-title', text: '科研工作台' });
    brand.createDiv({ cls: 'phdcc-brand-subtitle', text: 'Research · English · Life' });

    for (const [groupName, items] of NAV_GROUPS) {
      const group = sidebar.createDiv({ cls: 'phdcc-nav-group' });
      group.createDiv({ cls: 'phdcc-nav-label', text: groupName });
      for (const [id, label, icon] of items) {
        const item = group.createEl('button', {
          cls: `phdcc-nav-item${id === this.activeSection ? ' is-active' : ''}`,
          attr: { type: 'button', 'aria-current': id === this.activeSection ? 'page' : 'false', 'aria-label': label }
        });
        const iconEl = item.createSpan({ cls: 'phdcc-nav-icon' });
        try { setIcon(iconEl, icon); } catch (error) { iconEl.setText('•'); }
        item.createSpan({ cls: 'phdcc-nav-text', text: label });
        if (id === 'today') item.createSpan({ cls: 'phdcc-nav-count', text: String(this.tasks.filter((task) => task.due === localDate() && !isDone(task)).length) });
        if (id === 'nmr-inbox' && this.nmrScans.length) item.createSpan({ cls: 'phdcc-nav-count', text: String(this.nmrScans.length) });
        item.addEventListener('click', () => {
          this.activeSection = id;
          this.searchQuery = '';
          this.saveUiState();
          if (id === 'today') this.selectedDate = localDate();
          void this.refresh();
        });
      }
    }
  }

  renderTopbar(main) {
    const topbar = main.createDiv({ cls: 'phdcc-topbar' });
    topbar.createDiv({
      cls: 'phdcc-date',
      text: new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date())
    });
    const searchWrap = topbar.createDiv({ cls: 'phdcc-search' });
    const searchIcon = searchWrap.createSpan({ cls: 'phdcc-search-icon' });
    setIcon(searchIcon, 'search');
    this.searchInput = searchWrap.createEl('input', { attr: { type: 'search', placeholder: '搜索当前页面…', 'aria-label': '搜索当前页面' } });
    this.searchInput.value = this.searchQuery;
    this.searchInput.addEventListener('input', (event) => {
      this.searchQuery = event.target.value || '';
      this.renderPage();
    });
    searchWrap.createSpan({ cls: 'phdcc-key-hint', text: '⌘/Ctrl K' });
    const quick = topbar.createEl('button', { cls: 'phdcc-add-btn', text: '+ 快速新增', attr: { type: 'button', 'aria-label': '快速新增' } });
    quick.addEventListener('click', () => this.openQuickCreate());
  }

  renderPage() {
    this.pageEl.empty();
    const renderer = {
      overview: () => this.renderOverview(),
      today: () => this.renderToday(),
      calendar: () => this.renderCalendar(),
      projects: () => this.renderProjectPage('课题项目'),
      reviews: () => this.renderReadOnlyPage('周月总结', PROGRESS_FOLDER, false),
      experiments: () => this.renderExperimentPage(),
      'research-db': () => this.renderResearchDatabasePage(),
      'nmr-inbox': () => this.renderNmrInboxPage(),
      data: () => this.renderDataPage(),
      literature: () => this.renderReadOnlyPage('文献资料', LITERATURE_FOLDERS, false),
      writing: () => this.renderReadOnlyPage('写作管线', WRITING_FOLDER, true),
      'daily-review': () => this.renderFocusPage('今日复盘', '复盘', '写下今天最重要的收获与下一步改进')
    }[this.activeSection] || (() => this.renderToday());
    renderer();
  }

  openQuickCreate() {
    new QuickCreateModal(this.app, {
      onTask: () => this.openTaskModal(),
      onExperiment: () => this.openExperimentModal(),
      onReview: () => this.openTaskModal({ category: '复盘', due: localDate() })
    }).open();
  }

  openTaskModal(options = {}) {
    try {
      new TaskModal(this.app, this.taskStore, {
        due: options.due || this.selectedDate,
        category: options.category,
        onCreated: async (_file, form) => {
          this.selectedDate = form.due;
          this.activeSection = 'today';
          this.saveUiState();
          window.setTimeout(() => { void this.refresh(); }, 150);
        }
      }).open();
    } catch (error) {
      new Notice('无法打开新增任务窗口');
    }
  }

  openExperimentModal(options = {}) {
    try {
      new ExperimentModal(this.app, this.taskStore, {
        experimentDate: options.experimentDate || localDate(),
        onCreated: async (file) => {
          await this.openFile(file);
          window.setTimeout(() => { void this.refresh(); }, 150);
        }
      }).open();
    } catch (error) {
      new Notice('无法打开新增实验记录窗口');
    }
  }

  filteredTasks(tasks) {
    const query = this.searchQuery.trim().toLowerCase();
    return [...tasks]
      .filter((task) => !query || `${task.title} ${task.category} ${task.priority} ${PRIORITY_LABEL[task.priority] || ''}`.toLowerCase().includes(query))
      .sort((a, b) => {
        const doneDiff = Number(isDone(a)) - Number(isDone(b));
        if (doneDiff) return doneDiff;
        const priorityDiff = (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3);
        if (priorityDiff) return priorityDiff;
        return String(a.due).localeCompare(String(b.due)) || String(a.created).localeCompare(String(b.created));
      });
  }

  filteredFiles(files) {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) return files;
    return files.filter((file) => {
      const info = this.fileInfo(file);
      return `${info.title} ${info.status} ${info.priority} ${info.stage} ${info.nextAction} ${info.tags} ${info.path}`
        .toLowerCase()
        .includes(query);
    });
  }

  filteredNmrScans(scans) {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) return scans;
    return scans.filter((scan) => `${scan.nucleus} ${scan.parentPath} ${scan.relativeScanPath}`.toLowerCase().includes(query));
  }

  async refreshNmrInbox(render = true) {
    try {
      this.nmrScans = await this.nmrInboxStore.listPendingScans();
      this.selectedNmrPaths = new Set([...this.selectedNmrPaths].filter((path) => this.nmrScans.some((scan) => scan.relativeScanPath === path)));
      this.nmrError = '';
    } catch (error) {
      this.nmrScans = [];
      this.nmrError = error instanceof Error ? error.message : '无法读取待解核磁目录';
    }
    if (render && this.activeSection === 'nmr-inbox' && this.pageEl) this.renderPage();
  }

  openNmrArchiveModal() {
    const selected = [...this.selectedNmrPaths];
    if (!selected.length) return void new Notice('请先勾选要归档的核磁原始数据');
    new NmrArchiveModal(this.app, this.nmrInboxStore, selected, {
      onArchived: async (result) => {
        this.selectedNmrPaths.clear();
        if (result?.status === 'completed' || result?.status === 'partial_failure') await this.refreshNmrInbox();
      }
    }).open();
  }

  async openNmrFolder(scan) {
    try {
      new Notice(`正在打开：${scan.relativeScanPath}`);
      await this.nmrInboxStore.openFolder(scan.scanFolder, this.app);
      new Notice(`已打开原始目录：${scan.relativeScanPath}`);
    } catch (error) {
      new Notice(error instanceof Error ? error.message : '无法打开核磁目录');
    }
  }

  selectedDayTasks() {
    return this.tasks.filter((task) => task.due === this.selectedDate);
  }

  renderPageHeader(title, eyebrow, addAction = null) {
    const header = this.pageEl.createDiv({ cls: 'phdcc-page-header' });
    if (eyebrow) header.createDiv({ cls: 'phdcc-eyebrow', text: eyebrow });
    const row = header.createDiv({ cls: 'phdcc-page-title-row' });
    row.createDiv({ cls: 'phdcc-page-title', text: title });
    if (addAction) {
      const config = typeof addAction === 'object'
        ? addAction
        : { label: '+ 新增任务', onClick: () => this.openTaskModal() };
      const add = row.createEl('button', { cls: 'phdcc-page-add', text: config.label || '+ 新增任务' });
      if (config.disabled) add.disabled = true;
      if (config.title) add.setAttr('title', config.title);
      add.addEventListener('click', () => {
        if (typeof config.onClick === 'function') config.onClick();
      });
    }
  }

  renderStats(container, tasks) {
    const completed = tasks.filter(isDone).length;
    const high = tasks.filter((task) => task.priority === 'high');
    const planned = tasks.reduce((sum, task) => sum + Number(task.estimate || 0), 0);
    const overdue = this.tasks.filter((task) => !isDone(task) && task.due && task.due < localDate()).length;
    const cards = [
      ['已完成', `${completed}/${tasks.length}`],
      ['关键任务', `${high.filter(isDone).length}/${high.length}`],
      ['计划时长', formatMinutes(planned)],
      ['延期', String(overdue)]
    ];
    const grid = container.createDiv({ cls: 'phdcc-stats' });
    cards.forEach(([label, value]) => {
      const card = grid.createDiv({ cls: 'phdcc-stat-card' });
      card.createDiv({ cls: 'phdcc-stat-label', text: label });
      card.createDiv({ cls: 'phdcc-stat-value', text: value });
    });
  }

  createCard(container, title, subtitle = '') {
    const card = container.createDiv({ cls: 'phdcc-card' });
    const header = card.createDiv({ cls: 'phdcc-card-header' });
    header.createDiv({ cls: 'phdcc-card-title', text: title });
    if (subtitle) header.createDiv({ cls: 'phdcc-card-subtitle', text: subtitle });
    return card.createDiv({ cls: 'phdcc-card-body' });
  }

  renderTaskList(container, tasks, emptyText) {
    if (!tasks.length) {
      const empty = container.createDiv({ cls: 'phdcc-empty' });
      empty.createDiv({ text: emptyText || '暂无任务' });
      const add = empty.createEl('button', { cls: 'phdcc-empty-add', text: '+ 新增任务' });
      add.addEventListener('click', () => this.openTaskModal());
      return;
    }
    tasks.forEach((task) => this.renderTaskRow(container, task));
  }

  renderTaskRow(container, task) {
    const row = container.createDiv({ cls: `phdcc-task-row${isDone(task) ? ' is-done' : ''}` });
    const checkbox = row.createEl('input', { cls: 'phdcc-task-checkbox', attr: { type: 'checkbox' } });
    checkbox.checked = isDone(task);
    checkbox.addEventListener('change', async () => {
      checkbox.disabled = true;
      try {
        await this.taskStore.toggleTask(task);
        await this.refresh();
      } catch (error) {
        checkbox.checked = !checkbox.checked;
        checkbox.disabled = false;
        new Notice('任务更新失败');
      }
    });
    const main = row.createDiv({ cls: 'phdcc-task-main' });
    const title = main.createDiv({ cls: 'phdcc-task-title', text: task.title });
    title.addEventListener('click', () => { void this.openFile(task.file); });
    const parts = [task.category, formatMinutes(task.estimate), formatRelativeDate(task.due)].filter(Boolean);
    main.createDiv({ cls: 'phdcc-task-meta', text: parts.join(' · ') });
    const badge = createBadge(row, PRIORITY_LABEL[task.priority] || '中', badgeTone(task.priority, 'priority'));
    badge.setAttr('aria-label', `优先级${badge.textContent}`);
  }

  renderToday() {
    this.renderPageHeader('今日待办', '按目标分组', true);
    const dayTasks = this.filteredTasks(this.selectedDayTasks());
    this.renderStats(this.pageEl, this.selectedDayTasks());
    const incomplete = dayTasks.filter((task) => !isDone(task));
    const keyTasks = [...incomplete.filter((task) => task.priority === 'high'), ...incomplete.filter((task) => task.priority !== 'high')].slice(0, 3);
    this.renderTaskList(this.createCard(this.pageEl, '优先处理', '今日三项关键任务'), keyTasks, '今日暂无关键任务');
    this.renderTaskList(this.createCard(this.pageEl, '全部任务', `${dayTasks.length} 项`), dayTasks, this.searchQuery ? '没有匹配任务' : '今日暂无任务');
  }

  renderOverview() {
    const todayHeading = this.pageEl.createDiv({ cls: 'phdcc-overview-heading' });
    todayHeading.createDiv({ cls: 'phdcc-greeting', text: new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date()) });
    todayHeading.createDiv({ cls: 'phdcc-overview-subtitle', text: '今天 · 先处理最重要的科研动作' });
    this.renderStats(this.pageEl, this.tasks);
    const todayTasks = this.filteredTasks(this.tasks.filter((task) => task.due === localDate() && !isDone(task)));
    this.renderTaskList(this.createCard(this.pageEl, '今日优先', '优先处理高价值、已明确的下一步'), todayTasks.slice(0, 3), '今天没有未完成任务');
    const grid = this.pageEl.createDiv({ cls: 'phdcc-overview-grid' });
    this.renderReadOnlyList(this.createCard(grid, '进行中的项目'), this.filteredFiles(this.readOnlyItems(PROJECT_FOLDER, 5, true)), this.searchQuery ? '没有匹配项目' : '暂无项目');
    this.renderReadOnlyList(this.createCard(grid, '最近实验'), this.filteredFiles(this.readOnlyItems(EXPERIMENT_FOLDERS, 5, false)), this.searchQuery ? '没有匹配实验记录' : '暂无实验记录');
    this.renderReadOnlyList(this.createCard(grid, '最近文献'), this.filteredFiles(this.readOnlyItems(LITERATURE_FOLDERS, 5, false)), this.searchQuery ? '没有匹配文献' : '暂无文献');
  }

  renderCalendar() {
    const [year, month] = this.calendarCursor.split('-').map(Number);
    const header = this.pageEl.createDiv({ cls: 'phdcc-cal-header' });
    const previous = header.createEl('button', { cls: 'phdcc-cal-nav', text: '‹' });
    header.createDiv({ cls: 'phdcc-cal-title', text: `${year}年${month}月` });
    const next = header.createEl('button', { cls: 'phdcc-cal-nav', text: '›' });
    previous.addEventListener('click', () => this.shiftMonth(-1));
    next.addEventListener('click', () => this.shiftMonth(1));
    const grid = this.pageEl.createDiv({ cls: 'phdcc-cal-grid' });
    ['一', '二', '三', '四', '五', '六', '日'].forEach((day) => grid.createDiv({ cls: 'phdcc-cal-weekday', text: day }));
    const leading = (new Date(year, month - 1, 1).getDay() + 6) % 7;
    for (let index = 0; index < leading; index += 1) grid.createDiv({ cls: 'phdcc-cal-empty' });
    const counts = this.tasks.reduce((map, task) => {
      if (task.due) map[task.due] = (map[task.due] || 0) + 1;
      return map;
    }, {});
    for (let day = 1; day <= new Date(year, month, 0).getDate(); day += 1) {
      const date = `${year}-${pad(month)}-${pad(day)}`;
      const cell = grid.createDiv({ cls: 'phdcc-cal-cell' });
      if (date === localDate()) cell.addClass('is-today');
      if (date === this.selectedDate) cell.addClass('is-selected');
      cell.createSpan({ cls: 'phdcc-cal-day', text: String(day) });
      if (counts[date]) cell.createSpan({ cls: 'phdcc-cal-count', text: String(counts[date]) });
      cell.addEventListener('click', () => { this.selectedDate = date; void this.refresh(); });
    }
    this.renderTaskList(this.createCard(this.pageEl, `${this.selectedDate} 任务`), this.filteredTasks(this.selectedDayTasks()), '当日暂无任务');
    const add = this.pageEl.createEl('button', { cls: 'phdcc-page-add phdcc-calendar-add', text: '+ 为所选日期新增任务' });
    add.addEventListener('click', () => this.openTaskModal({ due: this.selectedDate }));
  }

  shiftMonth(delta) {
    const [year, month] = this.calendarCursor.split('-').map(Number);
    const date = new Date(year, month - 1 + delta, 1);
    this.calendarCursor = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-01`;
    void this.refresh();
  }

  renderProjectPage(title) {
    this.renderPageHeader(title);
    const items = this.filteredFiles(this.readOnlyItems(PROJECT_FOLDER, 30, true));
    const grid = this.pageEl.createDiv({ cls: 'phdcc-project-grid' });
    if (!items.length) return void grid.createDiv({ cls: 'phdcc-empty', text: this.searchQuery ? '没有匹配项目' : '暂无项目；可从原工作台的课题模板开始创建。' });
    items.forEach((file) => {
      const info = this.fileInfo(file);
      const card = grid.createDiv({ cls: 'phdcc-project-card' });
      const heading = card.createDiv({ cls: 'phdcc-project-title', text: info.title });
      heading.addEventListener('click', () => { void this.openFile(file); });
      const metadata = [info.status && `状态：${info.status}`, info.priority && `优先级：${info.priority}`, info.stage && `阶段：${info.stage}`].filter(Boolean);
      card.createDiv({ cls: 'phdcc-project-meta', text: metadata.join(' · ') || info.path });
      if (info.nextAction) card.createDiv({ cls: 'phdcc-project-next', text: `下一步：${info.nextAction}` });
    });
  }

  renderExperimentPage() {
    this.renderPageHeader('实验记录', '新建记录存入工作台；旧记录保持只读', {
      label: '+ 新增实验记录',
      onClick: () => this.openExperimentModal()
    });
    const card = this.pageEl.createDiv({ cls: 'phdcc-card phdcc-file-card phdcc-experiment-list' });
    const files = this.filteredFiles(this.readOnlyItems(EXPERIMENT_FOLDERS, 50, false));
    if (!files.length) {
      const empty = card.createDiv({ cls: 'phdcc-empty' });
      empty.createDiv({ text: this.searchQuery ? '没有匹配实验记录' : '暂无实验记录' });
      if (!this.searchQuery) {
        const add = empty.createEl('button', { cls: 'phdcc-empty-add', text: '+ 新增实验记录', attr: { type: 'button' } });
        add.addEventListener('click', () => this.openExperimentModal());
      }
      return;
    }
    files.forEach((file) => this.renderExperimentRow(card, file));
  }

  renderExperimentRow(container, file) {
    const info = this.fileInfo(file);
    const row = container.createDiv({ cls: `phdcc-experiment-row${info.status === 'blocked' ? ' is-blocked' : ''}` });
    const main = row.createDiv({ cls: 'phdcc-experiment-main' });
    const heading = main.createDiv({ cls: 'phdcc-file-title', text: info.title });
    heading.addEventListener('click', () => { void this.openFile(file); });
    const context = [info.project || info.projectId, info.experimentDate && formatRelativeDate(info.experimentDate), info.sample].filter(Boolean);
    main.createDiv({ cls: 'phdcc-file-meta', text: context.join(' · ') || '未补充课题或样本信息' });
    if (info.nextAction) main.createDiv({ cls: 'phdcc-file-next', text: `→ 下一步：${info.nextAction}` });
    if (info.keyResult && info.status === 'blocked') main.createDiv({ cls: 'phdcc-file-next', text: `问题 / 结果：${info.keyResult}` });
    const side = row.createDiv({ cls: 'phdcc-experiment-side' });
    createBadge(side, EXPERIMENT_STATUS_LABEL[info.status] || '未设置', badgeTone(info.status));
    if (info.recordId) side.createDiv({ cls: 'phdcc-record-id', text: info.recordId });
    const action = side.createEl('button', { cls: 'phdcc-row-action', text: '打开', attr: { type: 'button', title: info.path } });
    action.addEventListener('click', () => { void this.openFile(file); });
  }

  renderResearchDatabasePage() {
    this.renderPageHeader('科研数据库', '任务、实验和科研文件的统一索引', {
      label: '+ 新增任务',
      onClick: () => this.openTaskModal()
    });
    const refresh = this.pageEl.createEl('button', {
      cls: 'phdcc-page-add phdcc-calendar-add',
      text: '↻ 同步数据库',
      attr: { type: 'button', title: '重新扫描并更新科研数据库' }
    });
    refresh.addEventListener('click', async () => {
      refresh.disabled = true;
      refresh.textContent = '同步中…';
      try {
        await this.researchDatabase.refresh();
        this.renderPage();
        new Notice(`科研数据库已同步：${this.researchDatabase.records.length} 条记录`);
      } catch (error) {
        refresh.disabled = false;
        refresh.textContent = '↻ 同步数据库';
        new Notice(error instanceof Error ? error.message : '科研数据库同步失败');
      }
    });
    const typeLabels = { task: '任务', experiment: '实验', project: '课题', data: '数据', literature: '文献', writing: '写作', progress: '进展', note: '其他' };
    const counts = {};
    this.researchDatabase.records.forEach((record) => { counts[record.type] = (counts[record.type] || 0) + 1; });
    const filterBar = this.pageEl.createDiv({ cls: 'phdcc-db-filters' });
    const typeFilter = filterBar.createDiv({ cls: 'phdcc-db-type-filters' });
    [['all', '全部'], ...Object.entries(typeLabels).filter(([type]) => counts[type]).map(([type, label]) => [type, label])].forEach(([type, label]) => {
      const button = typeFilter.createEl('button', { cls: `phdcc-filter-chip${this.databaseFilters.type === type ? ' is-active' : ''}`, text: `${label}${type === 'all' ? ` ${this.researchDatabase.records.length}` : ` ${counts[type] || 0}`}`, attr: { type: 'button' } });
      button.addEventListener('click', () => { this.databaseFilters.type = type; this.renderPage(); });
    });
    const statusSelect = filterBar.createEl('select', { cls: 'phdcc-filter-select', attr: { 'aria-label': '按状态筛选' } });
    statusSelect.createEl('option', { text: '状态：全部', attr: { value: 'all' } });
    [...new Set(this.researchDatabase.records.map((record) => record.status).filter(Boolean))].sort().forEach((status) => statusSelect.createEl('option', { text: `状态：${status}`, attr: { value: status } }));
    statusSelect.value = this.databaseFilters.status;
    statusSelect.addEventListener('change', () => { this.databaseFilters.status = statusSelect.value; this.renderPage(); });
    const projectSelect = filterBar.createEl('select', { cls: 'phdcc-filter-select', attr: { 'aria-label': '按课题筛选' } });
    projectSelect.createEl('option', { text: '课题：全部', attr: { value: 'all' } });
    [...new Set(this.researchDatabase.records.map((record) => record.projectId || record.project).filter(Boolean))].sort().forEach((project) => projectSelect.createEl('option', { text: `课题：${project}`, attr: { value: project } }));
    projectSelect.value = this.databaseFilters.project;
    projectSelect.addEventListener('change', () => { this.databaseFilters.project = projectSelect.value; this.renderPage(); });
    const query = this.searchQuery.trim().toLowerCase();
    const visible = this.researchDatabase.records.filter((record) => {
      const matchesType = this.databaseFilters.type === 'all' || record.type === this.databaseFilters.type;
      const matchesStatus = this.databaseFilters.status === 'all' || record.status === this.databaseFilters.status;
      const project = record.projectId || record.project;
      const matchesProject = this.databaseFilters.project === 'all' || project === this.databaseFilters.project;
      const matchesQuery = !query || [record.id, record.type, record.title, record.path, record.category, record.project, record.projectId, record.compoundId, record.sample, record.status, record.tags.join(' ')].join(' ').toLowerCase().includes(query);
      return matchesType && matchesStatus && matchesProject && matchesQuery;
    });
    const stats = this.pageEl.createDiv({ cls: 'phdcc-stats' });
    [['总记录', this.researchDatabase.records.length], ...Object.entries(counts).map(([type, count]) => [typeLabels[type] || type, count])]
      .slice(0, 6)
      .forEach(([label, value]) => {
        const card = stats.createDiv({ cls: 'phdcc-stat-card' });
        card.createDiv({ cls: 'phdcc-stat-label', text: label });
        card.createDiv({ cls: 'phdcc-stat-value', text: String(value) });
      });
    const card = this.pageEl.createDiv({ cls: 'phdcc-card phdcc-file-card' });
    if (this.researchDatabase.error) {
      card.createDiv({ cls: 'phdcc-empty', text: `数据库扫描失败：${this.researchDatabase.error}` });
      return;
    }
    if (this.researchDatabase.duplicateIds?.length) {
      const warning = card.createEl('details', { cls: 'phdcc-db-warning' });
      warning.createEl('summary', { text: `⚠ 发现 ${this.researchDatabase.duplicateIds.length} 个重复永久 ID` });
      this.researchDatabase.duplicateIds.forEach((duplicate) => warning.createDiv({ cls: 'phdcc-file-meta', text: `${duplicate.id}：${duplicate.paths.join(' · ')}` }));
    }
    if (!visible.length) {
      card.createDiv({ cls: 'phdcc-empty', text: query ? '没有匹配的科研记录' : '数据库暂无记录' });
      return;
    }
    visible.forEach((record) => {
      const row = card.createDiv({ cls: 'phdcc-db-row' });
      const title = row.createDiv({ cls: 'phdcc-file-title', text: record.title });
      title.addEventListener('click', () => {
        const file = this.app.vault.getAbstractFileByPath(record.path);
        if (file) void this.openFile(file);
        else new Notice(`文件不存在：${record.path}`);
      });
      const metadata = row.createDiv({ cls: 'phdcc-db-meta' });
      createBadge(metadata, typeLabels[record.type] || record.type, 'neutral');
      if (record.status) createBadge(metadata, record.status, badgeTone(record.status));
      metadata.createSpan({ cls: 'phdcc-file-meta', text: `${record.project || record.projectId || '未分类'} · ${record.date || '无日期'}` });
      row.createDiv({ cls: 'phdcc-db-path', text: record.path });
      if (record.id) row.createDiv({ cls: 'phdcc-record-id', text: record.id });
      const actions = row.createDiv({ cls: 'phdcc-db-actions' });
      const menu = actions.createEl('details', { cls: 'phdcc-row-menu' });
      menu.createEl('summary', { text: '⋯', attr: { title: '更多操作' } });
      const open = menu.createEl('button', { text: '打开笔记', attr: { type: 'button' } });
      open.addEventListener('click', () => {
        const file = this.app.vault.getAbstractFileByPath(record.path);
        if (file) void this.openFile(file);
        else new Notice(`文件不存在：${record.path}`);
      });
      const copy = menu.createEl('button', { text: '复制路径', attr: { type: 'button' } });
      copy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(record.path);
          new Notice('已复制文件路径');
        } catch (error) {
          new Notice(`路径：${record.path}`);
        }
      });
      const copyId = menu.createEl('button', { text: '复制 Record ID', attr: { type: 'button' } });
      copyId.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(record.id); new Notice('已复制 Record ID'); }
        catch (error) { new Notice(`Record ID：${record.id}`); }
      });
    });
  }

  renderDataPage() {
    this.renderPageHeader('数据资产', '原始数据位置与派生索引', {
      label: '打开科研数据库',
      onClick: () => { this.activeSection = 'research-db'; this.saveUiState(); this.renderPage(); }
    });
    const card = this.pageEl.createDiv({ cls: 'phdcc-card phdcc-file-card' });
    this.renderReadOnlyList(card, this.filteredFiles(this.readOnlyItems(DATA_FOLDER, 30, true)), this.searchQuery ? '没有匹配数据资产' : '暂无数据资产');
  }

  renderNmrInboxPage() {
    this.renderPageHeader('待解核磁', '勾选后预检；确认前不会移动任何原始数据', {
      label: `归档已选 (${this.selectedNmrPaths.size})`,
      disabled: this.selectedNmrPaths.size === 0,
      onClick: () => this.openNmrArchiveModal()
    });
    const refresh = this.pageEl.createEl('button', {
      cls: 'phdcc-page-add phdcc-calendar-add phdcc-nmr-refresh',
      text: '↻ 刷新核磁列表',
      attr: { type: 'button', title: '重新读取待解核磁目录' }
    });
    refresh.addEventListener('click', async () => {
      if (refresh.disabled) return;
      refresh.disabled = true;
      refresh.textContent = '刷新中…';
      await this.refreshNmrInbox(false);
      if (this.activeSection === 'nmr-inbox' && this.pageEl) this.renderPage();
      new Notice(this.nmrError ? `刷新失败：${this.nmrError}` : `核磁列表已刷新：${this.nmrScans.length} 套`);
    });
    const visibleScans = this.filteredNmrScans(this.nmrScans);
    const protonCount = this.nmrScans.filter((scan) => scan.nucleus === '1H').length;
    const carbonCount = this.nmrScans.filter((scan) => scan.nucleus === '13C').length;
    const otherCount = this.nmrScans.length - protonCount - carbonCount;
    const summary = this.pageEl.createDiv({ cls: 'phdcc-stats' });
    [
      ['待解析', String(this.nmrScans.length)],
      ['¹H', String(protonCount)],
      ['¹³C', String(carbonCount)],
      ['待核对', String(otherCount)]
    ].forEach(([label, value]) => {
      const card = summary.createDiv({ cls: 'phdcc-stat-card' });
      card.createDiv({ cls: 'phdcc-stat-label', text: label });
      card.createDiv({ cls: 'phdcc-stat-value', text: value });
    });
    const card = this.pageEl.createDiv({ cls: 'phdcc-card phdcc-file-card' });
    const description = card.createDiv({ cls: 'phdcc-file-meta', text: `来源：${this.nmrInboxStore.inboxFolder || '未配置'}　·　归档：${this.nmrInboxStore.archiveFolder || '未配置'}　·　选择后确认才会移动原始数据` });
    description.addClass('phdcc-nmr-note');
    if (this.nmrError) {
      card.createDiv({ cls: 'phdcc-empty', text: `读取失败：${this.nmrError}` });
      const settingsHint = card.createEl('button', { cls: 'phdcc-empty-add', text: '打开插件设置', attr: { type: 'button' } });
      settingsHint.addEventListener('click', () => this.app.setting.open());
      return;
    }
    if (!visibleScans.length) {
      card.createDiv({ cls: 'phdcc-empty', text: this.searchQuery ? '没有匹配的待解核磁' : '暂无待解核磁' });
      return;
    }
    visibleScans.forEach((scan) => this.renderNmrScanRow(card, scan));
  }

  renderNmrScanRow(container, scan) {
    const row = container.createDiv({ cls: 'phdcc-nmr-row' });
    const checkbox = row.createEl('input', { cls: 'phdcc-task-checkbox', attr: { type: 'checkbox', 'aria-label': `选择 ${scan.relativeScanPath}` } });
    checkbox.checked = this.selectedNmrPaths.has(scan.relativeScanPath);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) this.selectedNmrPaths.add(scan.relativeScanPath);
      else this.selectedNmrPaths.delete(scan.relativeScanPath);
      this.renderPage();
    });
    const main = row.createDiv({ cls: 'phdcc-nmr-main' });
    const label = scan.parentPath || scan.relativeScanPath;
    main.createDiv({ cls: 'phdcc-file-title', text: label });
    main.createDiv({ cls: 'phdcc-file-meta', text: `${scan.relativeScanPath} · ${formatBytes(scan.totalBytes)} · ${scan.fileCount} 个文件 · ${new Date(scan.modified).toLocaleString('zh-CN')}` });
    const states = main.createDiv({ cls: 'phdcc-nmr-states' });
    createBadge(states, scan.nucleus === '1H' ? '¹H NMR' : scan.nucleus === '13C' ? '¹³C NMR' : `待核对 ${scan.nucleus}`, badgeTone(scan.nucleus || 'unknown', 'nmr'));
    createBadge(states, scan.hasFid ? '✓ fid' : '⛔ 缺少 fid', scan.hasFid ? 'success' : 'danger');
    createBadge(states, scan.hasProcessedData ? '✓ pdata' : '未发现 pdata', scan.hasProcessedData ? 'success' : 'neutral');
    const open = row.createEl('button', { cls: 'phdcc-nmr-open', text: '打开原始目录', attr: { type: 'button' } });
    open.addEventListener('click', () => { void this.openNmrFolder(scan); });
  }

  renderReadOnlyPage(title, folders, excludeReadme) {
    this.renderPageHeader(title);
    const card = this.pageEl.createDiv({ cls: 'phdcc-card phdcc-file-card' });
    this.renderReadOnlyList(card, this.filteredFiles(this.readOnlyItems(folders, 20, excludeReadme)), this.searchQuery ? '没有匹配内容' : '暂无内容');
  }

  readOnlyItems(folders, limit, excludeReadme) {
    try {
      return collectReadOnlyFiles(this.app, folders, limit).filter((file) => !excludeReadme || file.basename.toLowerCase() !== 'readme');
    } catch (error) {
      return [];
    }
  }

  fileInfo(file) {
    const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter || {};
    return {
      title: String(frontmatter.title || file.basename),
      recordId: String(frontmatter.record_id || ''),
      status: frontmatter.status ? String(frontmatter.status) : '',
      project: String(frontmatter.project || ''),
      projectId: String(frontmatter.project_id || ''),
      experimentDate: String(frontmatter.experiment_date || frontmatter.date || ''),
      experimentType: String(frontmatter.experiment_type || ''),
      sample: String(frontmatter.sample || ''),
      keyResult: String(frontmatter.key_result || ''),
      priority: frontmatter.priority ? String(frontmatter.priority) : '',
      stage: frontmatter.stage ? String(frontmatter.stage) : '',
      nextAction: frontmatter.next_action || frontmatter.nextAction ? String(frontmatter.next_action || frontmatter.nextAction) : '',
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags.join(' ') : String(frontmatter.tags || ''),
      path: file.path,
      date: new Date(file.stat.mtime).toLocaleDateString('zh-CN')
    };
  }

  renderReadOnlyList(container, files, emptyText) {
    if (!files.length) return void container.createDiv({ cls: 'phdcc-empty', text: emptyText });
    files.forEach((file) => {
      const info = this.fileInfo(file);
      const row = container.createDiv({ cls: 'phdcc-file-row' });
      const heading = row.createDiv({ cls: 'phdcc-file-title', text: info.title });
      heading.addEventListener('click', () => { void this.openFile(file); });
      row.createDiv({ cls: 'phdcc-file-meta', text: `${info.path} · ${info.date}` });
      if (info.status) row.createSpan({ cls: 'phdcc-file-status', text: info.status });
      if (info.nextAction) row.createDiv({ cls: 'phdcc-file-next', text: `下一步：${info.nextAction}` });
    });
  }

  renderFocusPage(title, category, subtitle) {
    const card = this.pageEl.createDiv({ cls: 'phdcc-focus-card' });
    card.createDiv({ cls: 'phdcc-focus-kicker', text: '成长与复盘' });
    card.createDiv({ cls: 'phdcc-focus-title', text: title });
    card.createDiv({ cls: 'phdcc-focus-subtitle', text: subtitle });
    const button = card.createEl('button', { cls: 'phdcc-focus-btn', text: `+ 新增${category}任务` });
    button.addEventListener('click', () => this.openTaskModal({ category, due: localDate() }));
  }

  async openFile(file) {
    try {
      await this.app.workspace.getLeaf(false).openFile(file);
    } catch (error) {
      new Notice('无法打开文件');
    }
  }
}

module.exports = { VIEW_TYPE, WorkbenchView, formatRelativeDate, badgeTone, VALID_SECTIONS };
