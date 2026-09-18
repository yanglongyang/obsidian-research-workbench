const { projectRelations, suggestProjectForExperiment } = require('../entities/project-relations');
const compoundRegistryUi = require('./compound-registry');

const STATUS_LABELS = { planning: '计划中', doing: '进行中', complete: '已完成', blocked: '受阻' };
function dateOf(item) { return String(item.experimentDate || item.date || item.updated || item.file?.stat?.mtime || '').slice(0, 10); }
function sortRecent(items) { return [...items].sort((a, b) => String(dateOf(b)).localeCompare(String(dateOf(a))) || String(b.updated || '').localeCompare(String(a.updated || ''))); }
function badge(container, text, tone = 'neutral') { return container.createSpan({ cls: `phdcc-badge is-${tone}`, text }); }
function statusTone(value) {
  const status = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-');

  if (status.includes('evidence-audited')) return 'purple';
  if (status.includes('working-report')) return 'warning';

  return {
    doing: 'info',
    'in-progress': 'info',
    ongoing: 'info',
    active: 'primary',
    complete: 'success',
    completed: 'success',
    done: 'success',
    blocked: 'danger',
    stalled: 'danger',
    failed: 'danger',
    review: 'warning',
    checking: 'warning',
    deferred: 'warning',
    planning: 'neutral',
    planned: 'neutral',
    archived: 'muted',
    closed: 'muted'
  }[status] || 'neutral';
}
function makeInteractive(element, handler) { element.setAttr('role', 'button'); element.setAttr('tabindex', '0'); element.addEventListener('click', handler); element.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handler(event); } }); return element; }

