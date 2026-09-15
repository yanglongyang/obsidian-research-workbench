const { validateEntityRecord } = require('./identity');
const { generateRecordId } = require('../data');

function permanentExperiments(entityStore) {
  const items = typeof entityStore.listExperiments === 'function' ? entityStore.listExperiments() : entityStore.list('experiment');
  return items.filter((item) => { const validation = validateEntityRecord({ ...item, type: item.type || 'experiment' }); return validation.entityIdValid && (!(item.file?.path || item.path) || validation.validFolder); });
}

function projectRelations(entityStore, database, projectId) {
  const project = entityStore.getById(projectId, 'project');
  if (!project) return { project: null, experiments: [], compounds: [], dataAssets: [], tasks: [], unresolved: true };
  const records = Array.isArray(database?.records) ? database.records : [];
  const experiments = (typeof entityStore.listExperiments === 'function' ? entityStore.listExperiments() : permanentExperiments(entityStore)).filter((item) => item.projectId === project.id);
  const compounds = (typeof entityStore.listCompounds === 'function' ? entityStore.listCompounds() : []).filter((item) => item.projectId === project.id);
  const dataAssets = (typeof entityStore.listDataAssets === 'function' ? entityStore.listDataAssets() : []).filter((item) => item.projectId === project.id);
  const tasks = records.filter((item) => item.type === 'task' && item.projectId === project.id);
  return { project, experiments, compounds, dataAssets, tasks, unresolved: false };
}

function unassignedExperiments(entityStore) {
  return permanentExperiments(entityStore).filter((item) => !item.projectId);
}

function suggestProjectForExperiment(experiment, compounds, projects) {
  if (experiment?.projectId) return null;
  const compound = (compounds || []).find((item) => item.id === experiment?.compoundId);
  if (compound?.projectId) {
    const project = (projects || []).find((item) => item.id === compound.projectId);
    if (project) return { projectId: project.id, title: project.title, strength: 'strong', reason: `关联化合物 ${compound.id} 属于该课题` };
  }
  const projectByTitle = (projects || []).filter((item) => item.title && item.title === experiment?.project);
  if (projectByTitle.length === 1) return { projectId: projectByTitle[0].id, title: projectByTitle[0].title, strength: 'weak', reason: '实验课题文本与课题标题完全一致' };
  return null;
}

function frontmatterOf(app, file) {
  return app?.metadataCache?.getFileCache(file)?.frontmatter || null;
}

async function updateExperimentProject(app, file, project, options = {}) {
  if (!file || !app?.fileManager?.processFrontMatter) return { status: 'failed', error: '无法安全修改实验 frontmatter' };
  const expectedId = String(options.expectedId || '').trim();
  const expectedProjectId = options.expectedProjectId === undefined ? null : String(options.expectedProjectId || '').trim();
  const current = frontmatterOf(app, file);
  if (!current || current.kind !== 'experiment') return { status: 'failed', error: '实验文件已不存在或类型已变化' };
  if (!validateEntityRecord({ id: current.record_id, type: 'experiment', path: file.path }).entityIdValid) return { status: 'failed', error: '实验不是合法的永久 EXP ID' };
  if (expectedId && String(current.record_id || '').trim() !== expectedId) return { status: 'skipped', reason: 'record_id changed since preview' };
  if (expectedProjectId !== null && String(current.project_id || '').trim() !== expectedProjectId) return { status: 'skipped', reason: 'relation changed since preview' };
  const projectId = String(project?.id || '').trim();
  let freshProject = project;
  if (projectId && options.entityStore) {
    freshProject = options.entityStore.getById(projectId, 'project');
    if (!freshProject) return { status: 'failed', error: '目标课题已不存在或类型已变化' };
  }
  const projectTitle = String(freshProject?.title || '').trim();
  if (projectId && (!validateEntityRecord({ id: projectId, type: 'project', path: freshProject?.file?.path }).entityIdValid || !projectTitle)) return { status: 'failed', error: '目标课题无效' };
  try {
    await app.fileManager.processFrontMatter(file, (data) => {
      if (data.kind !== 'experiment' || String(data.record_id || '').trim() !== String(current.record_id || '').trim()) throw new Error('实验在写入前发生变化');
      if (expectedProjectId !== null && String(data.project_id || '').trim() !== expectedProjectId) throw new Error('relation changed since preview');
      data.project_id = projectId;
      data.project = projectTitle;
      data.updated = new Date().toISOString();
    });
    const verified = frontmatterOf(app, file);
    if (!verified || String(verified.project_id || '').trim() !== projectId || String(verified.project || '').trim() !== projectTitle) return { status: 'failed', error: '写入后回读校验失败' };
    return { status: 'success', file, projectId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { status: message.includes('changed since preview') ? 'skipped' : 'failed', error: message };
  }
}

async function batchAssignExperiments(app, items, project, options = {}) {
  const results = { status: 'completed', success: [], skipped: [], failed: [] };
  for (const item of items || []) {
    const result = await updateExperimentProject(app, item.file, project, { expectedId: item.id, expectedProjectId: item.projectId || '', entityStore: options.entityStore });
    if (result.status === 'success') results.success.push({ item, result });
    else if (result.status === 'skipped') results.skipped.push({ item, reason: result.reason || result.error });
    else results.failed.push({ item, error: result.error });
  }
  if (results.failed.length || results.skipped.length) results.status = results.success.length ? 'partial_failure' : 'failed';
  return results;
}

async function upgradeLegacyExperimentAndAssign(app, file, project, options = {}) {
  const current = frontmatterOf(app, file);
  if (!current || current.kind !== 'experiment') return { status: 'failed', error: '实验文件不存在或类型不正确' };
  const rawId = String(current.record_id || '').trim();
  if (validateEntityRecord({ id: rawId, type: 'experiment', path: file.path }).entityIdValid) return { status: 'failed', error: '该实验已经是永久 ID' };
  if (rawId && !rawId.startsWith('LEGACY-')) return { status: 'failed', error: '该实验的 record_id 前缀无效，请先在关系检查中修复' };
  const targetId = String(project?.id || '').trim();
  if (targetId && options.entityStore && !options.entityStore.getById(targetId, 'project')) return { status: 'failed', error: '目标课题已不存在或类型已变化' };
  const permanentId = generateRecordId('EXP');
  try {
    await app.fileManager.processFrontMatter(file, (data) => { if (data.kind !== 'experiment' || String(data.record_id || '').trim() !== String(current.record_id || '').trim()) throw new Error('实验在升级前发生变化'); data.record_id = permanentId; data.updated = new Date().toISOString(); });
    const upgraded = frontmatterOf(app, file);
    if (!upgraded || String(upgraded.record_id || '').trim() !== permanentId) return { status: 'failed', error: 'EXP ID 写入后回读失败' };
    const relation = await updateExperimentProject(app, file, project, { expectedId: permanentId, expectedProjectId: String(upgraded.project_id || '').trim(), entityStore: options.entityStore });
    if (relation.status !== 'success') return { status: relation.status, error: relation.error || relation.reason, permanentId };
    return { status: 'success', permanentId };
  } catch (error) { return { status: 'failed', error: error instanceof Error ? error.message : String(error) }; }
}

module.exports = { permanentExperiments, projectRelations, unassignedExperiments, suggestProjectForExperiment, updateExperimentProject, batchAssignExperiments, upgradeLegacyExperimentAndAssign };
