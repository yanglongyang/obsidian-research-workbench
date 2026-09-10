// Generated from the reviewed source modules in ./lib.
// Obsidian community plugins use a single CommonJS entry file.
const __phdccNativeRequire = require;
const __phdccFactories = {
"./lib/data": function (module, exports, require) {
const { TFile, normalizePath } = require('obsidian');

const TASK_FOLDER = '00-博士工作台/应用数据/任务';
const EXPERIMENT_WRITE_FOLDER = '00-博士工作台/03-实验';
const PROJECT_FOLDER = '00-博士工作台/02-课题';
const PROGRESS_FOLDER = '00-博士工作台/07-进展';
const EXPERIMENT_FOLDERS = ['00-博士工作台/03-实验', '实验记录'];
const DATA_FOLDER = '00-博士工作台/04-数据';
const LITERATURE_FOLDERS = ['文献', '文献阅读', '00-博士工作台/05-文献', 'DMAC_AIE_PET_调研'];
const WRITING_FOLDER = '00-博士工作台/06-写作';

const STATUS_VALUES = ['todo', 'doing', 'done', 'deferred'];
const PRIORITY_VALUES = ['low', 'medium', 'high'];
const EXPERIMENT_STATUS_VALUES = ['planning', 'doing', 'complete', 'blocked'];

function localDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const year = String(d.getFullYear()).padStart(4, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatMinutes(value) {
  const minutes = Math.round(Number(value) || 0);
  if (!Number.isFinite(minutes) || minutes < 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours === 0) return `${remaining}m`;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

function isPathInside(path, folder) {
  const p = normalizePath(path || '');
  const f = normalizePath(folder || '').replace(/\/+$/, '');
  if (!p || !f || p.split('/').includes('..') || f.split('/').includes('..')) return false;
  return p === f || p.startsWith(`${f}/`);
}

function yamlString(value) {
  return JSON.stringify(String(value ?? ''));
}

function sanitizeTitleSegment(title) {
  const clean = String(title)
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/^[\s.]+|[\s.]+$/g, '')
    .slice(0, 48)
    .replace(/^[\s.]+|[\s.]+$/g, '');
  return clean || 'task';
}

function localCompactTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${String(date.getFullYear()).padStart(4, '0')}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function generateRecordId(prefix = 'REC') {
  const normalizedPrefix = String(prefix || 'REC').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '') || 'REC';
  const timestamp = Date.now().toString(36).toUpperCase().padStart(10, '0');
  let random = '';
  try {
    if (globalThis.crypto?.randomUUID) random = globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();
  } catch (error) {
    // Older Electron runtimes may not expose randomUUID; the fallback remains collision-resistant enough here.
  }
  if (!random) random = Math.random().toString(36).slice(2, 12).toUpperCase().padEnd(10, '0');
  return `${normalizedPrefix}-${timestamp}${random}`;
}

function isValidDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(2000, month - 1, day);
  date.setFullYear(year);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

async function ensureFolder(vault, folder) {
  const target = normalizePath(folder);
  if (!target || !isPathInside(target, folder)) throw new Error('Unsafe folder');
  const segments = target.split('/').filter(Boolean);
  let current = '';
  for (const segment of segments) {
    current = normalizePath(current ? `${current}/${segment}` : segment);
    if (vault.getAbstractFileByPath(current)) continue;
    try {
      await vault.createFolder(current);
    } catch (error) {
      if (!vault.getAbstractFileByPath(current)) throw new Error('Could not create task folder');
    }
  }
}

async function ensureTaskFolder(vault) {
  return ensureFolder(vault, TASK_FOLDER);
}

async function ensureExperimentFolder(vault) {
  return ensureFolder(vault, EXPERIMENT_WRITE_FOLDER);
}

function buildTaskPath(vault, title) {
  const timestamp = localCompactTimestamp();
  const segment = sanitizeTitleSegment(title);
  let suffix = 1;
  let candidate;
  do {
    const extra = suffix === 1 ? '' : `-${suffix}`;
    candidate = normalizePath(`${TASK_FOLDER}/${timestamp}-${segment}${extra}.md`);
    suffix += 1;
  } while (vault.getAbstractFileByPath(candidate));
  if (!isPathInside(candidate, TASK_FOLDER)) throw new Error('Unsafe task path');
  return candidate;
}

function buildExperimentPath(vault, title, experimentDate) {
  const timestamp = localCompactTimestamp();
  const segment = sanitizeTitleSegment(title);
  const date = isValidDateString(experimentDate) ? experimentDate : localDate();
  let suffix = 1;
  let candidate;
  do {
    const extra = suffix === 1 ? '' : `-${suffix}`;
    candidate = normalizePath(`${EXPERIMENT_WRITE_FOLDER}/${date}-${timestamp}-${segment}${extra}.md`);
    suffix += 1;
  } while (vault.getAbstractFileByPath(candidate));
  if (!isPathInside(candidate, EXPERIMENT_WRITE_FOLDER)) throw new Error('Unsafe experiment path');
  return candidate;
}

function renderTaskContent(task) {
  return [
    '---',
    `record_id: ${yamlString(task.recordId)}`,
    'kind: workbench-task',
    `title: ${yamlString(task.title)}`,
    'status: todo',
    `priority: ${yamlString(task.priority)}`,
    `category: ${yamlString(task.category)}`,
    `due: ${yamlString(task.due)}`,
    `estimate: ${task.estimate}`,
    `created: ${yamlString(task.created)}`,
    `updated: ${yamlString(task.updated)}`,
    'tags:',
    '  - workbench/task',
    '---',
    `# ${task.title}`,
    '',
    '## 说明',
    '',
    task.details || '',
    ''
  ].join('\n');
}

function renderExperimentContent(experiment) {
  return [
    '---',
    `record_id: ${yamlString(experiment.recordId)}`,
    'kind: experiment',
    `experiment_type: ${yamlString(experiment.experimentType)}`,
    `project_id: ${yamlString(experiment.projectId)}`,
    `compound_id: ${yamlString(experiment.compoundId)}`,
    `title: ${yamlString(experiment.title)}`,
    `project: ${yamlString(experiment.project)}`,
    `compound: ${yamlString(experiment.compound)}`,
    `status: ${yamlString(experiment.status)}`,
    `experiment_date: ${yamlString(experiment.experimentDate)}`,
    `sample: ${yamlString(experiment.sample)}`,
    `data_path: ${yamlString(experiment.dataPath)}`,
    `key_result: ${yamlString(experiment.keyResult)}`,
    `next_action: ${yamlString(experiment.nextAction)}`,
    `created: ${yamlString(experiment.created)}`,
    `updated: ${yamlString(experiment.updated)}`,
    'tags:',
    '  - phd-workbench/experiment',
    '---',
    `# ${experiment.title}`,
    '',
    '## 目标 / 假设',
    '',
    experiment.objective || '',
    '',
    '## 样本与材料',
    '',
    experiment.sample || '',
    '',
    '## 实验过程',
    '',
    experiment.protocol || '',
    '',
    '## 原始数据位置',
    '',
    experiment.dataPath || '',
    '',
    '## 观察与结果',
    '',
    experiment.keyResult || '',
    '',
    '## 问题与偏差',
    '',
    experiment.problems || '',
    '',
    '## 下一步',
    '',
    experiment.nextAction || '',
    ''
  ].join('\n');
}

class TaskStore {
  constructor(plugin) {
    this.plugin = plugin;
    this.app = plugin.app;
  }

  listTasks() {
    const tasks = [];
    for (const file of this.app.vault.getMarkdownFiles()) {
      if (!isPathInside(file.path, TASK_FOLDER)) continue;
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
      if (!frontmatter || frontmatter.kind !== 'workbench-task') continue;
      tasks.push({
        file,
        recordId: typeof frontmatter.record_id === 'string' ? frontmatter.record_id.trim() : '',
        title: typeof frontmatter.title === 'string' && frontmatter.title.trim() ? frontmatter.title : file.basename,
        status: STATUS_VALUES.includes(frontmatter.status) ? frontmatter.status : 'todo',
        priority: PRIORITY_VALUES.includes(frontmatter.priority) ? frontmatter.priority : 'medium',
        category: typeof frontmatter.category === 'string' ? frontmatter.category : '',
        due: typeof frontmatter.due === 'string' ? frontmatter.due : '',
        estimate: Number.isFinite(Number(frontmatter.estimate)) ? Math.max(0, Number(frontmatter.estimate)) : 0,
        created: typeof frontmatter.created === 'string' ? frontmatter.created : '',
        updated: typeof frontmatter.updated === 'string' ? frontmatter.updated : ''
      });
    }
    return tasks;
  }

  async createTask(input) {
    const title = typeof input?.title === 'string' ? input.title.trim() : '';
    const priority = input?.priority;
    const due = input?.due;
    const estimate = Number(input?.estimate);
    if (!title) throw new Error('请输入任务标题');
    if (!PRIORITY_VALUES.includes(priority)) throw new Error('优先级无效');
    if (!isValidDateString(due)) throw new Error('日期无效');
    if (!Number.isFinite(estimate) || estimate < 0) throw new Error('预计时长无效');

    const now = new Date().toISOString();
    await ensureTaskFolder(this.app.vault);
    const taskPath = buildTaskPath(this.app.vault, title);
    const content = renderTaskContent({
      recordId: generateRecordId('TASK'),
      title,
      priority,
      category: String(input.category || ''),
      due,
      estimate,
      details: String(input.details || ''),
      created: now,
      updated: now
    });
    return this.app.vault.create(taskPath, content);
  }

  async createExperiment(input) {
    const title = typeof input?.title === 'string' ? input.title.trim() : '';
    const experimentDate = input?.experimentDate;
    const status = input?.status;
    if (!title) throw new Error('请输入实验标题');
    if (!isValidDateString(experimentDate)) throw new Error('实验日期无效');
    if (!EXPERIMENT_STATUS_VALUES.includes(status)) throw new Error('实验状态无效');

    const now = new Date().toISOString();
    await ensureExperimentFolder(this.app.vault);
    const experimentPath = buildExperimentPath(this.app.vault, title, experimentDate);
    const content = renderExperimentContent({
      recordId: generateRecordId('EXP'),
      experimentType: String(input.experimentType || 'general').trim() || 'general',
      projectId: String(input.projectId || '').trim(),
      compoundId: String(input.compoundId || '').trim(),
      title,
      experimentDate,
      status,
      project: String(input.project || '').trim(),
      compound: String(input.compound || '').trim(),
      sample: String(input.sample || '').trim(),
      objective: String(input.objective || '').trim(),
      protocol: String(input.protocol || '').trim(),
      dataPath: String(input.dataPath || '').trim(),
      keyResult: String(input.keyResult || '').trim(),
      problems: String(input.problems || '').trim(),
      nextAction: String(input.nextAction || '').trim(),
      created: now,
      updated: now
    });
    return this.app.vault.create(experimentPath, content);
  }

  async toggleTask(task) {
    if (!task || !(task.file instanceof TFile)) throw new Error('任务文件无效');
    if (!isPathInside(task.file.path, TASK_FOLDER)) throw new Error('拒绝修改非工作台任务');
    const frontmatter = this.app.metadataCache.getFileCache(task.file)?.frontmatter;
    if (!frontmatter || frontmatter.kind !== 'workbench-task') throw new Error('拒绝修改非工作台任务');
    const newStatus = frontmatter.status === 'done' ? 'todo' : 'done';
    await this.app.fileManager.processFrontMatter(task.file, (data) => {
      if (data.kind !== 'workbench-task') throw new Error('任务类型已变化');
      data.status = newStatus;
      data.updated = new Date().toISOString();
    });
    return newStatus;
  }
}

function collectReadOnlyFiles(app, folders, limit = 20) {
  const boundaries = (Array.isArray(folders) ? folders : [folders])
    .filter(Boolean)
    .map((folder) => normalizePath(folder).replace(/\/+$/, ''));
  if (!boundaries.length) return [];
  return app.vault.getMarkdownFiles()
    .filter((file) => boundaries.some((folder) => isPathInside(file.path, folder)))
    .sort((a, b) => b.stat.mtime - a.stat.mtime)
    .slice(0, Math.max(0, Number(limit) || 0));
}

module.exports = {
  TASK_FOLDER,
  EXPERIMENT_WRITE_FOLDER,
  PROJECT_FOLDER,
  PROGRESS_FOLDER,
  EXPERIMENT_FOLDERS,
  DATA_FOLDER,
  LITERATURE_FOLDERS,
  WRITING_FOLDER,
  localDate,
  generateRecordId,
  buildTaskPath,
  buildExperimentPath,
  formatMinutes,
  isPathInside,
  TaskStore,
  collectReadOnlyFiles
};

},
"./lib/database": function (module, exports, require) {
const DB_FOLDER = '00-博士工作台/应用数据/数据库';
const DB_FILE = `${DB_FOLDER}/records.json`;
const AUDIT_FOLDER = '00-博士工作台/应用数据/审计';
const AUDIT_FILE = `${AUDIT_FOLDER}/nmr-archive.jsonl`;
const DATABASE_SCHEMA_VERSION = 3;
const MANAGED_FOLDERS = ['00-博士工作台', '实验记录', '文献', '文献阅读', 'DMAC_AIE_PET_调研'];

function normalizePath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

function pathInside(filePath, folder) {
  const file = normalizePath(filePath);
  const root = normalizePath(folder);
  return Boolean(file && root && (file === root || file.startsWith(`${root}/`)));
}

function isManagedPath(filePath) {
  return MANAGED_FOLDERS.some((folder) => pathInside(filePath, folder));
}

function isDerivedPath(filePath) {
  const path = normalizePath(filePath);
  return path === DB_FILE || path === AUDIT_FILE || pathInside(path, DB_FOLDER) || pathInside(path, AUDIT_FOLDER);
}

function affectsManagedPath(paths) {
  return (Array.isArray(paths) ? paths : [paths])
    .filter(Boolean)
    .some((filePath) => isManagedPath(filePath) && !isDerivedPath(filePath));
}

function findDuplicateIds(records) {
  const byId = new Map();
  (Array.isArray(records) ? records : []).forEach((record) => {
    if (!record?.id) return;
    if (!byId.has(record.id)) byId.set(record.id, []);
    byId.get(record.id).push(record);
  });
  return [...byId.entries()]
    .filter(([, matches]) => matches.length > 1)
    .map(([id, matches]) => ({ id, paths: matches.map((record) => record.path) }));
}

function simpleHash(value) {
  let hash = 2166136261;
  for (const char of String(value || '')) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0').toUpperCase();
}

function firstString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function firstArray(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(/[ ,]+/).map((item) => item.trim()).filter(Boolean);
  return [];
}

function recordType(filePath, frontmatter) {
  const path = normalizePath(filePath);
  if (frontmatter?.kind === 'workbench-task') return 'task';
  if (frontmatter?.kind === 'project') return 'project';
  if (frontmatter?.kind === 'compound') return 'compound';
  if (frontmatter?.kind === 'data-asset') return 'data-asset';
  if (frontmatter?.kind === 'experiment' || pathInside(path, '00-博士工作台/03-实验') || pathInside(path, '实验记录')) return 'experiment';
  if (pathInside(path, '00-博士工作台/02-课题')) return 'project';
  if (pathInside(path, '00-博士工作台/04-数据')) return 'data';
  if (pathInside(path, '00-博士工作台/05-文献') || pathInside(path, '文献') || pathInside(path, '文献阅读') || pathInside(path, 'DMAC_AIE_PET_调研')) return 'literature';
  if (pathInside(path, '00-博士工作台/06-写作')) return 'writing';
  if (pathInside(path, '00-博士工作台/07-进展')) return 'progress';
  return pathInside(path, '00-博士工作台') ? 'note' : '';
}

const RELATION_RULES = {
  experiment: { projectId: 'project', compoundId: 'compound' },
  compound: { projectId: 'project' },
  'data-asset': { projectId: 'project', experimentId: 'experiment', compoundId: 'compound' }
};

function validateRelationships(records) {
  const list = Array.isArray(records) ? records : [];
  const byId = new Map();
  list.forEach((record) => { if (record?.id) { if (!byId.has(record.id)) byId.set(record.id, []); byId.get(record.id).push(record); } });
  const issues = [];
  const duplicateIds = [...byId.entries()].filter(([, matches]) => matches.length > 1);
  duplicateIds.forEach(([id, matches]) => matches.forEach((source) => issues.push({ type: 'duplicate_record_id', sourcePath: source.path, sourceId: source.id, field: 'record_id', targetId: id, message: `record_id 重复：${id}` })));
  let validRelationCount = 0;
  list.forEach((source) => {
    const rules = RELATION_RULES[source.type] || {};
    Object.entries(rules).forEach(([field, expectedType]) => {
      const targetId = String(source[field] || '').trim();
      if (!targetId) return;
      if (targetId === source.id) { issues.push({ type: 'self_reference', sourcePath: source.path, sourceId: source.id, field, targetId, message: `${field} 不能指向自身` }); return; }
      if (targetId.startsWith('LEGACY-')) { issues.push({ type: 'legacy_reference', sourcePath: source.path, sourceId: source.id, field, targetId, message: `${field} 仍引用旧路径 ID` }); return; }
      const matches = byId.get(targetId) || [];
      if (!matches.length) { issues.push({ type: 'missing_target', sourcePath: source.path, sourceId: source.id, field, targetId, message: `${field} 目标不存在：${targetId}` }); return; }
      if (matches.length > 1) { issues.push({ type: 'duplicate_record_id', sourcePath: source.path, sourceId: source.id, field, targetId, message: `目标 ID 重复：${targetId}` }); return; }
      if (matches[0].type !== expectedType) { issues.push({ type: 'wrong_target_type', sourcePath: source.path, sourceId: source.id, field, targetId, expectedType, actualType: matches[0].type, message: `${field} 目标类型应为 ${expectedType}` }); return; }
      validRelationCount += 1;
    });
  });
  const byUniqueId = (id, type) => {
    const matches = byId.get(id) || [];
    return matches.length === 1 && matches[0].type === type ? matches[0] : null;
  };
  const addConflict = (source, field, targetId, relatedField, expectedId, actualId, message) => issues.push({ type: 'relation_conflict', sourceId: source.id, sourcePath: source.path, field, targetId, relatedField, expectedId, actualId, message });
  list.forEach((source) => {
    if (source.type === 'experiment') {
      const compound = source.compoundId && byUniqueId(source.compoundId, 'compound');
      if (source.projectId && compound?.projectId && source.projectId !== compound.projectId) addConflict(source, 'compoundId', source.compoundId, 'projectId', source.projectId, compound.projectId, '实验关联的化合物属于其他课题');
    }
    if (source.type === 'data-asset') {
      const experiment = source.experimentId && byUniqueId(source.experimentId, 'experiment');
      const compound = source.compoundId && byUniqueId(source.compoundId, 'compound');
      if (source.projectId && experiment?.projectId && source.projectId !== experiment.projectId) addConflict(source, 'experimentId', source.experimentId, 'projectId', source.projectId, experiment.projectId, '数据资产的 project_id 与关联实验的 project_id 不一致');
      if (source.projectId && compound?.projectId && source.projectId !== compound.projectId) addConflict(source, 'compoundId', source.compoundId, 'projectId', source.projectId, compound.projectId, '数据资产关联的化合物属于其他课题');
      if (experiment?.compoundId && compound?.id && experiment.compoundId !== compound.id) addConflict(source, 'compoundId', source.compoundId, 'experiment.compoundId', experiment.compoundId, compound.id, '数据资产的实验与化合物关联不一致');
    }
  });
  return { issues, validRelationCount };
}

function identityFor(filePath, frontmatter, type) {
  const supplied = firstString(frontmatter.record_id);
  if (supplied) return { id: supplied, identitySource: 'frontmatter' };
  return { id: `LEGACY-${String(type || 'record').toUpperCase()}-${simpleHash(filePath)}`, identitySource: 'legacy-path' };
}

function frontmatterTags(frontmatter) {
  return firstArray(frontmatter?.tags);
}

class ResearchDatabase {
  constructor(plugin) {
    this.plugin = plugin;
    this.app = plugin.app;
    this.records = [];
    this.duplicateIds = [];
    this.lastSync = '';
    this.error = '';
  }

  async ensureFolder() {
    const segments = DB_FOLDER.split('/');
    let current = '';
    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      if (this.app.vault.getAbstractFileByPath(current)) continue;
      try {
        await this.app.vault.createFolder(current);
      } catch (error) {
        if (!this.app.vault.getAbstractFileByPath(current)) throw error;
      }
    }
  }

  collectRecords() {
    const records = [];
    for (const file of this.app.vault.getMarkdownFiles()) {
      if (!isManagedPath(file.path) || isDerivedPath(file.path)) continue;
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter || {};
      const type = recordType(file.path, frontmatter);
      if (!type) continue;
      const path = normalizePath(file.path);
      const identity = identityFor(path, frontmatter, type);
      records.push({
        id: identity.id,
        identitySource: identity.identitySource,
        type,
        title: firstString(frontmatter.title) || file.basename,
        path,
        folder: path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '',
        kind: firstString(frontmatter.kind),
        status: firstString(frontmatter.status),
        priority: firstString(frontmatter.priority),
        category: firstString(frontmatter.category) || firstString(frontmatter.project),
        date: firstString(frontmatter.due) || firstString(frontmatter.experiment_date) || firstString(frontmatter.date),
        project: firstString(frontmatter.project),
        projectId: firstString(frontmatter.project_id),
        compoundId: firstString(frontmatter.compound_id),
        experimentId: firstString(frontmatter.experiment_id),
        dataAssetId: firstString(frontmatter.data_asset_id),
        parentId: firstString(frontmatter.parent_id),
        relatedIds: firstArray(frontmatter.related_ids),
        sample: firstString(frontmatter.sample),
        dataPath: firstString(frontmatter.data_path),
        assetType: firstString(frontmatter.asset_type),
        compoundCode: firstString(frontmatter.compound_code),
        acquiredAt: firstString(frontmatter.acquired_at),
        tags: frontmatterTags(frontmatter),
        updated: firstString(frontmatter.updated) || new Date(file.stat.mtime).toISOString(),
        size: file.stat.size
      });
    }
    return records.sort((a, b) => String(b.updated).localeCompare(String(a.updated)) || a.title.localeCompare(b.title));
  }

  async sync() {
    this.error = '';
    this.relationshipIssues = [];
    this.validRelationCount = 0;
    try {
      await this.ensureFolder();
      const records = this.collectRecords();
      const payloadData = { version: DATABASE_SCHEMA_VERSION, updated: new Date().toISOString(), records };
      const payload = JSON.stringify(payloadData, null, 2) + '\n';
      const existing = this.app.vault.getAbstractFileByPath(DB_FILE);
      if (!existing) await this.app.vault.create(DB_FILE, payload);
      else if (existing.extension === 'json') {
        const old = await this.app.vault.read(existing);
        try {
          const oldData = JSON.parse(old);
          if (JSON.stringify(oldData.records || []) !== JSON.stringify(records) || oldData.version !== DATABASE_SCHEMA_VERSION) await this.app.vault.modify(existing, payload);
        } catch (error) {
          await this.app.vault.modify(existing, payload);
        }
      }
      this.duplicateIds = findDuplicateIds(records);
      const integrity = validateRelationships(records);
      this.relationshipIssues = integrity.issues;
      this.validRelationCount = integrity.validRelationCount;
      this.records = records;
      this.lastSync = new Date().toISOString();
      return records;
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
      console.error('[Research Workbench] database sync failed', error);
      throw error;
    }
  }

  async refresh() {
    return this.sync();
  }
}

module.exports = {
  DB_FOLDER,
  DB_FILE,
  AUDIT_FOLDER,
  AUDIT_FILE,
  DATABASE_SCHEMA_VERSION,
  MANAGED_FOLDERS,
  normalizePath,
  pathInside,
  isManagedPath,
  isDerivedPath,
  affectsManagedPath,
  findDuplicateIds,
  validateRelationships,
  simpleHash,
  recordType,
  identityFor,
  ResearchDatabase
};

},
"./lib/entities/project": function (module, exports, require) {
const PROJECT_ENTITY_FOLDER = '00-博士工作台/02-课题';

function yamlString(value) { return JSON.stringify(String(value ?? '')); }

function sanitizeSegment(value) {
  const clean = String(value || '').replace(/[<>:"/\\|?*]/g, '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 64);
  return clean || 'project';
}

async function ensureFolder(vault, folder) {
  let current = '';
  for (const segment of folder.split('/')) {
    current = current ? `${current}/${segment}` : segment;
    if (vault.getAbstractFileByPath(current)) continue;
    try { await vault.createFolder(current); } catch (error) {
      if (!vault.getAbstractFileByPath(current)) throw error;
    }
  }
}

function buildProjectPath(vault, title) {
  const segment = sanitizeSegment(title);
  let suffix = 1;
  let candidate = '';
  do {
    candidate = `${PROJECT_ENTITY_FOLDER}/${segment}${suffix === 1 ? '' : `-${suffix}`}.md`;
    suffix += 1;
  } while (vault.getAbstractFileByPath(candidate));
  return candidate;
}

function renderProjectContent(project) {
  return [
    '---',
    `record_id: ${yamlString(project.recordId)}`,
    'kind: project',
    `title: ${yamlString(project.title)}`,
    `status: ${yamlString(project.status || 'active')}`,
    `description: ${yamlString(project.description)}`,
    `stage: ${yamlString(project.stage)}`,
    `next_action: ${yamlString(project.nextAction)}`,
    `created: ${yamlString(project.created)}`,
    `updated: ${yamlString(project.updated)}`,
    'tags:',
    '  - research/project',
    '---',
    `# ${project.title}`,
    '',
    '## 目标与范围',
    '',
    project.description || '',
    '',
    '## 下一步',
    '',
    project.nextAction || '',
    ''
  ].join('\n');
}

async function createProject(app, input, generateRecordId) {
  const title = String(input?.title || '').trim();
  if (!title) throw new Error('请输入课题名称');
  await ensureFolder(app.vault, PROJECT_ENTITY_FOLDER);
  const now = new Date().toISOString();
  const project = { recordId: generateRecordId('PROJ'), title, status: String(input.status || 'active'), description: String(input.description || '').trim(), stage: String(input.stage || '').trim(), nextAction: String(input.nextAction || '').trim(), created: now, updated: now };
  return app.vault.create(buildProjectPath(app.vault, title), renderProjectContent(project));
}

module.exports = { PROJECT_ENTITY_FOLDER, buildProjectPath, renderProjectContent, createProject };

},
"./lib/entities/compound": function (module, exports, require) {
const COMPOUND_FOLDER = '00-博士工作台/04-化合物';

function yamlString(value) { return JSON.stringify(String(value ?? '')); }
function sanitizeSegment(value) {
  const clean = String(value || '').replace(/[<>:"/\\|?*]/g, '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 64);
  return clean || 'compound';
}
async function ensureFolder(vault, folder) {
  let current = '';
  for (const segment of folder.split('/')) {
    current = current ? `${current}/${segment}` : segment;
    if (vault.getAbstractFileByPath(current)) continue;
    try { await vault.createFolder(current); } catch (error) { if (!vault.getAbstractFileByPath(current)) throw error; }
  }
}
function buildCompoundPath(vault, code) {
  const segment = sanitizeSegment(code);
  let suffix = 1;
  let candidate = '';
  do { candidate = `${COMPOUND_FOLDER}/${segment}${suffix === 1 ? '' : `-${suffix}`}.md`; suffix += 1; } while (vault.getAbstractFileByPath(candidate));
  return candidate;
}
function renderCompoundContent(compound) {
  return [
    '---',
    `record_id: ${yamlString(compound.recordId)}`,
    'kind: compound',
    `compound_code: ${yamlString(compound.compoundCode)}`,
    `title: ${yamlString(compound.name || compound.compoundCode)}`,
    `name: ${yamlString(compound.name)}`,
    `project_id: ${yamlString(compound.projectId)}`,
    `project: ${yamlString(compound.project)}`,
    `smiles: ${yamlString(compound.smiles)}`,
    `formula: ${yamlString(compound.formula)}`,
    `molecular_weight: ${yamlString(compound.molecularWeight)}`,
    `status: ${yamlString(compound.status || 'active')}`,
    `created: ${yamlString(compound.created)}`,
    `updated: ${yamlString(compound.updated)}`,
    'tags:',
    '  - research/compound',
    '---',
    `# ${compound.name || compound.compoundCode}`,
    '',
    '## 基本信息',
    '',
    `化合物编号：${compound.compoundCode}`,
    '',
    '## 设计与用途',
    '',
    compound.notes || '',
    '',
    '## 合成记录',
    '',
    '## 表征',
    '',
    ''
  ].join('\n');
}
async function createCompound(app, input, generateRecordId) {
  const compoundCode = String(input?.compoundCode || '').trim();
  if (!compoundCode) throw new Error('请输入化合物编号');
  await ensureFolder(app.vault, COMPOUND_FOLDER);
  const now = new Date().toISOString();
  const compound = { recordId: generateRecordId('CMP'), compoundCode, name: String(input.name || '').trim(), projectId: String(input.projectId || '').trim(), project: String(input.project || '').trim(), smiles: String(input.smiles || '').trim(), formula: String(input.formula || '').trim(), molecularWeight: String(input.molecularWeight || '').trim(), status: String(input.status || 'active'), notes: String(input.notes || '').trim(), created: now, updated: now };
  return app.vault.create(buildCompoundPath(app.vault, compoundCode), renderCompoundContent(compound));
}
module.exports = { COMPOUND_FOLDER, buildCompoundPath, renderCompoundContent, createCompound };

},
"./lib/entities/data-asset": function (module, exports, require) {
const DATA_ASSET_FOLDER = '00-博士工作台/04-数据资产';
const ASSET_TYPES = ['nmr', 'hplc', 'ms', 'uvvis', 'fluorescence', 'image', 'orca', 'raw', 'other'];

function yamlString(value) { return JSON.stringify(String(value ?? '')); }
function sanitizeSegment(value) {
  const clean = String(value || '').replace(/[<>:"/\\|?*]/g, '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 72);
  return clean || 'data-asset';
}
async function ensureFolder(vault, folder) {
  let current = '';
  for (const segment of folder.split('/')) {
    current = current ? `${current}/${segment}` : segment;
    if (vault.getAbstractFileByPath(current)) continue;
    try { await vault.createFolder(current); } catch (error) { if (!vault.getAbstractFileByPath(current)) throw error; }
  }
}
function buildDataAssetPath(vault, title) {
  const segment = sanitizeSegment(title);
  let suffix = 1;
  let candidate = '';
  do { candidate = `${DATA_ASSET_FOLDER}/${segment}${suffix === 1 ? '' : `-${suffix}`}.md`; suffix += 1; } while (vault.getAbstractFileByPath(candidate));
  return candidate;
}
function renderDataAssetContent(asset) {
  return [
    '---',
    `record_id: ${yamlString(asset.recordId)}`,
    'kind: data-asset',
    `title: ${yamlString(asset.title)}`,
    `asset_type: ${yamlString(asset.assetType)}`,
    `project_id: ${yamlString(asset.projectId)}`,
    `project: ${yamlString(asset.project)}`,
    `experiment_id: ${yamlString(asset.experimentId)}`,
    `experiment: ${yamlString(asset.experiment)}`,
    `compound_id: ${yamlString(asset.compoundId)}`,
    `compound: ${yamlString(asset.compound)}`,
    `data_path: ${yamlString(asset.dataPath)}`,
    `acquired_at: ${yamlString(asset.acquiredAt)}`,
    `status: ${yamlString(asset.status || 'available')}`,
    `created: ${yamlString(asset.created)}`,
    `updated: ${yamlString(asset.updated)}`,
    'tags:',
    '  - research/data',
    '---',
    `# ${asset.title}`,
    '',
    '## 数据位置',
    '',
    asset.dataPath || '',
    '',
    '## 备注',
    '',
    asset.notes || '',
    ''
  ].join('\n');
}
async function createDataAsset(app, input, generateRecordId) {
  const title = String(input?.title || '').trim();
  const assetType = String(input?.assetType || '').trim();
  const dataPath = String(input?.dataPath || '').trim();
  if (!title) throw new Error('请输入数据资产标题');
  if (!ASSET_TYPES.includes(assetType)) throw new Error('数据资产类型无效');
  if (!dataPath) throw new Error('请输入数据路径');
  await ensureFolder(app.vault, DATA_ASSET_FOLDER);
  const now = new Date().toISOString();
  const asset = { recordId: generateRecordId('DATA'), title, assetType, dataPath, projectId: String(input.projectId || '').trim(), project: String(input.project || '').trim(), experimentId: String(input.experimentId || '').trim(), experiment: String(input.experiment || '').trim(), compoundId: String(input.compoundId || '').trim(), compound: String(input.compound || '').trim(), acquiredAt: String(input.acquiredAt || '').trim(), status: String(input.status || 'available'), notes: String(input.notes || '').trim(), created: now, updated: now };
  const file = await app.vault.create(buildDataAssetPath(app.vault, title), renderDataAssetContent(asset));
  return { file, asset };
}
module.exports = { DATA_ASSET_FOLDER, ASSET_TYPES, ensureFolder, buildDataAssetPath, renderDataAssetContent, createDataAsset };

},
"./lib/entities/nmr-ledger": function (module, exports, require) {
const { DATA_ASSET_FOLDER, ensureFolder } = require('./lib/entities/data-asset');

const NMR_LEDGER_PATH = `${DATA_ASSET_FOLDER}/NMR 归档台账.md`;
const NMR_LEDGER_ID = 'DATA-NMR-LEDGER';
const START_MARKER = '<!-- NMR_LEDGER_ENTRIES_START -->';
const END_MARKER = '<!-- NMR_LEDGER_ENTRIES_END -->';

function yamlString(value) { return JSON.stringify(String(value ?? '')); }
function cell(value) { return String(value ?? '').replace(/[\r\n]+/g, ' ').replace(/\|/g, '\\|').trim() || '—'; }
function isNmrLedgerPath(value) { return String(value || '').replace(/\\/g, '/') === NMR_LEDGER_PATH; }

function renderLedger(entries, archiveRoot = '', timestamps = {}) {
  const created = timestamps.created || new Date().toISOString();
  const updated = timestamps.updated || new Date().toISOString();
  const rows = entries.map((entry) => `| ${cell(entry.entryId)} | ${cell(entry.nucleus)} | ${cell(entry.dataPath)} | ${cell(entry.project || entry.projectId)} | ${cell(entry.experiment || entry.experimentId)} | ${cell(entry.compound || entry.compoundId)} | ${cell(entry.archivedAt)} |`).join('\n');
  return [
    '---',
    `record_id: ${yamlString(NMR_LEDGER_ID)}`,
    'kind: data-asset',
    `title: ${yamlString('NMR 归档台账')}`,
    `asset_type: ${yamlString('nmr')}`,
    `data_path: ${yamlString(archiveRoot)}`,
    `status: ${yamlString('available')}`,
    `created: ${yamlString(created)}`,
    `updated: ${yamlString(updated)}`,
    'tags:',
    '  - research/data',
    '  - research/nmr',
    '---',
    '# NMR 归档台账',
    '',
    '每行对应一套已归档的核磁原始数据。可直接编辑此表；原始目录的实际位置以“数据路径”为准。',
    '',
    '## 归档记录',
    '',
    START_MARKER,
    '| 条目 ID | 核种 | 数据路径 | 课题 | 实验 | 化合物 | 归档时间 |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    rows,
    END_MARKER,
    ''
  ].join('\n');
}

function parseLedgerEntries(content) {
  const start = String(content || '').indexOf(START_MARKER);
  const end = String(content || '').indexOf(END_MARKER);
  if (start < 0 || end < 0 || end <= start) return [];
  return String(content).slice(start + START_MARKER.length, end).split('\n').slice(3).map((line) => {
    const cells = line.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((value) => value.trim().replace(/\\\|/g, '|'));
    if (cells.length < 7 || !cells[0] || cells[0] === '—') return null;
    return { entryId: cells[0], nucleus: cells[1], dataPath: cells[2], project: cells[3], experiment: cells[4], compound: cells[5], archivedAt: cells[6] };
  }).filter(Boolean);
}

async function upsertNmrLedger(app, input) {
  if (!app?.vault) throw new Error('Obsidian Vault 不可用，无法登记 NMR 台账');
  const entryId = String(input?.entryId || '').trim();
  const dataPath = String(input?.dataPath || '').trim();
  if (!entryId || !dataPath) throw new Error('NMR 台账条目缺少 ID 或数据路径');
  await ensureFolder(app.vault, DATA_ASSET_FOLDER);
  const existing = app.vault.getAbstractFileByPath(NMR_LEDGER_PATH);
  const now = new Date().toISOString();
  let entries = [];
  let created = now;
  if (existing) {
    const content = await app.vault.read(existing);
    entries = parseLedgerEntries(content);
    const createdMatch = content.match(/^created:\s*["']?([^\n"']+)/m);
    created = createdMatch?.[1]?.trim() || now;
  }
  const entry = {
    entryId,
    nucleus: String(input.nucleus || ''),
    dataPath,
    projectId: String(input.projectId || ''), project: String(input.project || ''),
    experimentId: String(input.experimentId || ''), experiment: String(input.experiment || ''),
    compoundId: String(input.compoundId || ''), compound: String(input.compound || ''),
    archivedAt: String(input.archivedAt || now)
  };
  const index = entries.findIndex((item) => item.entryId === entryId);
  if (index >= 0) entries[index] = entry;
  else entries.push(entry);
  const content = renderLedger(entries, String(input.archiveRoot || ''), { created, updated: now });
  let file = existing;
  if (!file) file = await app.vault.create(NMR_LEDGER_PATH, content);
  else await app.vault.modify(file, content);
  return { file, ledgerId: NMR_LEDGER_ID, entryId, created: !existing, entryCount: entries.length };
}

function legacyNmrAssets(app) {
  if (!app?.vault || !app?.metadataCache) return [];
  return app.vault.getMarkdownFiles().filter((file) => file.path.startsWith(`${DATA_ASSET_FOLDER}/`) && !isNmrLedgerPath(file.path)).map((file) => ({ file, frontmatter: app.metadataCache.getFileCache(file)?.frontmatter || {} })).filter(({ frontmatter }) => frontmatter.kind === 'data-asset' && frontmatter.asset_type === 'nmr');
}

async function consolidateLegacyNmrAssets(app) {
  const items = legacyNmrAssets(app);
  const migrated = [];
  const skipped = [];
  const failed = [];
  for (const { file, frontmatter } of items) {
    const dataPath = String(frontmatter.data_path || '').trim();
    const entryId = String(frontmatter.record_id || '').trim();
    if (!dataPath || !entryId) { skipped.push({ file, reason: '缺少 record_id 或 data_path' }); continue; }
    try {
      await upsertNmrLedger(app, {
        entryId: `LEGACY-${entryId}`,
        nucleus: /13C/i.test(String(frontmatter.title || '')) ? '13C' : /1H/i.test(String(frontmatter.title || '')) ? '1H' : 'NMR',
        dataPath,
        projectId: frontmatter.project_id, project: frontmatter.project,
        experimentId: frontmatter.experiment_id, experiment: frontmatter.experiment,
        compoundId: frontmatter.compound_id, compound: frontmatter.compound,
        archivedAt: frontmatter.updated || frontmatter.created || frontmatter.acquired_at,
        archiveRoot: ''
      });
      await app.vault.trash(file, false);
      migrated.push(file);
    } catch (error) {
      failed.push({ file, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return { migrated, skipped, failed };
}

module.exports = { NMR_LEDGER_PATH, NMR_LEDGER_ID, isNmrLedgerPath, parseLedgerEntries, renderLedger, upsertNmrLedger, legacyNmrAssets, consolidateLegacyNmrAssets };

},
"./lib/entities/identity": function (module, exports, require) {
const PREFIX_BY_ENTITY = { project: 'PROJ-', experiment: 'EXP-', compound: 'CMP-', 'data-asset': 'DATA-', task: 'TASK-' };

function isPermanentEntityId(id, type) {
  const value = String(id || '').trim();
  const prefix = PREFIX_BY_ENTITY[type];
  return Boolean(prefix && value.startsWith(prefix) && value.length > prefix.length && !value.startsWith('LEGACY-'));
}

module.exports = { PREFIX_BY_ENTITY, isPermanentEntityId };

},
"./lib/ui/page-renderers": function (module, exports, require) {
/* Mechanical page renderer boundary. Renderers receive the WorkbenchView instance
 * so existing state, helpers and modal behavior remain unchanged. */
function renderProjectPage(view, title) { return view._renderProjectPage(title); }
function renderCompoundPage(view) { return view._renderCompoundPage(); }
function renderIntegrityPage(view) { return view._renderIntegrityPage(); }
function renderExperimentPage(view) { return view._renderExperimentPage(); }
function renderResearchDatabasePage(view) { return view._renderResearchDatabasePage(); }
function renderDataPage(view) { return view._renderDataPage(); }
function renderNmrInboxPage(view) { return view._renderNmrInboxPage(); }

module.exports = { renderProjectPage, renderCompoundPage, renderIntegrityPage, renderExperimentPage, renderResearchDatabasePage, renderDataPage, renderNmrInboxPage };

},
"./lib/entities/store": function (module, exports, require) {
const { PROJECT_ENTITY_FOLDER } = require('./lib/entities/project');
const { COMPOUND_FOLDER } = require('./lib/entities/compound');
const { DATA_ASSET_FOLDER } = require('./lib/entities/data-asset');
const { EXPERIMENT_FOLDERS } = require('./lib/data');
const { isPermanentEntityId } = require('./lib/entities/identity');

function text(value) { return typeof value === 'string' ? value.trim() : ''; }
function inFolder(file, folders) {
  return folders.some((folder) => file.path === folder || file.path.startsWith(`${folder}/`));
}

class EntityStore {
  constructor(plugin) { this.plugin = plugin; this.app = plugin.app; }

  list(kind) {
    const folders = kind === 'project' ? [PROJECT_ENTITY_FOLDER] : kind === 'compound' ? [COMPOUND_FOLDER] : kind === 'data-asset' ? [DATA_ASSET_FOLDER] : kind === 'experiment' ? EXPERIMENT_FOLDERS : [];
    return this.app.vault.getMarkdownFiles().map((file) => {
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter || {};
      return { file, frontmatter };
    }).filter(({ file, frontmatter }) => frontmatter.kind === kind && inFolder(file, folders)).map(({ file, frontmatter }) => ({
      file,
      kind,
      id: text(frontmatter.record_id),
      title: text(frontmatter.title) || file.basename,
      projectId: text(frontmatter.project_id),
      project: text(frontmatter.project),
      experimentId: text(frontmatter.experiment_id),
      experiment: text(frontmatter.experiment),
      compoundId: text(frontmatter.compound_id),
      compound: text(frontmatter.compound),
      compoundCode: text(frontmatter.compound_code),
      assetType: text(frontmatter.asset_type),
      status: text(frontmatter.status),
      nextAction: text(frontmatter.next_action || frontmatter.nextAction),
      date: text(frontmatter.experiment_date || frontmatter.date || frontmatter.acquired_at),
      dataPath: text(frontmatter.data_path)
    })).sort((a, b) => a.title.localeCompare(b.title));
  }

  listProjects() { return this.list('project').filter((item) => isPermanentEntityId(item.id, 'project')); }
  listExperiments() { return this.list('experiment').filter((item) => isPermanentEntityId(item.id, 'experiment')); }
  listCompounds() { return this.list('compound').filter((item) => isPermanentEntityId(item.id, 'compound')); }
  listDataAssets() { return this.list('data-asset').filter((item) => isPermanentEntityId(item.id, 'data-asset')); }

  getById(id, expectedKind = '') {
    const items = expectedKind ? this.list(expectedKind) : ['project', 'experiment', 'compound', 'data-asset'].flatMap((kind) => this.list(kind));
    const matches = items.filter((item) => isPermanentEntityId(item.id, expectedKind || ({ project: 'project', experiment: 'experiment', compound: 'compound', 'data-asset': 'data-asset' }[item.kind] || '') ) && item.id === id);
    return matches.length === 1 ? matches[0] : null;
  }
}

module.exports = { EntityStore };

},
"./lib/migrations/permanent-id": function (module, exports, require) {
const { recordType, identityFor } = require('./lib/database');

const PREFIX_BY_TYPE = { task: 'TASK', experiment: 'EXP', project: 'PROJ' };

class PermanentIdMigration {
  constructor(plugin, generateRecordId) {
    this.plugin = plugin;
    this.app = plugin.app;
    this.generateRecordId = generateRecordId;
  }

  scan() {
    const items = [];
    for (const file of this.app.vault.getMarkdownFiles()) {
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter || {};
      const type = recordType(file.path, frontmatter);
      if (!PREFIX_BY_TYPE[type] || String(frontmatter.record_id || '').trim()) continue;
      const identity = identityFor(file.path, frontmatter, type);
      items.push({ file, path: file.path, type, currentId: identity.id, proposedId: this.generateRecordId(PREFIX_BY_TYPE[type]), title: String(frontmatter.title || file.basename) });
    }
    return items;
  }

  async apply(items) {
    const candidates = Array.isArray(items) ? items : [];
    const migrated = [];
    const failed = [];
    const skipped = [];
    for (const item of candidates) {
      try {
        if (!item.file || !this.app.vault.getAbstractFileByPath(item.path)) throw new Error('文件不存在，可能已被移动。');
        const latest = this.app.metadataCache.getFileCache(item.file)?.frontmatter || {};
        if (String(latest.record_id || '').trim()) { skipped.push({ ...item, reason: 'record_id 已在预览后写入' }); continue; }
        await this.app.fileManager.processFrontMatter(item.file, (data) => {
          if (!data.record_id) data.record_id = item.proposedId;
        });
        const after = this.app.metadataCache.getFileCache(item.file)?.frontmatter || {};
        if (String(after.record_id || '').trim() && after.record_id !== item.proposedId) { skipped.push({ ...item, reason: 'record_id 已在写入过程中被其他操作设置' }); continue; }
        migrated.push(item);
      } catch (error) {
        failed.push({ ...item, error: error instanceof Error ? error.message : String(error) });
        console.error('[Research Workbench] permanent ID migration failed', error);
      }
    }
    return { status: failed.length ? (migrated.length || skipped.length ? 'partial_failure' : 'failed') : 'completed', migrated, failed, skipped };
  }
}

module.exports = { PREFIX_BY_TYPE, PermanentIdMigration };

},
"./lib/nmr": function (module, exports, require) {
const fs = require('fs/promises');
const path = require('path');

const NMR_INBOX_FOLDER = '';
const NMR_ARCHIVE_FOLDER = '';
const NUCLEUS_ARCHIVE_MAP = { '1H': '氢谱', '13C': '碳谱' };
const { AUDIT_FOLDER, AUDIT_FILE } = require('./lib/database');
const { upsertNmrLedger } = require('./lib/entities/nmr-ledger');
const { generateRecordId } = require('./lib/data');

const { spawn } = require('child_process');

function isWindowsAbsolute(value) {
  const raw = String(value || '');
  return /^[A-Za-z]:[\\/]/.test(raw) || raw.startsWith('\\\\');
}

function resolveNmrPath(value) {
  const raw = String(value || '');
  return isWindowsAbsolute(raw) ? path.win32.normalize(raw) : path.resolve(raw);
}

function volumeRoot(value) {
  const raw = String(value || '');
  if (/^[A-Za-z]:[\\/]/.test(raw)) return raw.slice(0, 2).toUpperCase();
  if (raw.startsWith('\\\\')) {
    const parts = raw.replace(/^\\\\/, '').split(/[\\/]+/).filter(Boolean);
    return parts.length >= 2 ? `\\\\${parts[0]}\\${parts[1]}`.toLowerCase() : raw.toLowerCase();
  }
  return '';
}

function classifyNucleus(content) {
  const match = String(content || '').match(/^##\$NUC1=\s*<([^>]+)>/m);
  const nucleus = match ? match[1].trim() : '';
  if (nucleus === '1H') return '1H';
  if (nucleus === '13C') return '13C';
  return nucleus || 'unknown';
}

function insideRoot(candidate, root) {
  const pathApi = isWindowsAbsolute(candidate) || isWindowsAbsolute(root) ? path.win32 : path;
  const relative = pathApi.relative(pathApi.resolve(root), pathApi.resolve(candidate));
  return relative === '' || (!relative.startsWith(`..${pathApi.sep}`) && relative !== '..' && !pathApi.isAbsolute(relative));
}

function archiveCategory(nucleus) {
  return NUCLEUS_ARCHIVE_MAP[nucleus] || '';
}

function archiveFolderName(value, fallback = '') {
  const name = String(value || fallback || '').trim();
  if (!name) throw new Error('归档文件夹名称不能为空');
  if (name === '.' || name === '..' || /[<>:"/\\|?*\u0000-\u001F\u007F]/.test(name) || /[. ]$/.test(name) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(name)) throw new Error('归档文件夹名称包含 Windows 不允许的字符');
  return name.slice(0, 120);
}

function archiveBatchStatus(archivedCount, failedCount) {
  const archived = Number(archivedCount) || 0;
  const failed = Number(failedCount) || 0;
  if (failed === 0) return 'completed';
  return archived > 0 ? 'partial_failure' : 'failed';
}

async function pathExists(candidate) {
  try {
    await fs.lstat(candidate);
    return true;
  } catch (error) {
    if (error && error.code === 'ENOENT') return false;
    throw error;
  }
}

async function siblingFiles(scanFolder) {
  const parent = path.win32.dirname(scanFolder);
  const entries = await fs.readdir(parent, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort();
}

async function summarizeFolder(root) {
  const summary = { fileCount: 0, directoryCount: 0, totalBytes: 0 };
  async function visit(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.win32.join(current, entry.name);
      if (entry.isDirectory()) {
        summary.directoryCount += 1;
        await visit(fullPath);
      } else if (entry.isFile()) {
        summary.fileCount += 1;
        const stat = await fs.stat(fullPath);
        summary.totalBytes += stat.size;
      }
    }
  }
  await visit(root);
  return summary;
}

async function scanDirectory(root, current, results) {
  const entries = await fs.readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.win32.join(current, entry.name);
    if (!insideRoot(fullPath, root)) continue;
    if (entry.isDirectory()) {
      await scanDirectory(root, fullPath, results);
      continue;
    }
    if (!entry.isFile() || entry.name.toLowerCase() !== 'acqus') continue;

    const scanFolder = path.win32.dirname(fullPath);
    const [content, stat, summary] = await Promise.all([
      fs.readFile(fullPath, 'utf8'),
      fs.stat(scanFolder),
      summarizeFolder(scanFolder)
    ]);
    const relativeScanPath = path.win32.relative(root, scanFolder);
    const parentPath = path.win32.dirname(relativeScanPath);
    let hasFid = false;
    let hasProcessedData = false;
    try { await fs.access(path.win32.join(scanFolder, 'fid')); hasFid = true; } catch (error) { /* listed without fid */ }
    try { await fs.access(path.win32.join(scanFolder, 'pdata')); hasProcessedData = true; } catch (error) { /* raw-only scan */ }
    results.push({
      scanFolder,
      relativeScanPath,
      parentPath: parentPath === '.' ? '' : parentPath,
      nucleus: classifyNucleus(content),
      hasFid,
      hasProcessedData,
      ...summary,
      modified: stat.mtime.toISOString()
    });
  }
}

class NmrInboxStore {
  constructor(plugin, options = {}) {
    this.plugin = plugin;
    this.app = plugin?.app;
    this.registerNmrArchive = options.registerNmrArchive || upsertNmrLedger;
  }

  get inboxFolder() {
    return String(this.plugin?.settings?.nmrInboxFolder || '').trim();
  }

  get archiveFolder() {
    return String(this.plugin?.settings?.nmrArchiveFolder || '').trim();
  }

  getConfigurationError() {
    if (!this.inboxFolder) return '尚未配置 NMR 待处理目录，请前往 设置 → 科研工作台设置。';
    if (!this.archiveFolder) return '尚未配置 NMR 归档目录，请前往 设置 → 科研工作台设置。';
    const inbox = resolveNmrPath(this.inboxFolder);
    const archive = resolveNmrPath(this.archiveFolder);
    if (inbox.toLowerCase() === archive.toLowerCase()) return 'NMR 待处理目录和归档目录不能相同。';
    if (insideRoot(archive, inbox)) return 'NMR 归档目录不能位于待处理目录内部。';
    return '';
  }

  async openFolder(folder, app) {
    const target = resolveNmrPath(folder);
    const root = resolveNmrPath(this.inboxFolder);
    const archiveRoot = resolveNmrPath(this.archiveFolder);
    if (!insideRoot(target, root) && !insideRoot(target, archiveRoot)) throw new Error('拒绝打开工作区外的路径');
    await fs.access(target);
    if (process.platform !== 'win32') throw new Error('当前仅支持 Windows 文件夹跳转');

    // Start Explorer directly first. Obsidian's openWithDefaultApp may return
    // without opening folders, so it must remain a fallback rather than the
    // success path.
    try {
      await new Promise((resolve, reject) => {
        const child = spawn('explorer.exe', [target], { detached: true, stdio: 'ignore', windowsHide: false });
        child.once('error', reject);
        child.once('spawn', () => { child.unref(); resolve(); });
      });
      return;
    } catch (error) {
      if (app && typeof app.openWithDefaultApp === 'function') {
        const result = app.openWithDefaultApp(target);
        const fallbackError = result && typeof result.then === 'function' ? await result : result;
        if (!fallbackError) return;
      }
      throw error;
    }
  }

  async listPendingScans() {
    const configurationError = this.getConfigurationError();
    if (configurationError) throw new Error(configurationError);
    return this.listInboxScans();
  }

  async listInboxScans() {
    if (!this.inboxFolder) throw new Error('尚未配置 NMR 待处理目录，请前往 设置 → 科研工作台设置。');
    const root = resolveNmrPath(this.inboxFolder);
    const rootStat = await fs.stat(root);
    if (!rootStat.isDirectory()) throw new Error('待解核磁目录不可用');
    const results = [];
    await scanDirectory(root, root, results);
    return results.sort((a, b) => String(b.modified).localeCompare(String(a.modified)) || a.relativeScanPath.localeCompare(b.relativeScanPath));
  }

  async preflightDelete(relativePaths) {
    const requested = [...new Set((Array.isArray(relativePaths) ? relativePaths : []).filter((value) => typeof value === 'string' && value))];
    if (!requested.length) return { plans: [], errors: ['请至少勾选一套待解核磁。'] };

    const inboxRoot = resolveNmrPath(this.inboxFolder);
    let scans;
    try {
      scans = await this.listInboxScans();
    } catch (error) {
      return { plans: [], errors: [error instanceof Error ? error.message : '无法读取待解核磁目录'] };
    }
    const byPath = new Map(scans.map((scan) => [scan.relativeScanPath, scan]));
    const plans = [];
    const errors = [];
    for (const relativePath of requested) {
      const scan = byPath.get(relativePath);
      if (!scan) {
        errors.push(`${relativePath}：不在待解核磁目录中，可能已被移动或删除。`);
        continue;
      }
      const sourcePath = path.win32.resolve(inboxRoot, scan.relativeScanPath);
      if (!insideRoot(sourcePath, inboxRoot) || sourcePath.toLowerCase() === inboxRoot.toLowerCase()) {
        errors.push(`${relativePath}：来源路径不安全。`);
        continue;
      }
      try {
        const sourceStat = await fs.lstat(sourcePath);
        if (!sourceStat.isDirectory() || sourceStat.isSymbolicLink()) throw new Error('不是可安全删除的原始数据目录');
      } catch (error) {
        errors.push(`${relativePath}：${error instanceof Error ? error.message : '来源目录不可用'}`);
        continue;
      }
      const nestedScan = scans.find((other) => other.relativeScanPath !== scan.relativeScanPath && insideRoot(other.scanFolder, sourcePath));
      if (nestedScan) {
        errors.push(`${relativePath}：目录中包含另一套采集数据 ${nestedScan.relativeScanPath}，拒绝删除。`);
        continue;
      }
      plans.push({ ...scan, sourcePath });
    }
    return { plans, errors };
  }

  async deleteSelected(relativePaths) {
    const { plans, errors } = await this.preflightDelete(relativePaths);
    if (errors.length) return { status: 'failed', deleted: [], failed: errors.map((error) => ({ error })), auditErrors: [], errors };

    const inboxRoot = resolveNmrPath(this.inboxFolder);
    const deleted = [];
    const failed = [];
    const auditErrors = [];
    for (const plan of plans) {
      if (!insideRoot(plan.sourcePath, inboxRoot) || plan.sourcePath.toLowerCase() === inboxRoot.toLowerCase()) {
        failed.push({ plan, error: '删除路径校验失败' });
        continue;
      }
      const operationId = `NMRDEL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const auditBase = {
        delete_id: operationId,
        operation: 'delete',
        timestamp: new Date().toISOString(),
        source: plan.sourcePath,
        relative_path: plan.relativeScanPath,
        nucleus: plan.nucleus,
        file_count: plan.fileCount,
        directory_count: plan.directoryCount,
        total_bytes: plan.totalBytes
      };
      try {
        await this.writeAudit({ ...auditBase, status: 'delete_started' });
      } catch (auditError) {
        const message = auditError instanceof Error ? auditError.message : String(auditError);
        failed.push({ plan, error: `无法写入删除开始审计，未删除数据：${message}` });
        continue;
      }
      try {
        const sourceStat = await fs.lstat(plan.sourcePath);
        if (!sourceStat.isDirectory() || sourceStat.isSymbolicLink()) throw new Error('来源目录已变更，不会删除');
        await fs.rm(plan.sourcePath, { recursive: true, force: false, maxRetries: 2, retryDelay: 250 });
        deleted.push(plan);
        try {
          await this.writeAudit({ ...auditBase, timestamp: new Date().toISOString(), status: 'deleted' });
        } catch (auditError) {
          const message = auditError instanceof Error ? auditError.message : String(auditError);
          auditErrors.push({ plan, error: message });
          console.error('[Research Workbench] NMR delete audit failed', auditError);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failed.push({ plan, error: message });
        try {
          await this.writeAudit({ ...auditBase, timestamp: new Date().toISOString(), status: 'delete_failed', error: message });
        } catch (auditError) { console.error('[Research Workbench] NMR delete failure audit failed', auditError); }
      }
    }
    return { status: archiveBatchStatus(deleted.length, failed.length + auditErrors.length), deleted, failed, auditErrors, errors: [] };
  }

  async preflightArchive(relativePaths, batchRenameMap = {}) {
    const requested = [...new Set((Array.isArray(relativePaths) ? relativePaths : []).filter((value) => typeof value === 'string' && value))];
    if (!requested.length) return { plans: [], errors: ['请至少勾选一套待解核磁。'] };
    const scans = await this.listPendingScans();
    const byPath = new Map(scans.map((scan) => [scan.relativeScanPath, scan]));
    const configurationError = this.getConfigurationError();
    if (configurationError) return { plans: [], errors: [configurationError] };
    const inboxRoot = resolveNmrPath(this.inboxFolder);
    const archiveRoot = resolveNmrPath(this.archiveFolder);
    const plans = [];
    const errors = [];
    const plannedDestinations = new Map();
    for (const relativePath of requested) {
      const scan = byPath.get(relativePath);
      if (!scan) {
        errors.push(`${relativePath}：不在待解核磁目录中，可能已被移动。`);
        continue;
      }
      const sourcePath = path.win32.resolve(inboxRoot, scan.relativeScanPath);
      const category = archiveCategory(scan.nucleus);
      if (!insideRoot(sourcePath, inboxRoot)) {
        errors.push(`${relativePath}：来源路径不安全。`);
        continue;
      }
      if (!category) {
        errors.push(`${relativePath}：无法从 acqus 识别核种，不能自动归档。`);
        continue;
      }
      if (!scan.hasFid) {
        errors.push(`${relativePath}：缺少 fid，不能作为完整原始数据归档。`);
        continue;
      }
      const scanFolderName = path.win32.basename(scan.relativeScanPath);
      const originalBatchPath = scan.parentPath;
      const originalBatchName = originalBatchPath ? path.win32.basename(originalBatchPath) : '';
      let archiveBatchName;
      try { archiveBatchName = originalBatchPath ? archiveFolderName(batchRenameMap[originalBatchPath], originalBatchName) : ''; }
      catch (error) { errors.push(`${relativePath}：${error instanceof Error ? error.message : String(error)}`); continue; }
      const batchParentPath = originalBatchPath && path.win32.dirname(originalBatchPath) !== '.' ? path.win32.dirname(originalBatchPath) : '';
      const destinationRelativePath = originalBatchPath
        ? path.win32.join(batchParentPath, archiveBatchName, scanFolderName)
        : scanFolderName;
      const destinationPath = path.win32.resolve(archiveRoot, category, destinationRelativePath);
      if (!insideRoot(destinationPath, archiveRoot)) {
        errors.push(`${relativePath}：目标路径不安全。`);
        continue;
      }
      if (volumeRoot(sourcePath) && volumeRoot(destinationPath) && volumeRoot(sourcePath) !== volumeRoot(destinationPath)) {
        errors.push(`${relativePath}：来源和归档目录位于不同磁盘分区，当前版本拒绝跨盘移动。`);
        continue;
      }
      if (await pathExists(destinationPath)) {
        errors.push(`${relativePath}：目标已存在，不会覆盖。`);
        continue;
      }
      const duplicateKey = destinationPath.toLowerCase();
      if (plannedDestinations.has(duplicateKey)) {
        errors.push(`${relativePath}：改名后的目标与 ${plannedDestinations.get(duplicateKey)} 重复，不会覆盖。`);
        continue;
      }
      plannedDestinations.set(duplicateKey, relativePath);
      plans.push({
        ...scan,
        sourcePath,
        category,
        scanFolderName,
        originalBatchPath,
        originalBatchName,
        archiveBatchName,
        destinationPath,
        destinationRelativePath: path.win32.relative(archiveRoot, destinationPath),
        siblingFiles: await siblingFiles(sourcePath)
      });
    }
    return { plans, errors };
  }

  async writeAudit(entry) {
    if (!this.app?.vault) return;
    const segments = AUDIT_FOLDER.split('/');
    let current = '';
    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      if (this.app.vault.getAbstractFileByPath(current)) continue;
      try { await this.app.vault.createFolder(current); } catch (error) {
        if (!this.app.vault.getAbstractFileByPath(current)) throw error;
      }
    }
    const line = JSON.stringify(entry) + '\n';
    const file = this.app.vault.getAbstractFileByPath(AUDIT_FILE);
    if (!file) await this.app.vault.create(AUDIT_FILE, line);
    else await this.app.vault.append(file, line);
  }

  async archiveSelected(relativePaths, relations = {}, batchRenameMap = {}) {
    const { plans, errors } = await this.preflightArchive(relativePaths, batchRenameMap);
    if (errors.length) return { status: 'failed', archived: [], failed: errors.map((error) => ({ error })), skipped: [], auditErrors: [], registrationErrors: [], errors };
    const archiveRoot = resolveNmrPath(this.archiveFolder);
    const archived = [];
    const failed = [];
    const skipped = [];
    const auditErrors = [];
    const registrationErrors = [];
    for (const plan of plans) {
      if (!insideRoot(plan.sourcePath, resolveNmrPath(this.inboxFolder)) || !insideRoot(plan.destinationPath, archiveRoot)) {
        failed.push({ plan, error: '归档路径校验失败' });
        break;
      }
      const operationId = `NMRARC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const auditBase = {
        archive_id: operationId,
        timestamp: new Date().toISOString(),
        source: plan.sourcePath,
        destination: plan.destinationPath,
        relative_path: plan.relativeScanPath,
        scan_folder_name: plan.scanFolderName,
        original_batch_path: plan.originalBatchPath,
        original_batch_folder_name: plan.originalBatchName,
        archive_batch_folder_name: plan.archiveBatchName,
        renamed_batch: Boolean(plan.originalBatchName && plan.originalBatchName !== plan.archiveBatchName),
        nucleus: plan.nucleus,
        file_count: plan.fileCount,
        directory_count: plan.directoryCount,
        total_bytes: plan.totalBytes,
        project_id: String(relations.projectId || ''),
        experiment_id: String(relations.experimentId || ''),
        compound_id: String(relations.compoundId || ''),
        data_asset_id: ''
      };
      try {
        await this.writeAudit({ ...auditBase, status: 'started' });
      } catch (auditError) {
        const message = auditError instanceof Error ? auditError.message : String(auditError);
        failed.push({ plan, error: `无法写入归档开始审计，未移动数据：${message}` });
        break;
      }
      try {
        if (await pathExists(plan.destinationPath)) throw new Error('目标已存在，不会覆盖。');
        await fs.mkdir(path.win32.dirname(plan.destinationPath), { recursive: true });
        await fs.rename(plan.sourcePath, plan.destinationPath);
        archived.push(plan);
        let dataAssetId = '';
        let ledgerEntryId = '';
        try {
          const result = await this.registerNmrArchive(this.app, {
            entryId: operationId,
            nucleus: plan.nucleus,
            dataPath: plan.destinationPath,
            archiveRoot,
            projectId: relations.projectId || '',
            project: relations.project || '',
            experimentId: relations.experimentId || '',
            experiment: relations.experiment || '',
            compoundId: relations.compoundId || '',
            compound: relations.compound || '',
            archivedAt: new Date().toISOString()
          });
          dataAssetId = result.ledgerId;
          ledgerEntryId = result.entryId;
        } catch (registrationError) {
          const message = registrationError instanceof Error ? registrationError.message : String(registrationError);
          registrationErrors.push({ plan, error: message });
          console.error('[Research Workbench] NMR ledger registration failed', registrationError);
        }
        try {
          await this.writeAudit({ ...auditBase, data_asset_id: dataAssetId, nmr_ledger_entry_id: ledgerEntryId, timestamp: new Date().toISOString(), status: 'success', ...(dataAssetId ? {} : { registration_error: registrationErrors[registrationErrors.length - 1]?.error || 'NMR 台账登记失败' }) });
        } catch (auditError) {
          const message = auditError instanceof Error ? auditError.message : String(auditError);
          auditErrors.push({ plan, error: message });
          console.error('[Research Workbench] NMR success audit failed', auditError);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failed.push({ plan, error: message });
        try {
          await this.writeAudit({ ...auditBase, timestamp: new Date().toISOString(), status: 'failed', error: message });
        } catch (auditError) { console.error('[Research Workbench] NMR audit failed', auditError); }
        break;
      }
    }
    const firstFailedIndex = archived.length + failed.length;
    for (let index = firstFailedIndex; index < plans.length; index += 1) skipped.push({ plan: plans[index], reason: '前一项归档失败，未执行' });
    const status = archiveBatchStatus(archived.length, failed.length + auditErrors.length + registrationErrors.length);
    return { status, archived, failed, skipped, auditErrors, registrationErrors, errors: [] };
  }
}

module.exports = {
  NMR_INBOX_FOLDER,
  NMR_ARCHIVE_FOLDER,
  NUCLEUS_ARCHIVE_MAP,
  classifyNucleus,
  insideRoot,
  archiveCategory,
  archiveFolderName,
  archiveBatchStatus,
  resolveNmrPath,
  volumeRoot,
  NmrInboxStore
};

},
"./lib/nmr-archive-modal": function (module, exports, require) {
const { Modal, Notice, Setting } = require('obsidian');
const path = require('path');

class NmrArchiveModal extends Modal {
  constructor(app, nmrInboxStore, relativePaths, options = {}) {
    super(app);
    this.nmrInboxStore = nmrInboxStore;
    this.relativePaths = relativePaths;
    this.options = options;
    this.plans = [];
    this.errors = [];
    this.saving = false;
    this.resultShown = false;
    this.ctaButton = null;
    this.body = null;
    this.relations = { projectId: '', project: '', experimentId: '', experiment: '', compoundId: '', compound: '' };
    this.batchRenameNames = {};
  }

  onOpen() {
    this.modalEl.addClass('phdcc-task-modal');
    this.contentEl.createEl('h2', { text: '确认归档核磁原始数据' });
    this.body = this.contentEl.createDiv();
    this.body.createDiv({ cls: 'phdcc-empty', text: '正在检查来源、核种和目标路径…' });
    this.relationContainer = this.contentEl.createDiv({ cls: 'phdcc-archive-relations' });
    this.renderRelations();
    const footer = this.contentEl.createDiv({ cls: 'modal-button-container' });
    const cancel = footer.createEl('button', { text: '取消', type: 'button' });
    cancel.addEventListener('click', () => this.close());
    this.ctaButton = footer.createEl('button', { text: '预检中…', cls: 'mod-cta', type: 'button' });
    this.ctaButton.disabled = true;
    this.ctaButton.addEventListener('click', () => { void this.submit(); });
    void this.prepare();
  }

  renderRelations() {
    const store = this.options.entityStore;
    if (!store) return;
    const container = this.relationContainer;
    container.empty();
    container.createEl('h3', { text: '科研关系（可选）' });
    const projects = store.listProjects();
    const experiments = store.listExperiments();
    const compounds = store.listCompounds();
    const add = (label, key, items, idKey = `${key}Id`) => {
      new Setting(container).setName(label).addDropdown((dropdown) => {
        dropdown.addOption('', '不关联');
        items.forEach((item) => { if (item.id) dropdown.addOption(item.id, `${item.title} · ${item.id}`); });
        dropdown.setValue(this.relations[idKey] || '');
        dropdown.onChange((value) => {
          this.relations[idKey] = value;
          const item = items.find((candidate) => candidate.id === value);
          this.relations[key] = item?.title || '';
          if (key === 'project') this.renderRelations();
          if (key === 'experiment' && item) {
            if (!this.relations.projectId && item.projectId) { this.relations.projectId = item.projectId; this.relations.project = projects.find((candidate) => candidate.id === item.projectId)?.title || ''; }
            if (!this.relations.compoundId && item.compoundId) { this.relations.compoundId = item.compoundId; this.relations.compound = compounds.find((candidate) => candidate.id === item.compoundId)?.title || ''; }
            if (this.relations.projectId && item.projectId && this.relations.projectId !== item.projectId) new Notice('关联实验属于其他课题，请检查选择。');
            this.renderRelations();
          }
          if (key === 'compound' && item) {
            if (!this.relations.projectId && item.projectId) { this.relations.projectId = item.projectId; this.relations.project = projects.find((candidate) => candidate.id === item.projectId)?.title || ''; this.renderRelations(); }
            else if (this.relations.projectId && item.projectId && this.relations.projectId !== item.projectId) new Notice('所选化合物属于其他课题，请检查选择。');
          }
        });
      });
    };
    add('课题', 'project', projects);
    const filteredExperiments = this.relations.projectId ? experiments.filter((item) => item.projectId === this.relations.projectId) : experiments;
    const filteredCompounds = this.relations.projectId ? compounds.filter((item) => item.projectId === this.relations.projectId) : compounds;
    add('实验', 'experiment', filteredExperiments);
    add('化合物', 'compound', filteredCompounds);
  }

  async prepare() {
    try {
      const result = await this.nmrInboxStore.preflightArchive(this.relativePaths);
      this.plans = result.plans;
      this.errors = result.errors;
      this.renderPlan();
      this.ctaButton.disabled = this.errors.length > 0 || this.plans.length === 0;
      this.ctaButton.setText(this.ctaButton.disabled ? '存在阻塞项' : `确认归档 ${this.plans.length} 套`);
    } catch (error) {
      this.errors = [error instanceof Error ? error.message : '预检失败'];
      this.renderPlan();
      this.ctaButton.disabled = true;
      this.ctaButton.setText('预检失败');
    }
  }

  renderPlan() {
    this.body.empty();
    if (this.errors.length) {
      this.body.createDiv({ cls: 'phdcc-empty', text: '以下项目不能归档；请取消后调整选择。' });
      this.errors.forEach((error) => this.body.createDiv({ cls: 'phdcc-file-next', text: error }));
    }
    this.plans.forEach((plan) => {
      const row = this.body.createDiv({ cls: 'phdcc-file-row' });
      row.createDiv({ cls: 'phdcc-file-title', text: `${plan.nucleus === '1H' ? '¹H 氢谱' : '¹³C 碳谱'} · ${plan.relativeScanPath}` });
      const transfer = row.createDiv({ cls: 'phdcc-archive-transfer' });
      transfer.createDiv({ cls: 'phdcc-archive-label', text: '来源' });
      transfer.createDiv({ cls: 'phdcc-archive-path', text: plan.sourcePath });
      transfer.createDiv({ cls: 'phdcc-archive-arrow', text: '↓ 移动至' });
      transfer.createDiv({ cls: 'phdcc-archive-label', text: '目标' });
      transfer.createDiv({ cls: 'phdcc-archive-path', text: plan.destinationPath });
      if (plan.originalBatchPath) {
        const rename = new Setting(row).setName('归档批次文件夹名称').setDesc(`保留扫描号 ${plan.scanFolderName}；这里改的是 ${plan.originalBatchName}`);
        rename.addText((text) => {
          const defaultName = plan.originalBatchName;
          this.batchRenameNames[plan.originalBatchPath] = this.batchRenameNames[plan.originalBatchPath] || defaultName;
          text.setValue(this.batchRenameNames[plan.originalBatchPath]);
          text.inputEl.addEventListener('input', () => {
            this.batchRenameNames[plan.originalBatchPath] = text.getValue().trim();
            const batchRoot = path.win32.dirname(path.win32.dirname(plan.destinationPath));
            const previewName = this.batchRenameNames[plan.originalBatchPath] || defaultName;
            transfer.querySelector('.phdcc-archive-path:last-child')?.setText(path.win32.join(batchRoot, previewName, plan.scanFolderName));
          });
        });
      }
      const checks = row.createDiv({ cls: 'phdcc-archive-checks' });
      ['✓ fid 完整', '✓ 核种已识别', '✓ 路径安全', '✓ 同一磁盘', '✓ 目标不存在'].forEach((text) => checks.createSpan({ cls: 'phdcc-badge is-success', text }));
      if (plan.siblingFiles.length) row.createDiv({ cls: 'phdcc-file-next', text: `提示：同级有 ${plan.siblingFiles.length} 个附带文件，不会随原始采集目录移动。` });
    });
    if (this.plans.length && !this.errors.length) this.body.createDiv({ cls: 'phdcc-file-next', text: '确认后将整套移动原始采集目录（含 fid、acqus、pdata）；不会覆盖目标、不会删除空的来源目录。' });
  }

  async submit() {
    if (this.resultShown) return void this.close();
    if (this.saving || this.errors.length || !this.plans.length) return;
    this.saving = true;
    this.ctaButton.disabled = true;
    this.ctaButton.setText('归档中…');
    try {
      const result = await this.nmrInboxStore.archiveSelected(this.plans.map((plan) => plan.relativeScanPath), this.relations, this.batchRenameNames);
      if (typeof this.options.onArchived === 'function') await this.options.onArchived(result);
      if (result.status === 'completed') {
        this.close();
        new Notice(`已归档 ${result.archived.length} 套核磁原始数据`);
      } else {
        this.saving = false;
        this.resultShown = true;
        this.ctaButton.disabled = false;
        this.ctaButton.setText('关闭结果');
        this.ctaButton.onclick = () => this.close();
        this.body.empty();
        this.body.createDiv({ cls: 'phdcc-empty', text: `归档结果：${result.status === 'partial_failure' ? '部分成功' : '全部失败'}` });
        this.body.createDiv({ cls: 'phdcc-file-next', text: `成功 ${result.archived.length} · 失败 ${result.failed.length} · 未执行 ${result.skipped.length} · 审计异常 ${result.auditErrors?.length || 0}` });
        result.failed.forEach((item) => this.body.createDiv({ cls: 'phdcc-file-next', text: `${item.plan?.relativeScanPath || ''}：${item.error}` }));
        result.auditErrors?.forEach((item) => this.body.createDiv({ cls: 'phdcc-file-next', text: `${item.plan?.relativeScanPath || ''}：数据已移动但成功审计写入失败：${item.error}` }));
        result.registrationErrors?.forEach((item) => this.body.createDiv({ cls: 'phdcc-file-next', text: `${item.plan?.relativeScanPath || ''}：数据已移动但 DataAsset 登记失败：${item.error}` }));
        new Notice(`核磁归档完成：成功 ${result.archived.length}，失败 ${result.failed.length}，未执行 ${result.skipped.length}，审计异常 ${result.auditErrors?.length || 0}`);
      }
    } catch (error) {
      this.saving = false;
      this.ctaButton.disabled = false;
      this.ctaButton.setText('归档失败');
      new Notice(error instanceof Error ? error.message : '核磁归档失败');
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}

module.exports = { NmrArchiveModal };

},
"./lib/nmr-delete-modal": function (module, exports, require) {
const { Modal, Notice } = require('obsidian');

class NmrDeleteModal extends Modal {
  constructor(app, nmrInboxStore, relativePaths, options = {}) {
    super(app);
    this.nmrInboxStore = nmrInboxStore;
    this.relativePaths = relativePaths;
    this.options = options;
    this.plans = [];
    this.errors = [];
    this.saving = false;
    this.resultShown = false;
    this.confirmed = false;
  }

  onOpen() {
    this.modalEl.addClass('phdcc-task-modal');
    this.contentEl.createEl('h2', { text: '确认永久删除核磁原始数据' });
    this.contentEl.createDiv({
      cls: 'phdcc-empty',
      text: '此操作会永久删除待解目录中的整套原始采集文件夹（例如 fid、acqus、pdata），无法恢复；不会影响任何归档目录。'
    });
    this.body = this.contentEl.createDiv();
    this.body.createDiv({ cls: 'phdcc-empty', text: '正在校验待删除的精确路径…' });

    const confirmation = this.contentEl.createDiv({ cls: 'phdcc-archive-checks' });
    this.confirmationInput = confirmation.createEl('input', { attr: { type: 'checkbox', 'aria-label': '确认永久删除' } });
    confirmation.createSpan({ text: '我确认永久删除下列原始数据，且已不再需要它们。' });
    this.confirmationInput.addEventListener('change', () => {
      this.confirmed = this.confirmationInput.checked;
      this.updateCta();
    });

    const footer = this.contentEl.createDiv({ cls: 'modal-button-container' });
    const cancel = footer.createEl('button', { text: '取消', type: 'button' });
    cancel.addEventListener('click', () => this.close());
    this.ctaButton = footer.createEl('button', { text: '预检中…', cls: 'mod-warning', type: 'button' });
    this.ctaButton.disabled = true;
    this.ctaButton.addEventListener('click', () => { void this.submit(); });
    void this.prepare();
  }

  async prepare() {
    try {
      const result = await this.nmrInboxStore.preflightDelete(this.relativePaths);
      this.plans = result.plans;
      this.errors = result.errors;
    } catch (error) {
      this.plans = [];
      this.errors = [error instanceof Error ? error.message : '预检失败'];
    }
    this.renderPlan();
    this.updateCta();
  }

  updateCta() {
    if (!this.ctaButton || this.resultShown) return;
    const canDelete = !this.errors.length && this.plans.length > 0 && this.confirmed && !this.saving;
    this.ctaButton.disabled = !canDelete;
    if (this.saving) this.ctaButton.setText('删除中…');
    else if (this.errors.length) this.ctaButton.setText('存在阻塞项');
    else if (!this.plans.length) this.ctaButton.setText('没有可删除项');
    else if (!this.confirmed) this.ctaButton.setText('请先确认');
    else this.ctaButton.setText(`永久删除 ${this.plans.length} 套`);
  }

  renderPlan() {
    this.body.empty();
    if (this.errors.length) {
      this.body.createDiv({ cls: 'phdcc-empty', text: '以下项目不能删除；请取消后调整选择。' });
      this.errors.forEach((error) => this.body.createDiv({ cls: 'phdcc-file-next', text: error }));
    }
    this.plans.forEach((plan) => {
      const row = this.body.createDiv({ cls: 'phdcc-file-row' });
      row.createDiv({ cls: 'phdcc-file-title', text: `${plan.nucleus || '待核对'} · ${plan.relativeScanPath}` });
      row.createDiv({ cls: 'phdcc-archive-label', text: '将永久删除' });
      row.createDiv({ cls: 'phdcc-archive-path', text: plan.sourcePath });
      row.createDiv({ cls: 'phdcc-file-next', text: `${plan.fileCount} 个文件 · ${plan.directoryCount} 个子目录 · ${formatBytes(plan.totalBytes)}` });
    });
  }

  async submit() {
    if (this.resultShown) return void this.close();
    if (this.saving || this.errors.length || !this.plans.length || !this.confirmed) return;
    this.saving = true;
    this.confirmationInput.disabled = true;
    this.updateCta();
    try {
      const result = await this.nmrInboxStore.deleteSelected(this.plans.map((plan) => plan.relativeScanPath));
      if (typeof this.options.onDeleted === 'function') await this.options.onDeleted(result);
      if (result.status === 'completed') {
        this.close();
        new Notice(`已永久删除 ${result.deleted.length} 套待解核磁原始数据`);
        return;
      }
      this.saving = false;
      this.resultShown = true;
      this.body.empty();
      this.body.createDiv({ cls: 'phdcc-empty', text: `删除结果：${result.status === 'partial_failure' ? '部分成功' : '全部失败'}` });
      this.body.createDiv({ cls: 'phdcc-file-next', text: `已删除 ${result.deleted.length} · 失败 ${result.failed.length} · 审计异常 ${result.auditErrors?.length || 0}` });
      result.failed.forEach((item) => this.body.createDiv({ cls: 'phdcc-file-next', text: `${item.plan?.relativeScanPath || ''}：${item.error}` }));
      result.auditErrors?.forEach((item) => this.body.createDiv({ cls: 'phdcc-file-next', text: `${item.plan?.relativeScanPath || ''}：数据已删除，但最终审计写入失败：${item.error}` }));
      this.ctaButton.disabled = false;
      this.ctaButton.setText('关闭结果');
      this.ctaButton.onclick = () => this.close();
      new Notice(`核磁删除完成：已删除 ${result.deleted.length}，失败 ${result.failed.length}`);
    } catch (error) {
      this.saving = false;
      this.confirmationInput.disabled = false;
      this.updateCta();
      new Notice(error instanceof Error ? error.message : '核磁删除失败');
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}

function formatBytes(value) {
  const bytes = Number(value) || 0;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

module.exports = { NmrDeleteModal };

},
"./lib/work-queue": function (module, exports, require) {
const fs = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');

const WORK_QUEUE_SOURCES = [
  { id: 'spectra', setting: 'spectrumInboxFolder', label: '待测光谱', description: '待测光谱、质谱、荧光及其分析文件', excludedNames: [] },
  { id: 'data', setting: 'processingInboxFolder', label: '待处理数据', description: '成像、MTT、HPLC、流式等待处理数据', excludedNames: ['待解核磁'] },
  { id: 'documents', setting: 'documentInboxFolder', label: '待完成文档', description: '待整理的课题文档、图表与写作材料', excludedNames: [] }
];

function isWindowsAbsolute(value) { return /^[A-Za-z]:[\\/]/.test(String(value || '')) || String(value || '').startsWith('\\\\'); }
function resolvePath(value) { const raw = String(value || ''); return isWindowsAbsolute(raw) ? path.win32.normalize(raw) : path.resolve(raw); }
function insideRoot(candidate, root) {
  const api = isWindowsAbsolute(candidate) || isWindowsAbsolute(root) ? path.win32 : path;
  const relative = api.relative(api.resolve(root), api.resolve(candidate));
  return relative === '' || (!relative.startsWith(`..${api.sep}`) && relative !== '..' && !api.isAbsolute(relative));
}

async function summarizeDirectory(root, current, summary) {
  const entries = await fs.readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.win32.join(current, entry.name);
    if (!insideRoot(fullPath, root)) continue;
    if (entry.isDirectory()) {
      summary.directoryCount += 1;
      const stat = await fs.stat(fullPath);
      if (stat.mtimeMs > summary.modifiedMs) summary.modifiedMs = stat.mtimeMs;
      await summarizeDirectory(root, fullPath, summary);
    } else if (entry.isFile()) {
      const stat = await fs.stat(fullPath);
      summary.fileCount += 1;
      summary.totalBytes += stat.size;
      if (stat.mtimeMs > summary.modifiedMs) summary.modifiedMs = stat.mtimeMs;
    }
  }
}

async function summarizeEntry(root, entry) {
  const fullPath = path.win32.resolve(root, entry.name);
  if (!insideRoot(fullPath, root) || fullPath.toLowerCase() === root.toLowerCase()) throw new Error('队列路径不安全');
  const stat = await fs.lstat(fullPath);
  if (stat.isSymbolicLink()) throw new Error('不索引符号链接');
  const summary = { fileCount: 0, directoryCount: 0, totalBytes: 0, modifiedMs: stat.mtimeMs };
  if (stat.isDirectory()) {
    summary.directoryCount = 1;
    await summarizeDirectory(root, fullPath, summary);
  } else if (stat.isFile()) {
    summary.fileCount = 1;
    summary.totalBytes = stat.size;
  } else {
    throw new Error('不支持的文件类型');
  }
  return { name: entry.name, path: fullPath, kind: stat.isDirectory() ? 'directory' : 'file', extension: stat.isDirectory() ? '' : path.win32.extname(entry.name).toLowerCase(), ...summary, modified: new Date(summary.modifiedMs).toISOString() };
}

class WorkQueueStore {
  constructor(plugin) { this.plugin = plugin; }

  source(id) { return WORK_QUEUE_SOURCES.find((item) => item.id === id) || null; }
  folderFor(id) { const source = this.source(id); return source ? String(this.plugin?.settings?.[source.setting] || '').trim() : ''; }

  async listSource(id) {
    const source = this.source(id);
    if (!source) throw new Error('未知待处理队列');
    const folder = this.folderFor(id);
    if (!folder) throw new Error(`尚未配置${source.label}目录，请前往 设置 → 科研工作台设置。`);
    const root = resolvePath(folder);
    const rootStat = await fs.stat(root);
    if (!rootStat.isDirectory()) throw new Error(`${source.label}目录不可用`);
    const entries = await fs.readdir(root, { withFileTypes: true });
    const excluded = new Set(source.excludedNames.map((name) => name.toLocaleLowerCase()));
    const results = [];
    const errors = [];
    for (const entry of entries) {
      if (excluded.has(entry.name.toLocaleLowerCase())) continue;
      try { results.push(await summarizeEntry(root, entry)); }
      catch (error) { errors.push({ name: entry.name, error: error instanceof Error ? error.message : String(error) }); }
    }
    results.sort((a, b) => String(b.modified).localeCompare(String(a.modified)) || a.name.localeCompare(b.name));
    return { source: { ...source, root }, entries: results, errors };
  }

  async openEntry(id, entryPath) {
    const source = this.source(id);
    const root = resolvePath(this.folderFor(id));
    const target = resolvePath(entryPath);
    if (!source || !root || !insideRoot(target, root) || target.toLowerCase() === root.toLowerCase()) throw new Error('拒绝打开队列目录外的路径');
    await fs.access(target);
    if (process.platform !== 'win32') throw new Error('当前仅支持 Windows 文件跳转');
    await new Promise((resolve, reject) => {
      const child = spawn('explorer.exe', [target], { detached: true, stdio: 'ignore', windowsHide: false });
      child.once('error', reject);
      child.once('spawn', () => { child.unref(); resolve(); });
    });
  }
}

module.exports = { WORK_QUEUE_SOURCES, resolvePath, insideRoot, summarizeEntry, WorkQueueStore };

},
"./lib/modal": function (module, exports, require) {
const { Modal, Notice, Setting } = require('obsidian');
const { localDate } = require('./lib/data');

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

},
"./lib/experiment-modal": function (module, exports, require) {
const { Modal, Notice, Setting } = require('obsidian');
const { localDate } = require('./lib/data');

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

},
"./lib/settings": function (module, exports, require) {
const { PluginSettingTab, Setting, Notice } = require('obsidian');

const DEFAULT_SETTINGS = {
  openOnStartup: false,
  nmrInboxFolder: '',
  nmrArchiveFolder: '',
  spectrumInboxFolder: 'E:\\待测光谱',
  processingInboxFolder: 'E:\\待处理数据',
  documentInboxFolder: 'E:\\待完成文档',
  uiState: { activeSection: 'today' }
};

function mergeSettings(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    ...DEFAULT_SETTINGS,
    ...source,
    openOnStartup: Boolean(source.openOnStartup ?? DEFAULT_SETTINGS.openOnStartup),
    nmrInboxFolder: String(source.nmrInboxFolder ?? DEFAULT_SETTINGS.nmrInboxFolder).trim(),
    nmrArchiveFolder: String(source.nmrArchiveFolder ?? DEFAULT_SETTINGS.nmrArchiveFolder).trim(),
    spectrumInboxFolder: String(source.spectrumInboxFolder ?? DEFAULT_SETTINGS.spectrumInboxFolder).trim(),
    processingInboxFolder: String(source.processingInboxFolder ?? DEFAULT_SETTINGS.processingInboxFolder).trim(),
    documentInboxFolder: String(source.documentInboxFolder ?? DEFAULT_SETTINGS.documentInboxFolder).trim(),
    uiState: {
      activeSection: typeof source.uiState?.activeSection === 'string' ? source.uiState.activeSection : DEFAULT_SETTINGS.uiState.activeSection
    }
  };
}

class ResearchWorkbenchSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: '科研工作台设置' });
    containerEl.createEl('p', { text: 'Markdown 笔记仍是事实来源；这些设置只控制插件索引和核磁文件操作。' });

    new Setting(containerEl)
      .setName('启动时打开科研工作台')
      .setDesc('关闭后，插件加载不会自动抢占当前工作区。')
      .addToggle((toggle) => toggle
        .setValue(Boolean(this.plugin.settings.openOnStartup))
        .onChange(async (value) => {
          this.plugin.settings.openOnStartup = value;
          await this.plugin.saveSettings();
        }));

    const rootInfo = containerEl.createDiv({ cls: 'setting-item-description' });
    rootInfo.setText('工作台根目录：00-博士工作台（当前版本固定，避免出现设置已修改但目录未迁移的误导）。');

    containerEl.createEl('h3', { text: '核磁文件夹' });
    containerEl.createEl('p', { text: '路径只在实际使用时检查。插件不会自动移动、删除或覆盖原始数据。' });
    this.addPathSetting(containerEl, 'NMR 待处理目录', '扫描 Bruker 原始采集目录的文件夹。', 'nmrInboxFolder');
    this.addPathSetting(containerEl, 'NMR 归档目录', '按氢谱/碳谱分类的目标根目录。', 'nmrArchiveFolder');

    containerEl.createEl('h3', { text: '待处理队列目录' });
    containerEl.createEl('p', { text: '看板按顶级文件夹或根目录文件汇总，默认只读扫描；不会自动移动、删除或改写外部文件。待处理数据中的“待解核磁”由专门的核磁页面管理，不会重复列出。' });
    this.addPathSetting(containerEl, '待测光谱目录', '例如荧光、紫外、质谱等待分析数据。', 'spectrumInboxFolder');
    this.addPathSetting(containerEl, '待处理数据目录', '例如成像、MTT、HPLC、流式等数据。', 'processingInboxFolder');
    this.addPathSetting(containerEl, '待完成文档目录', '待整理的课题文档、图表和写作材料。', 'documentInboxFolder');
  }

  addPathSetting(containerEl, name, description, key) {
    new Setting(containerEl)
      .setName(name)
      .setDesc(description)
      .addText((text) => text
        .setPlaceholder('例如：D:\\科研数据\\待解核磁')
        .setValue(this.plugin.settings[key] || '')
        .onChange(async (value) => {
          this.plugin.settings[key] = value.trim();
          await this.plugin.saveSettings();
          if (!this.plugin.settings[key]) new Notice(`${name}为空，对应看板将提示配置路径。`);
        }));
  }
}

module.exports = { DEFAULT_SETTINGS, mergeSettings, ResearchWorkbenchSettingTab };

},
"./lib/quick-create-modal": function (module, exports, require) {
const { Modal, setIcon } = require('obsidian');

class QuickCreateModal extends Modal {
  constructor(app, options = {}) {
    super(app);
    this.options = options;
  }

  onOpen() {
    this.modalEl.addClass('phdcc-task-modal', 'phdcc-quick-create-modal');
    this.contentEl.createEl('h2', { text: '快速新增' });
    this.contentEl.createDiv({ cls: 'phdcc-modal-subtitle', text: '选择要创建的科研对象' });
    const options = [
      ['check-square', '任务', '安排一个需要完成的工作', 'task'],
      ['test-tube', '实验记录', '记录实验目标、过程和下一步', 'experiment'],
      ['folder-kanban', '课题', '建立一个可关联实验和数据的课题', 'project'],
      ['atom', '化合物', '登记化合物与表征信息', 'compound'],
      ['database', '数据资产', '登记 NMR、HPLC、MS 等数据', 'data-asset'],
      ['notebook-pen', '今日复盘', '创建一条复盘任务', 'review']
    ];
    const list = this.contentEl.createDiv({ cls: 'phdcc-quick-create-list' });
    options.forEach(([icon, title, description, type], index) => {
      const button = list.createEl('button', { cls: 'phdcc-quick-create-option', attr: { type: 'button' } });
      const iconEl = button.createSpan({ cls: 'phdcc-quick-create-icon' });
      try { setIcon(iconEl, icon); } catch (error) { iconEl.setText('•'); }
      const copy = button.createSpan({ cls: 'phdcc-quick-create-copy' });
      copy.createSpan({ cls: 'phdcc-quick-create-title', text: title });
      copy.createSpan({ cls: 'phdcc-quick-create-description', text: description });
      button.addEventListener('click', () => {
        this.close();
        if (type === 'task' && typeof this.options.onTask === 'function') this.options.onTask();
        if (type === 'experiment' && typeof this.options.onExperiment === 'function') this.options.onExperiment();
        if (type === 'project' && typeof this.options.onProject === 'function') this.options.onProject();
        if (type === 'compound' && typeof this.options.onCompound === 'function') this.options.onCompound();
        if (type === 'data-asset' && typeof this.options.onDataAsset === 'function') this.options.onDataAsset();
        if (type === 'review' && typeof this.options.onReview === 'function') this.options.onReview();
      });
      if (index === 0) window.setTimeout(() => button.focus(), 50);
    });
    const footer = this.contentEl.createDiv({ cls: 'modal-button-container' });
    const cancel = footer.createEl('button', { text: '取消', attr: { type: 'button' } });
    cancel.addEventListener('click', () => this.close());
  }

  onClose() {
    this.contentEl.empty();
  }
}

module.exports = { QuickCreateModal };

},
"./lib/quick-create-command": function (module, exports, require) {
async function openQuickCreateCommand(app, viewType, ViewClass, activateView) {
  let leaf = app.workspace.getLeavesOfType(viewType)[0];
  if (!leaf?.view || !(leaf.view instanceof ViewClass)) {
    await activateView();
    leaf = app.workspace.getLeavesOfType(viewType)[0];
  }
  if (leaf?.view instanceof ViewClass) leaf.view.openQuickCreate();
}

module.exports = { openQuickCreateCommand };

},
"./lib/modals/project-modal": function (module, exports, require) {
const { Modal, Notice, Setting } = require('obsidian');
const { createProject } = require('./lib/entities/project');
const { generateRecordId } = require('./lib/data');

class ProjectModal extends Modal {
  constructor(app, options = {}) { super(app); this.options = options; this.state = { title: '', description: '', nextAction: '', saving: false }; }
  onOpen() {
    this.modalEl.addClass('phdcc-task-modal');
    this.contentEl.createEl('h2', { text: '新增课题' });
    new Setting(this.contentEl).setName('课题名称').addText((text) => { text.inputEl.required = true; text.inputEl.placeholder = '例如：β-Galactosidase Probe'; text.onChange((value) => { this.state.title = value; }); setTimeout(() => text.inputEl.focus(), 30); });
    new Setting(this.contentEl).setName('简介（可选）').addTextArea((area) => { area.inputEl.rows = 3; area.onChange((value) => { this.state.description = value; }); });
    new Setting(this.contentEl).setName('下一步（可选）').addText((text) => text.onChange((value) => { this.state.nextAction = value; }));
    const footer = this.contentEl.createDiv({ cls: 'modal-button-container' });
    footer.createEl('button', { text: '取消', attr: { type: 'button' } }).addEventListener('click', () => this.close());
    const save = footer.createEl('button', { text: '创建课题', cls: 'mod-cta', attr: { type: 'button' } });
    save.addEventListener('click', async () => { if (this.state.saving || !this.state.title.trim()) return void new Notice('请输入课题名称'); this.state.saving = true; save.disabled = true; try { const file = await createProject(this.app, this.state, generateRecordId); if (this.options.onCreated) await this.options.onCreated(file); this.close(); new Notice('课题已创建'); } catch (error) { this.state.saving = false; save.disabled = false; new Notice(error instanceof Error ? error.message : '课题创建失败'); } });
  }
  onClose() { this.contentEl.empty(); }
}
module.exports = { ProjectModal };

},
"./lib/modals/compound-modal": function (module, exports, require) {
const { Modal, Notice, Setting } = require('obsidian');
const { createCompound } = require('./lib/entities/compound');
const { generateRecordId } = require('./lib/data');

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

},
"./lib/modals/data-asset-modal": function (module, exports, require) {
const { Modal, Notice, Setting } = require('obsidian');
const { createDataAsset, ASSET_TYPES } = require('./lib/entities/data-asset');
const { generateRecordId } = require('./lib/data');

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

},
"./lib/modals/migration-modal": function (module, exports, require) {
const { Modal, Notice } = require('obsidian');
const { PermanentIdMigration } = require('./lib/migrations/permanent-id');
const { generateRecordId } = require('./lib/data');

class MigrationModal extends Modal {
  constructor(app, plugin, options = {}) {
    super(app);
    this.plugin = plugin;
    this.options = options;
    this.migration = new PermanentIdMigration(plugin, generateRecordId);
    this.items = [];
    this.busy = false;
  }

  onOpen() {
    this.modalEl.addClass('phdcc-task-modal');
    this.contentEl.createEl('h2', { text: '永久 ID 迁移' });
    this.contentEl.createEl('p', { text: '为仍使用旧路径识别的任务、实验和课题补写永久 record_id。只会新增缺失字段，不会移动或改写其他内容。' });
    this.previewEl = this.contentEl.createDiv({ cls: 'phdcc-migration-preview' });
    this.buttonEl = this.contentEl.createEl('button', { text: '扫描旧记录', cls: 'mod-cta', attr: { type: 'button' } });
    this.buttonEl.addEventListener('click', () => { if (this.items.length) void this.apply(); else this.scan(); });
    this.scan();
  }

  scan() {
    this.items = this.migration.scan();
    this.renderPreview();
  }

  renderPreview() {
    this.previewEl.empty();
    if (!this.items.length) {
      this.previewEl.createEl('p', { text: '没有发现需要迁移的旧记录。' });
      this.buttonEl.disabled = true;
      this.buttonEl.textContent = '无需迁移';
      return;
    }
    this.previewEl.createEl('p', { text: `发现 ${this.items.length} 条记录，确认后写入永久 ID：` });
    const list = this.previewEl.createEl('ul');
    this.items.slice(0, 20).forEach((item) => list.createEl('li', { text: `${item.title} · ${item.type} → ${item.proposedId}` }));
    if (this.items.length > 20) this.previewEl.createEl('p', { text: `另有 ${this.items.length - 20} 条未展开。` });
    this.buttonEl.disabled = false;
    this.buttonEl.textContent = `确认迁移 ${this.items.length} 条记录`;
  }

  async apply() {
    if (this.busy || !this.items.length) return;
    this.busy = true;
    this.buttonEl.disabled = true;
    this.buttonEl.textContent = '迁移中…';
    const result = await this.migration.apply(this.items);
    const failedText = result.failed.length ? `，失败 ${result.failed.length} 条` : '';
    const summary = `永久 ID 迁移完成：成功 ${result.migrated.length} 条，跳过 ${result.skipped.length} 条${failedText}`;
    new Notice(summary);
    this.previewEl.createEl('p', { text: `${summary}。状态：${result.status}` });
    result.skipped.forEach((item) => this.previewEl.createEl('p', { text: `跳过：${item.path} · ${item.reason}` }));
    result.failed.forEach((item) => this.previewEl.createEl('p', { text: `失败：${item.path} · ${item.error}` }));
    if (this.options.onCompleted) await this.options.onCompleted(result);
    if (!result.failed.length) this.close();
    else { this.busy = false; this.items = []; this.buttonEl.disabled = false; this.buttonEl.textContent = '关闭'; this.buttonEl.onclick = () => this.close(); }
  }

  onClose() { this.contentEl.empty(); }
}

module.exports = { MigrationModal };

},
"./lib/modals/nmr-ledger-migration-modal": function (module, exports, require) {
const { Modal, Notice } = require('obsidian');
const { legacyNmrAssets, consolidateLegacyNmrAssets } = require('./lib/entities/nmr-ledger');

class NmrLedgerMigrationModal extends Modal {
  constructor(app, options = {}) {
    super(app);
    this.options = options;
    this.items = [];
    this.confirmed = false;
    this.busy = false;
  }

  onOpen() {
    this.modalEl.addClass('phdcc-task-modal');
    this.contentEl.createEl('h2', { text: '合并旧核磁数据资产' });
    this.contentEl.createDiv({ cls: 'phdcc-empty', text: '旧的“每套一份”NMR 数据资产会被写入 NMR 归档台账；确认成功后，原单条笔记将移入 Obsidian 回收站，可恢复。原始核磁数据文件不会移动或删除。' });
    this.body = this.contentEl.createDiv();
    this.items = legacyNmrAssets(this.app);
    this.renderPreview();
    const confirmation = this.contentEl.createDiv({ cls: 'phdcc-archive-checks' });
    this.checkbox = confirmation.createEl('input', { attr: { type: 'checkbox', 'aria-label': '确认合并旧核磁数据资产' } });
    confirmation.createSpan({ text: '我确认将这些旧单条笔记合并，并移入 Obsidian 回收站。' });
    this.checkbox.addEventListener('change', () => { this.confirmed = this.checkbox.checked; this.updateButton(); });
    const footer = this.contentEl.createDiv({ cls: 'modal-button-container' });
    const cancel = footer.createEl('button', { text: '取消', type: 'button' });
    cancel.addEventListener('click', () => this.close());
    this.button = footer.createEl('button', { text: '无需合并', cls: 'mod-cta', type: 'button' });
    this.button.addEventListener('click', () => { void this.submit(); });
    this.updateButton();
  }

  renderPreview() {
    this.body.empty();
    if (!this.items.length) return void this.body.createDiv({ cls: 'phdcc-empty', text: '没有发现旧的单条 NMR 数据资产。' });
    this.body.createDiv({ cls: 'phdcc-file-meta', text: `将合并 ${this.items.length} 条：` });
    this.items.forEach(({ file, frontmatter }) => this.body.createDiv({ cls: 'phdcc-file-next', text: `${frontmatter.title || file.basename} · ${file.path}` }));
  }

  updateButton() {
    if (!this.button) return;
    this.button.disabled = this.busy || !this.items.length || !this.confirmed;
    this.button.setText(this.busy ? '合并中…' : !this.items.length ? '无需合并' : !this.confirmed ? '请先确认' : `合并 ${this.items.length} 条记录`);
  }

  async submit() {
    if (this.busy || !this.confirmed || !this.items.length) return;
    this.busy = true;
    this.checkbox.disabled = true;
    this.updateButton();
    try {
      const result = await consolidateLegacyNmrAssets(this.app);
      if (typeof this.options.onCompleted === 'function') await this.options.onCompleted(result);
      const summary = `核磁台账合并完成：${result.migrated.length} 条已合并，${result.skipped.length} 条跳过，${result.failed.length} 条失败。`;
      new Notice(summary);
      this.body.empty();
      this.body.createDiv({ cls: 'phdcc-empty', text: summary });
      result.skipped.forEach((item) => this.body.createDiv({ cls: 'phdcc-file-next', text: `跳过：${item.file.path} · ${item.reason}` }));
      result.failed.forEach((item) => this.body.createDiv({ cls: 'phdcc-file-next', text: `失败：${item.file.path} · ${item.error}` }));
      this.button.disabled = false;
      this.button.setText('关闭');
      this.button.onclick = () => this.close();
    } catch (error) {
      this.busy = false;
      this.checkbox.disabled = false;
      this.updateButton();
      new Notice(error instanceof Error ? error.message : '合并失败');
    }
  }

  onClose() { this.contentEl.empty(); }
}

module.exports = { NmrLedgerMigrationModal };

},
"./lib/view": function (module, exports, require) {
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
} = require('./lib/data');
const { TaskModal } = require('./lib/modal');
const { ExperimentModal } = require('./lib/experiment-modal');
const { NmrInboxStore } = require('./lib/nmr');
const { NmrArchiveModal } = require('./lib/nmr-archive-modal');
const { NmrDeleteModal } = require('./lib/nmr-delete-modal');
const { WorkQueueStore, WORK_QUEUE_SOURCES } = require('./lib/work-queue');
const { QuickCreateModal } = require('./lib/quick-create-modal');
const { ResearchDatabase } = require('./lib/database');
const { EntityStore } = require('./lib/entities/store');
const { ProjectModal } = require('./lib/modals/project-modal');
const { CompoundModal } = require('./lib/modals/compound-modal');
const { DataAssetModal } = require('./lib/modals/data-asset-modal');
const { MigrationModal } = require('./lib/modals/migration-modal');
const { NmrLedgerMigrationModal } = require('./lib/modals/nmr-ledger-migration-modal');
const pageRenderers = require('./lib/ui/page-renderers');

const VIEW_TYPE = 'phd-command-center-view';
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
const PRIORITY_LABEL = { high: '高', medium: '中', low: '低' };
const EXPERIMENT_STATUS_LABEL = { planning: '计划中', doing: '进行中', complete: '已完成', blocked: '受阻' };
const VALID_SECTIONS = new Set(['overview', 'today', 'calendar', 'reviews', 'projects', 'experiments', 'compound', 'nmr-inbox', 'work-queue', 'data', 'literature', 'writing', 'daily-review', 'research-db', 'integrity']);

const NAV_GROUPS = [
  ['总览', [
    ['overview', '工作台总览', 'layout-dashboard'],
    ['today', '今日待办', 'check-square'],
    ['calendar', '日历', 'calendar-days']
  ]],
  ['科研', [
    ['projects', '课题项目', 'flask-conical'],
    ['experiments', '实验记录', 'test-tube'],
    ['compound', '化合物', 'atom'],
    ['data', '数据资产', 'database'],
    ['nmr-inbox', '待解核磁', 'scan-line'],
    ['work-queue', '待处理队列', 'inbox']
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
    this.workQueueStore = new WorkQueueStore(plugin);
    this.entityStore = new EntityStore(plugin);
    this.tasks = [];
    this.nmrScans = [];
    this.nmrError = '';
    this.selectedNmrPaths = new Set();
    this.workQueue = [];
    this.workQueueErrors = {};
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
    if (this.activeSection === 'work-queue') await this.refreshWorkQueue(false);
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
        if (id === 'work-queue' && this.workQueue.length) item.createSpan({ cls: 'phdcc-nav-count', text: String(this.workQueue.reduce((count, queue) => count + queue.entries.length, 0)) });
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
      projects: () => pageRenderers.renderProjectPage(this, '课题项目'),
      reviews: () => this.renderReadOnlyPage('周月总结', PROGRESS_FOLDER, false),
      experiments: () => pageRenderers.renderExperimentPage(this),
      compound: () => pageRenderers.renderCompoundPage(this),
      'research-db': () => pageRenderers.renderResearchDatabasePage(this),
      'nmr-inbox': () => pageRenderers.renderNmrInboxPage(this),
      'work-queue': () => this._renderWorkQueuePage(),
      data: () => pageRenderers.renderDataPage(this),
      literature: () => this.renderReadOnlyPage('文献资料', LITERATURE_FOLDERS, false),
      writing: () => this.renderReadOnlyPage('写作管线', WRITING_FOLDER, true),
      'daily-review': () => this.renderFocusPage('今日复盘', '复盘', '写下今天最重要的收获与下一步改进'),
      integrity: () => pageRenderers.renderIntegrityPage(this)
    }[this.activeSection] || (() => this.renderToday());
    renderer();
  }

  openQuickCreate() {
    new QuickCreateModal(this.app, {
      onTask: () => this.openTaskModal(),
      onExperiment: () => this.openExperimentModal(),
      onProject: () => this.openProjectModal(),
      onCompound: () => this.openCompoundModal(),
      onDataAsset: () => this.openDataAssetModal(),
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
        entityStore: this.entityStore,
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

  openProjectModal() { new ProjectModal(this.app, { onCreated: async (file) => { await this.openFile(file); await this.refresh(); } }).open(); }
  openCompoundModal() { new CompoundModal(this.app, this.entityStore, { onCreated: async (file) => { await this.openFile(file); await this.refresh(); } }).open(); }
  openDataAssetModal() { new DataAssetModal(this.app, this.entityStore, { onCreated: async (file) => { await this.openFile(file); await this.refresh(); } }).open(); }
  openMigrationModal() { new MigrationModal(this.app, this.plugin, { onCompleted: async () => { await this.refresh(); } }).open(); }
  openNmrLedgerMigrationModal() { new NmrLedgerMigrationModal(this.app, { onCompleted: async () => { await this.refresh(); } }).open(); }

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

  filteredWorkQueueEntries(entries) {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) => `${entry.name} ${entry.path} ${entry.extension}`.toLowerCase().includes(query));
  }

  async refreshWorkQueue(render = true) {
    const results = await Promise.all(WORK_QUEUE_SOURCES.map(async (source) => {
      this.workQueueErrors[source.id] = '';
      try { return await this.workQueueStore.listSource(source.id); }
      catch (error) {
        this.workQueueErrors[source.id] = error instanceof Error ? error.message : '无法读取目录';
        return { source: { ...source, root: this.workQueueStore.folderFor(source.id) }, entries: [], errors: [] };
      }
    }));
    this.workQueue = results;
    if (render && this.activeSection === 'work-queue' && this.pageEl) this.renderPage();
  }

  async openWorkQueueEntry(source, entry) {
    try {
      new Notice(`正在打开：${entry.name}`);
      await this.workQueueStore.openEntry(source.id, entry.path);
    } catch (error) {
      new Notice(error instanceof Error ? error.message : '无法打开待处理项目');
    }
  }

  openWorkQueueTask(source, entry) {
    new TaskModal(this.app, this.taskStore, {
      title: `处理${source.label}：${entry.name}`,
      category: '实验',
      priority: 'medium',
      due: localDate(),
      details: `来源目录：${entry.path}\n\n完成后请在原始数据位置或实验记录中补充处理结果。`,
      onCreated: async (file) => { await this.openFile(file); await this.refresh(); }
    }).open();
  }

  openNmrArchiveModal() {
    const selected = [...this.selectedNmrPaths];
    if (!selected.length) return void new Notice('请先勾选要归档的核磁原始数据');
    new NmrArchiveModal(this.app, this.nmrInboxStore, selected, {
      entityStore: this.entityStore,
      onArchived: async (result) => {
        this.selectedNmrPaths.clear();
        if (result?.status === 'completed' || result?.status === 'partial_failure') await this.refreshNmrInbox();
      }
    }).open();
  }

  openNmrDeleteModal() {
    const selected = [...this.selectedNmrPaths];
    if (!selected.length) return void new Notice('请先勾选要删除的核磁原始数据');
    new NmrDeleteModal(this.app, this.nmrInboxStore, selected, {
      onDeleted: async (result) => {
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

  _renderProjectPage(title) {
    this.renderPageHeader(title, '课题、实验与数据的关系入口', { label: '+ 新增课题', onClick: () => this.openProjectModal() });
    const formal = this.entityStore.listProjects();
    const items = formal.length ? formal : this.filteredFiles(this.readOnlyItems(PROJECT_FOLDER, 30, true));
    const grid = this.pageEl.createDiv({ cls: 'phdcc-project-grid' });
    if (!items.length) return void grid.createDiv({ cls: 'phdcc-empty', text: this.searchQuery ? '没有匹配项目' : '暂无项目；可从原工作台的课题模板开始创建。' });
    items.forEach((item) => {
      const file = item.file || item;
      const info = item.file ? { ...this.fileInfo(item.file), title: item.title, status: item.status, nextAction: item.nextAction, projectId: item.id } : this.fileInfo(file);
      const card = grid.createDiv({ cls: 'phdcc-project-card' });
      const heading = card.createDiv({ cls: 'phdcc-project-title', text: info.title });
      heading.addEventListener('click', () => { void this.openFile(file); });
      const metadata = [info.status && `状态：${info.status}`, info.priority && `优先级：${info.priority}`, info.stage && `阶段：${info.stage}`].filter(Boolean);
      card.createDiv({ cls: 'phdcc-project-meta', text: metadata.join(' · ') || info.path });
      if (info.nextAction) card.createDiv({ cls: 'phdcc-project-next', text: `下一步：${info.nextAction}` });
    });
  }

  _renderCompoundPage() {
    this.renderPageHeader('化合物', '化合物是实验与数据资产的稳定关联节点', { label: '+ 新增化合物', onClick: () => this.openCompoundModal() });
    const card = this.pageEl.createDiv({ cls: 'phdcc-card phdcc-file-card' });
    const items = this.entityStore.listCompounds().filter((item) => !this.searchQuery || `${item.title} ${item.compoundCode} ${item.id}`.toLowerCase().includes(this.searchQuery.toLowerCase()));
    if (!items.length) return void card.createDiv({ cls: 'phdcc-empty', text: this.searchQuery ? '没有匹配化合物' : '暂无化合物' });
    items.forEach((item) => {
      const row = card.createDiv({ cls: 'phdcc-file-row' });
      const title = row.createDiv({ cls: 'phdcc-file-title', text: `${item.compoundCode || item.title} · ${item.title}` });
      title.addEventListener('click', () => { void this.openFile(item.file); });
      row.createDiv({ cls: 'phdcc-file-meta', text: `${item.project || '未关联课题'} · ${item.id}` });
      const counts = this.researchDatabase.records.filter((record) => record.compoundId === item.id);
      row.createDiv({ cls: 'phdcc-file-next', text: `关联记录：${counts.length}` });
    });
  }

  _renderIntegrityPage() {
    this.renderPageHeader('关系检查', '永久 ID 引用完整性与科研实体关系', { label: '返回科研数据库', onClick: () => { this.activeSection = 'research-db'; this.saveUiState(); this.renderPage(); } });
    const stats = this.pageEl.createDiv({ cls: 'phdcc-stats' });
    [['有效关系', this.researchDatabase.validRelationCount || 0], ['问题', this.researchDatabase.relationshipIssues?.length || 0], ['重复 ID', this.researchDatabase.duplicateIds?.length || 0]].forEach(([label, value]) => { const card = stats.createDiv({ cls: 'phdcc-stat-card' }); card.createDiv({ cls: 'phdcc-stat-label', text: label }); card.createDiv({ cls: 'phdcc-stat-value', text: String(value) }); });
    const card = this.pageEl.createDiv({ cls: 'phdcc-card phdcc-file-card' });
    if (!this.researchDatabase.relationshipIssues?.length) return void card.createDiv({ cls: 'phdcc-empty', text: '关系检查通过，未发现问题。' });
    const labels = { missing_target: '缺失目标', wrong_target_type: '类型错误', legacy_reference: '旧 ID 引用', self_reference: '自引用', duplicate_record_id: '重复 ID', relation_conflict: '关系冲突' };
    this.researchDatabase.relationshipIssues.forEach((issue) => { const row = card.createDiv({ cls: 'phdcc-file-row' }); row.createDiv({ cls: 'phdcc-file-title', text: `${labels[issue.type] || issue.type} · ${issue.message}` }); row.createDiv({ cls: 'phdcc-file-meta', text: `${issue.sourcePath} · ${issue.field || ''} · ${issue.targetId || ''} · ${issue.type}` }); const open = row.createEl('button', { cls: 'phdcc-row-action', text: '打开来源', attr: { type: 'button' } }); open.addEventListener('click', () => { const file = this.app.vault.getAbstractFileByPath(issue.sourcePath); if (file) void this.openFile(file); }); });
  }

  _renderExperimentPage() {
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

  _renderResearchDatabasePage() {
    this.renderPageHeader('科研数据库', '任务、实验和科研文件的统一索引', {
      label: '+ 新增任务',
      onClick: () => this.openTaskModal()
    });
    const refresh = this.pageEl.createEl('button', {
      cls: 'phdcc-page-add phdcc-calendar-add',
      text: '↻ 同步数据库',
      attr: { type: 'button', title: '重新扫描并更新科研数据库' }
    });
    const maintenance = this.pageEl.createEl('button', { cls: 'phdcc-page-add phdcc-calendar-add', text: '数据维护：永久 ID', attr: { type: 'button' } });
    maintenance.addEventListener('click', () => this.openMigrationModal());
    const integrity = this.pageEl.createEl('button', { cls: 'phdcc-page-add phdcc-calendar-add', text: `关系检查 (${this.researchDatabase.relationshipIssues?.length || 0})`, attr: { type: 'button' } });
    integrity.addEventListener('click', () => { this.activeSection = 'integrity'; this.saveUiState(); this.renderPage(); });
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

  _renderDataPage() {
    this.renderPageHeader('数据资产', '原始数据位置与派生索引', { label: '+ 新增数据资产', onClick: () => this.openDataAssetModal() });
    const consolidate = this.pageEl.createEl('button', { cls: 'phdcc-page-add phdcc-calendar-add', text: '合并旧核磁记录', attr: { type: 'button', title: '将旧单条 NMR 数据资产合并为一个台账' } });
    consolidate.addEventListener('click', () => this.openNmrLedgerMigrationModal());
    const card = this.pageEl.createDiv({ cls: 'phdcc-card phdcc-file-card' });
    const assets = this.entityStore.listDataAssets().filter((item) => !this.searchQuery || `${item.title} ${item.assetType} ${item.dataPath} ${item.id}`.toLowerCase().includes(this.searchQuery.toLowerCase()));
    if (assets.length) assets.forEach((item) => { const row = card.createDiv({ cls: 'phdcc-file-row' }); const title = row.createDiv({ cls: 'phdcc-file-title', text: item.title }); title.addEventListener('click', () => { void this.openFile(item.file); }); row.createDiv({ cls: 'phdcc-file-meta', text: `${item.assetType || 'other'} · ${item.project || '未关联课题'} · ${item.id}` }); row.createDiv({ cls: 'phdcc-file-next', text: item.dataPath || '未记录数据路径' }); });
    const legacy = this.filteredFiles(this.readOnlyItems(DATA_FOLDER, 30, true));
    if (legacy.length) { card.createEl('h3', { text: '旧数据记录（只读）' }); this.renderReadOnlyList(card, legacy, ''); }
    if (!assets.length && !legacy.length) card.createDiv({ cls: 'phdcc-empty', text: this.searchQuery ? '没有匹配数据资产' : '暂无数据资产' });
  }

  _renderWorkQueuePage() {
    this.renderPageHeader('待处理队列', '按顶级文件夹或根目录文件汇总；只读扫描，不会自动移动外部数据');
    const refresh = this.pageEl.createEl('button', {
      cls: 'phdcc-page-add phdcc-calendar-add phdcc-nmr-refresh',
      text: '↻ 刷新待处理队列',
      attr: { type: 'button', title: '重新读取待测光谱、待处理数据和待完成文档目录' }
    });
    refresh.addEventListener('click', async () => {
      if (refresh.disabled) return;
      refresh.disabled = true;
      refresh.textContent = '刷新中…';
      await this.refreshWorkQueue(false);
      this.renderPage();
      const failed = Object.values(this.workQueueErrors).filter(Boolean).length;
      new Notice(failed ? `待处理队列已刷新；${failed} 个目录读取失败` : `待处理队列已刷新：${this.workQueue.reduce((count, queue) => count + queue.entries.length, 0)} 项`);
    });
    const stats = this.pageEl.createDiv({ cls: 'phdcc-stats' });
    this.workQueue.forEach((queue) => {
      const card = stats.createDiv({ cls: 'phdcc-stat-card' });
      card.createDiv({ cls: 'phdcc-stat-label', text: queue.source.label });
      card.createDiv({ cls: 'phdcc-stat-value', text: String(queue.entries.length) });
    });
    this.workQueue.forEach((queue) => this.renderWorkQueueSource(queue));
  }

  renderWorkQueueSource(queue) {
    const { source } = queue;
    const card = this.pageEl.createDiv({ cls: 'phdcc-card phdcc-file-card' });
    card.createEl('h3', { text: source.label });
    card.createDiv({ cls: 'phdcc-file-meta', text: `${source.description}　·　${source.root || '未配置'}` });
    const error = this.workQueueErrors[source.id];
    if (error) {
      card.createDiv({ cls: 'phdcc-empty', text: `读取失败：${error}` });
      const settingsHint = card.createEl('button', { cls: 'phdcc-empty-add', text: '打开插件设置', attr: { type: 'button' } });
      settingsHint.addEventListener('click', () => this.app.setting.open());
      return;
    }
    if (queue.errors.length) card.createDiv({ cls: 'phdcc-file-next', text: `${queue.errors.length} 个项目未能读取，已跳过。` });
    const entries = this.filteredWorkQueueEntries(queue.entries);
    if (!entries.length) return void card.createDiv({ cls: 'phdcc-empty', text: this.searchQuery ? '没有匹配的待处理项目' : '该目录暂无待处理项目' });
    entries.forEach((entry) => {
      const row = card.createDiv({ cls: 'phdcc-nmr-row' });
      const main = row.createDiv({ cls: 'phdcc-nmr-main' });
      main.createDiv({ cls: 'phdcc-file-title', text: `${entry.kind === 'directory' ? '📁' : '📄'} ${entry.name}` });
      main.createDiv({ cls: 'phdcc-file-meta', text: `${entry.kind === 'directory' ? `${entry.fileCount} 个文件 · ${entry.directoryCount} 个目录` : entry.extension || '文件'} · ${formatBytes(entry.totalBytes)} · ${new Date(entry.modified).toLocaleString('zh-CN')}` });
      main.createDiv({ cls: 'phdcc-file-next', text: entry.path });
      const open = row.createEl('button', { cls: 'phdcc-nmr-open', text: entry.kind === 'directory' ? '打开原始目录' : '打开文件', attr: { type: 'button' } });
      open.addEventListener('click', () => { void this.openWorkQueueEntry(source, entry); });
      const task = row.createEl('button', { cls: 'phdcc-nmr-open', text: '新增处理任务', attr: { type: 'button' } });
      task.addEventListener('click', () => this.openWorkQueueTask(source, entry));
    });
  }

  _renderNmrInboxPage() {
    this.renderPageHeader('待解核磁', '归档与删除均会先预检，并在确认前不改动原始数据', {
      label: `归档已选 (${this.selectedNmrPaths.size})`,
      disabled: this.selectedNmrPaths.size === 0,
      onClick: () => this.openNmrArchiveModal()
    });
    const remove = this.pageEl.createEl('button', {
      cls: 'phdcc-page-add phdcc-calendar-add phdcc-nmr-delete',
      text: `删除已选（永久） (${this.selectedNmrPaths.size})`,
      attr: { type: 'button', title: '永久删除所选待解核磁原始数据' }
    });
    remove.disabled = this.selectedNmrPaths.size === 0;
    remove.addEventListener('click', () => this.openNmrDeleteModal());
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
      compoundId: String(frontmatter.compound_id || ''),
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

},
"./main": function (module, exports, require) {
const { Plugin } = require('obsidian');
const { VIEW_TYPE, WorkbenchView } = require('./lib/view');
const { mergeSettings, ResearchWorkbenchSettingTab } = require('./lib/settings');
const { affectsManagedPath } = require('./lib/database');
const { openQuickCreateCommand } = require('./lib/quick-create-command');

module.exports = class PhDCommandCenterPlugin extends Plugin {
  async onload() {
    this.settings = mergeSettings(await this.loadData());
    this.saveSettings = async () => this.saveData(this.settings);
    this.refreshTimer = null;
    this.registerView(VIEW_TYPE, (leaf) => new WorkbenchView(leaf, this));

    this.addRibbonIcon('layout-dashboard', '打开科研工作台', () => {
      void this.activateView();
    });

    this.addCommand({
      id: 'open-phd-command-center',
      name: '打开科研工作台',
      callback: () => { void this.activateView(); }
    });

    this.addCommand({
      id: 'quick-create',
      name: '科研工作台：快速新增',
      callback: () => openQuickCreateCommand(this.app, VIEW_TYPE, WorkbenchView, () => this.activateView())
    });

    this.addSettingTab(new ResearchWorkbenchSettingTab(this.app, this));

    const scheduleRefresh = (file, oldPath) => {
      const paths = [file?.path, typeof oldPath === 'string' ? oldPath : ''].filter(Boolean);
      if (paths.length && !affectsManagedPath(paths)) return;
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = window.setTimeout(() => {
        for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
          if (leaf.view instanceof WorkbenchView) void leaf.view.refresh();
        }
      }, 250);
    };

    this.registerEvent(this.app.vault.on('create', scheduleRefresh));
    this.registerEvent(this.app.vault.on('modify', scheduleRefresh));
    this.registerEvent(this.app.vault.on('delete', scheduleRefresh));
    this.registerEvent(this.app.vault.on('rename', scheduleRefresh));
    this.register(() => window.clearTimeout(this.refreshTimer));

    this.app.workspace.onLayoutReady(() => {
      if (this.settings.openOnStartup) void this.activateView();
    });
  }

  async activateView() {
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      leaf = this.app.workspace.getLeaf('tab');
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    this.app.workspace.revealLeaf(leaf);
  }

  onunload() {
    window.clearTimeout(this.refreshTimer);
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
  }
};

}
};
const __phdccCache = Object.create(null);
function __phdccLoad(id) {
  if (__phdccCache[id]) return __phdccCache[id].exports;
  const factory = __phdccFactories[id];
  if (!factory) throw new Error('Unknown bundled module: ' + id);
  const module = { exports: {} };
  __phdccCache[id] = module;
  factory(module, module.exports, (request) => {
    if (request === 'obsidian' || request === 'fs/promises' || request === 'path' || request === 'child_process') return __phdccNativeRequire(request);
    return __phdccLoad(request);
  });
  return module.exports;
}
module.exports = __phdccLoad('./main');