function renderProjectHub(view, project) {
  const relation = projectRelations(view.entityStore, view.researchDatabase, project.id);

  const hero = view.pageEl.createDiv({ cls: 'phdcc-project-hero' });
  const heroTop = hero.createDiv({ cls: 'phdcc-project-hero-top' });
  const back = heroTop.createEl('button', { cls: 'phdcc-btn phdcc-btn-ghost phdcc-project-back', text: '← 课题项目', attr: { type: 'button' } });
  back.addEventListener('click', () => { view.selectedProjectId = ''; view.renderPage(); });

  const heroActions = heroTop.createDiv({ cls: 'phdcc-project-hero-actions' });
  const open = heroActions.createEl('button', { cls: 'phdcc-btn phdcc-btn-secondary', text: '打开课题笔记', attr: { type: 'button' } });
  open.addEventListener('click', () => { if (project.file) void view.openFile(project.file); });
  const add = heroActions.createEl('button', { cls: 'phdcc-page-add', text: '+ 新建实验', attr: { type: 'button' } });
  add.addEventListener('click', () => view.openExperimentModal({ projectId: project.id, project: project.title }));

  const heroBody = hero.createDiv({ cls: 'phdcc-project-hero-body' });
  const titleBlock = heroBody.createDiv({ cls: 'phdcc-project-hero-title-block' });
  titleBlock.createDiv({ cls: 'phdcc-project-hero-title', text: project.title });
  titleBlock.createDiv({ cls: 'phdcc-record-id phdcc-project-hero-id', text: project.id });

  const statusLine = titleBlock.createDiv({ cls: 'phdcc-project-hero-status' });
  badge(statusLine, STATUS_LABELS[project.status] || project.status || '未设置', statusTone(project.status));
  if (project.stage) statusLine.createSpan({ cls: 'phdcc-project-stage-chip', text: project.stage });

  if (project.nextAction) {
    const next = hero.createDiv({ cls: 'phdcc-project-hero-next' });
    next.createDiv({ cls: 'phdcc-project-hero-next-label', text: '下一步' });
    next.createDiv({ cls: 'phdcc-project-hero-next-text', text: project.nextAction });
  }

  const stats = hero.createDiv({ cls: 'phdcc-stats phdcc-project-hero-stats' });
  [
    ['实验总数', relation.experiments.length],
    ['进行中', relation.experiments.filter((item) => item.status === 'doing').length],
    ['受阻', relation.experiments.filter((item) => item.status === 'blocked').length],
    ['化合物', relation.compounds.length],
    ['数据资产', relation.dataAssets.length]
  ].forEach(([label, value]) => {
    const card = stats.createDiv({ cls: 'phdcc-stat-card' });
    card.createDiv({ cls: 'phdcc-stat-label', text: label });
    card.createDiv({ cls: 'phdcc-stat-value', text: String(value) });
  });

  const tabs = view.pageEl.createDiv({ cls: 'phdcc-workspace-tabs', attr: { role: 'tablist', 'aria-label': '课题工作区' } });
  const sections = {};
  [['overview', '概览'], ['experiments', `实验 ${relation.experiments.length}`], ['compounds', `化合物 ${relation.compounds.length}`], ['data', `数据 ${relation.dataAssets.length}`], ['timeline', '时间线']].forEach(([id, label]) => {
    const tab = tabs.createEl('button', { cls: 'phdcc-workspace-tab', text: label, attr: { type: 'button', role: 'tab', 'aria-selected': id === (view.selectedProjectHubTab || 'overview') ? 'true' : 'false' } });
    tab.addEventListener('click', () => { view.selectedProjectHubTab = id; Object.entries(sections).forEach(([key, section]) => { section.style.display = key === id ? '' : 'none'; }); tabs.querySelectorAll('.phdcc-workspace-tab').forEach((item) => item.setAttr('aria-selected', item === tab ? 'true' : 'false')); });
  });

  const activeTab = view.selectedProjectHubTab || 'overview';
  const overview = view.pageEl.createDiv({ cls: 'phdcc-project-overview-grid phdcc-hub-section' });
  sections.overview = overview;
  overview.style.display = activeTab === 'overview' ? '' : 'none';

  const progress = overview.createDiv({ cls: 'phdcc-card phdcc-file-card phdcc-project-progress-card' });
  progress.createEl('h3', { text: '当前进展' });
  sortRecent(relation.experiments).slice(0, 10).forEach((item) => renderExperimentItem(view, progress, item, project));
  if (!relation.experiments.length) progress.createDiv({ cls: 'phdcc-empty', text: '暂无关联实验' });

  const organize = overview.createDiv({ cls: 'phdcc-card phdcc-file-card phdcc-project-organize-card' });
  organize.createEl('h3', { text: '需要整理' });
  const reminders = relation.experiments.filter((item) => (item.status === 'complete' && !item.keyResult) || (item.status === 'doing' && !item.nextAction) || item.status === 'blocked' || !item.compoundId);
  if (!reminders.length) organize.createDiv({ cls: 'phdcc-empty', text: '暂无待整理提醒' });
  reminders.forEach((item) => organize.createDiv({ cls: 'phdcc-file-next', text: `${item.title} · ${item.status === 'complete' && !item.keyResult ? '已完成但无关键结果' : item.status === 'doing' && !item.nextAction ? '进行中但无下一步' : item.status === 'blocked' ? '受阻实验' : '未关联化合物'}` }));

  const experiments = view.pageEl.createDiv({ cls: 'phdcc-card phdcc-file-card phdcc-hub-section' });
  sections.experiments = experiments;
  experiments.style.display = activeTab === 'experiments' ? '' : 'none';
  experiments.createEl('h3', { text: '实验' });
  ['全部', 'doing', 'complete', 'blocked'].forEach((status) => {
    const chip = experiments.createEl('button', { cls: 'phdcc-filter-chip', text: status === '全部' ? '全部' : STATUS_LABELS[status], attr: { type: 'button' } });
    chip.addEventListener('click', () => {
      experiments.querySelectorAll('.phdcc-experiment-row').forEach((row) => {
        row.style.display = status === '全部' || row.dataset.status === status ? '' : 'none';
      });
    });
  });
  sortRecent(relation.experiments).forEach((item) => renderExperimentItem(view, experiments, item, project));

  const compounds = view.pageEl.createDiv({ cls: 'phdcc-card phdcc-file-card phdcc-hub-section' });
  sections.compounds = compounds;
  compounds.style.display = activeTab === 'compounds' ? '' : 'none';
  compounds.createEl('h3', { text: '化合物' });
  compoundRegistryUi.renderCompoundRegistry(view, relation.compounds, { container: compounds.createDiv({ cls: 'phdcc-compound-registry' }) });

  const assets = view.pageEl.createDiv({ cls: 'phdcc-card phdcc-file-card phdcc-hub-section' });
  sections.data = assets;
  assets.style.display = activeTab === 'data' ? '' : 'none';
  assets.createEl('h3', { text: '数据资产' });
  relation.dataAssets.forEach((item) => {
    const row = assets.createDiv({ cls: 'phdcc-file-row' });
    const title = row.createDiv({ cls: 'phdcc-file-title', text: `${item.assetType || '数据'} · ${item.title}` });
    if (item.file) makeInteractive(title, () => void view.openFile(item.file));
    row.createDiv({ cls: 'phdcc-file-meta', text: `${item.id} · ${item.dataPath || '无路径'}${item.experimentId ? ` · ${item.experimentId}` : ''}${item.compoundId ? ` · ${item.compoundId}` : ''}` });
  });

  const timeline = view.pageEl.createDiv({ cls: 'phdcc-card phdcc-file-card phdcc-hub-section' });
  sections.timeline = timeline;
  timeline.style.display = activeTab === 'timeline' ? '' : 'none';
  timeline.createEl('h3', { text: 'Project Timeline' });
  const events = [
    ...relation.experiments.map((item) => ({ file: item.file, date: dateOf(item), id: item.id, title: item.title, status: item.status })),
    ...relation.dataAssets.map((item) => ({ file: item.file, date: dateOf(item), id: item.id, title: item.title, status: item.assetType || '数据资产' })),
    ...relation.tasks.map((item) => ({ file: item.file, date: item.date || item.updated, id: item.id, title: item.title, status: item.status }))
  ].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  events.forEach((event) => {
    const row = timeline.createDiv({ cls: 'phdcc-file-row phdcc-timeline-event' });
    row.createDiv({ cls: 'phdcc-file-meta', text: `${event.date || '无日期'} · ${event.id}` });
    const title = row.createDiv({ cls: 'phdcc-file-title', text: event.title });
    if (event.file) makeInteractive(title, () => void view.openFile(event.file));
    row.createDiv({ cls: 'phdcc-file-next', text: event.status || '' });
  });
  if (!events.length) timeline.createDiv({ cls: 'phdcc-empty', text: '暂无时间线记录' });
}

