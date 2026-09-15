const { projectRelations, suggestProjectForExperiment } = require('../entities/project-relations');

const STATUS_LABELS = { planning: '计划中', doing: '进行中', complete: '已完成', blocked: '受阻' };
function dateOf(item) { return String(item.experimentDate || item.date || item.updated || item.file?.stat?.mtime || '').slice(0, 10); }
function sortRecent(items) { return [...items].sort((a, b) => String(dateOf(b)).localeCompare(String(dateOf(a))) || String(b.updated || '').localeCompare(String(a.updated || ''))); }
function badge(container, text, tone = 'neutral') { return container.createSpan({ cls: `phdcc-badge is-${tone}`, text }); }
function makeInteractive(element, handler) { element.setAttr('role', 'button'); element.setAttr('tabindex', '0'); element.addEventListener('click', handler); element.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handler(event); } }); return element; }

function renderProjectHub(view, project) {
  const relation = projectRelations(view.entityStore, view.researchDatabase, project.id);
  view.renderPageHeader(project.title, `Project Hub · ${project.id}`, { label: '+ 新建实验', onClick: () => view.openExperimentModal({ projectId: project.id, project: project.title }) });
  const actions = view.pageEl.createDiv({ cls: 'phdcc-page-actions' });
  const back = actions.createEl('button', { cls: 'phdcc-btn phdcc-btn-ghost', text: '← 返回课题', attr: { type: 'button' } });
  back.addEventListener('click', () => { view.selectedProjectId = ''; view.renderPage(); });
  const open = actions.createEl('button', { cls: 'phdcc-btn phdcc-btn-secondary', text: '打开课题笔记', attr: { type: 'button' } });
  open.addEventListener('click', () => { if (project.file) void view.openFile(project.file); });
  const meta = view.pageEl.createDiv({ cls: 'phdcc-project-meta' });
  meta.createDiv({ cls: 'phdcc-record-id', text: project.id });
  meta.createDiv({ text: `状态：${project.status || '未设置'} · 阶段：${project.stage || '未设置'}` });
  if (project.nextAction) meta.createDiv({ cls: 'phdcc-project-next', text: `下一步：${project.nextAction}` });
  const stats = view.pageEl.createDiv({ cls: 'phdcc-stats' });
  [['实验总数', relation.experiments.length], ['进行中实验', relation.experiments.filter((item) => item.status === 'doing').length], ['受阻实验', relation.experiments.filter((item) => item.status === 'blocked').length], ['关联化合物', relation.compounds.length], ['关联数据资产', relation.dataAssets.length]].forEach(([label, value]) => { const card = stats.createDiv({ cls: 'phdcc-stat-card' }); card.createDiv({ cls: 'phdcc-stat-label', text: label }); card.createDiv({ cls: 'phdcc-stat-value', text: String(value) }); });
  const tabs = view.pageEl.createDiv({ cls: 'phdcc-workspace-tabs', attr: { role: 'tablist', 'aria-label': '课题工作区' } });
  const sections = {};
  [['overview', '概览'], ['experiments', `实验 ${relation.experiments.length}`], ['compounds', `化合物 ${relation.compounds.length}`], ['data', `数据 ${relation.dataAssets.length}`], ['timeline', '时间线']].forEach(([id, label]) => {
    const tab = tabs.createEl('button', { cls: 'phdcc-workspace-tab', text: label, attr: { type: 'button', role: 'tab', 'aria-selected': id === (view.selectedProjectHubTab || 'overview') ? 'true' : 'false' } });
    tab.addEventListener('click', () => { view.selectedProjectHubTab = id; Object.entries(sections).forEach(([key, section]) => { section.style.display = key === id ? '' : 'none'; }); tabs.querySelectorAll('.phdcc-workspace-tab').forEach((item) => item.setAttr('aria-selected', item === tab ? 'true' : 'false')); });
  });
  const activeTab = view.selectedProjectHubTab || 'overview';
  const overview = view.pageEl.createDiv({ cls: 'phdcc-project-overview-grid phdcc-hub-section' }); sections.overview = overview; overview.style.display = activeTab === 'overview' ? '' : 'none';
  const progress = overview.createDiv({ cls: 'phdcc-card phdcc-file-card' }); progress.createEl('h3', { text: '当前进展' });
  sortRecent(relation.experiments).slice(0, 10).forEach((item) => renderExperimentItem(view, progress, item, project));
  if (!relation.experiments.length) progress.createDiv({ cls: 'phdcc-empty', text: '暂无关联实验' });
  const organize = overview.createDiv({ cls: 'phdcc-card phdcc-file-card' }); organize.createEl('h3', { text: '需要整理' });
  const reminders = relation.experiments.filter((item) => (item.status === 'complete' && !item.keyResult) || (item.status === 'doing' && !item.nextAction) || item.status === 'blocked' || !item.compoundId);
  if (!reminders.length) organize.createDiv({ cls: 'phdcc-empty', text: '暂无待整理提醒' });
  reminders.forEach((item) => organize.createDiv({ cls: 'phdcc-file-next', text: `${item.title} · ${item.status === 'complete' && !item.keyResult ? '已完成但无关键结果' : item.status === 'doing' && !item.nextAction ? '进行中但无下一步' : item.status === 'blocked' ? '受阻实验' : '未关联化合物'}` }));
  const experiments = view.pageEl.createDiv({ cls: 'phdcc-card phdcc-file-card phdcc-hub-section' }); sections.experiments = experiments; experiments.style.display = activeTab === 'experiments' ? '' : 'none'; experiments.createEl('h3', { text: '实验' });
  ['全部', 'doing', 'complete', 'blocked'].forEach((status) => { const chip = experiments.createEl('button', { cls: 'phdcc-filter-chip', text: status === '全部' ? '全部' : STATUS_LABELS[status], attr: { type: 'button' } }); chip.addEventListener('click', () => { experiments.querySelectorAll('.phdcc-experiment-row').forEach((row) => { row.style.display = status === '全部' || row.dataset.status === status ? '' : 'none'; }); }); });
  sortRecent(relation.experiments).forEach((item) => renderExperimentItem(view, experiments, item, project));
  const compounds = view.pageEl.createDiv({ cls: 'phdcc-card phdcc-file-card phdcc-hub-section' }); sections.compounds = compounds; compounds.style.display = activeTab === 'compounds' ? '' : 'none'; compounds.createEl('h3', { text: '化合物' }); relation.compounds.forEach((item) => { const row = compounds.createDiv({ cls: 'phdcc-file-row' }); const title = row.createDiv({ cls: 'phdcc-file-title', text: `${item.compoundCode || item.title} · ${item.title}` }); if (item.file) makeInteractive(title, () => void view.openFile(item.file)); row.createDiv({ cls: 'phdcc-file-meta', text: `${item.id} · 关联实验 ${relation.experiments.filter((exp) => exp.compoundId === item.id).length} 个 · 关联数据 ${relation.dataAssets.filter((asset) => asset.compoundId === item.id).length} 个` }); });
  const assets = view.pageEl.createDiv({ cls: 'phdcc-card phdcc-file-card phdcc-hub-section' }); sections.data = assets; assets.style.display = activeTab === 'data' ? '' : 'none'; assets.createEl('h3', { text: '数据资产' }); relation.dataAssets.forEach((item) => { const row = assets.createDiv({ cls: 'phdcc-file-row' }); const title = row.createDiv({ cls: 'phdcc-file-title', text: `${item.assetType || '数据'} · ${item.title}` }); if (item.file) makeInteractive(title, () => void view.openFile(item.file)); row.createDiv({ cls: 'phdcc-file-meta', text: `${item.id} · ${item.dataPath || '无路径'}${item.experimentId ? ` · ${item.experimentId}` : ''}${item.compoundId ? ` · ${item.compoundId}` : ''}` }); });
  const timeline = view.pageEl.createDiv({ cls: 'phdcc-card phdcc-file-card phdcc-hub-section' }); sections.timeline = timeline; timeline.style.display = activeTab === 'timeline' ? '' : 'none'; timeline.createEl('h3', { text: 'Project Timeline' });
  const events = [...relation.experiments.map((item) => ({ file: item.file, date: dateOf(item), id: item.id, title: item.title, status: item.status })), ...relation.dataAssets.map((item) => ({ file: item.file, date: dateOf(item), id: item.id, title: item.title, status: item.assetType || '数据资产' })), ...relation.tasks.map((item) => ({ file: item.file, date: item.date || item.updated, id: item.id, title: item.title, status: item.status }))].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  events.forEach((event) => { const row = timeline.createDiv({ cls: 'phdcc-file-row phdcc-timeline-event' }); row.createDiv({ cls: 'phdcc-file-meta', text: `${event.date || '无日期'} · ${event.id}` }); const title = row.createDiv({ cls: 'phdcc-file-title', text: event.title }); if (event.file) makeInteractive(title, () => void view.openFile(event.file)); row.createDiv({ cls: 'phdcc-file-next', text: event.status || '' }); });
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