function renderExperimentItem(view, container, item, project) {
  const row = container.createDiv({ cls: 'phdcc-experiment-row' }); row.dataset.status = item.status || '';
  const main = row.createDiv({ cls: 'phdcc-experiment-main' }); const title = main.createDiv({ cls: 'phdcc-file-title', text: item.title }); makeInteractive(title, () => void view.openFile(item.file)); main.createDiv({ cls: 'phdcc-file-meta', text: `${dateOf(item) || '无日期'} · ${item.compound || item.sample || '未补充样本'} · ${item.id}` }); if (item.keyResult) main.createDiv({ cls: 'phdcc-file-next', text: `结果：${item.keyResult}` }); if (item.nextAction) main.createDiv({ cls: 'phdcc-file-next', text: `下一步：${item.nextAction}` });
  const side = row.createDiv({ cls: 'phdcc-experiment-side' }); badge(side, STATUS_LABELS[item.status] || '未设置', item.status === 'blocked' ? 'danger' : item.status === 'complete' ? 'success' : 'info');
  const suggest = suggestProjectForExperiment(item, view.entityStore.listCompounds(), view.entityStore.listProjects()); if (suggest) row.createDiv({ cls: 'phdcc-file-next', text: `建议归属：${suggest.title}（${suggest.reason}）` });
  const change = side.createEl('button', { cls: 'phdcc-row-action', text: '修改归属', attr: { type: 'button' } }); change.addEventListener('click', () => view.openProjectRelationModal(item));
}

module.exports = { renderProjectHub, suggestProjectForExperiment };
