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
    `title: ${yamlString(experiment.title)}`,
    `project: ${yamlString(experiment.project)}`,
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
      title,
      experimentDate,
      status,
      project: String(input.project || '').trim(),
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
const DATABASE_SCHEMA_VERSION = 2;
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
  if (frontmatter?.kind === 'experiment' || pathInside(path, '00-博士工作台/03-实验') || pathInside(path, '实验记录')) return 'experiment';
  if (pathInside(path, '00-博士工作台/02-课题')) return 'project';
  if (pathInside(path, '00-博士工作台/04-数据')) return 'data';
  if (pathInside(path, '00-博士工作台/05-文献') || pathInside(path, '文献') || pathInside(path, '文献阅读') || pathInside(path, 'DMAC_AIE_PET_调研')) return 'literature';
  if (pathInside(path, '00-博士工作台/06-写作')) return 'writing';
  if (pathInside(path, '00-博士工作台/07-进展')) return 'progress';
  return pathInside(path, '00-博士工作台') ? 'note' : '';
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
        dataAssetId: firstString(frontmatter.data_asset_id),
        parentId: firstString(frontmatter.parent_id),
        relatedIds: firstArray(frontmatter.related_ids),
        sample: firstString(frontmatter.sample),
        dataPath: firstString(frontmatter.data_path),
        tags: frontmatterTags(frontmatter),
        updated: firstString(frontmatter.updated) || new Date(file.stat.mtime).toISOString(),
        size: file.stat.size
      });
    }
    return records.sort((a, b) => String(b.updated).localeCompare(String(a.updated)) || a.title.localeCompare(b.title));
  }

  async sync() {
    this.error = '';
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
  simpleHash,
  recordType,
  identityFor,
  ResearchDatabase
};

},
"./lib/nmr": function (module, exports, require) {
const fs = require('fs/promises');
const path = require('path');

const NMR_INBOX_FOLDER = '';
const NMR_ARCHIVE_FOLDER = '';
const NUCLEUS_ARCHIVE_MAP = { '1H': '氢谱', '13C': '碳谱' };
const { AUDIT_FOLDER, AUDIT_FILE } = require('./lib/database');

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
  constructor(plugin) {
    this.plugin = plugin;
    this.app = plugin?.app;
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
    const root = resolveNmrPath(this.inboxFolder);
    const rootStat = await fs.stat(root);
    if (!rootStat.isDirectory()) throw new Error('待解核磁目录不可用');
    const results = [];
    await scanDirectory(root, root, results);
    return results.sort((a, b) => String(b.modified).localeCompare(String(a.modified)) || a.relativeScanPath.localeCompare(b.relativeScanPath));
  }

  async preflightArchive(relativePaths) {
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
      const destinationPath = path.win32.resolve(archiveRoot, category, scan.relativeScanPath);
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
      plans.push({
        ...scan,
        sourcePath,
        category,
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

  async archiveSelected(relativePaths) {
    const { plans, errors } = await this.preflightArchive(relativePaths);
    if (errors.length) return { status: 'failed', archived: [], failed: errors.map((error) => ({ error })), skipped: [], errors };
    const archiveRoot = resolveNmrPath(this.archiveFolder);
    const archived = [];
    const failed = [];
    const skipped = [];
    const auditErrors = [];
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
        nucleus: plan.nucleus,
        file_count: plan.fileCount,
        directory_count: plan.directoryCount,
        total_bytes: plan.totalBytes,
        experiment_id: '',
        compound_id: ''
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
        try {
          await this.writeAudit({ ...auditBase, timestamp: new Date().toISOString(), status: 'success' });
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
    const status = archiveBatchStatus(archived.length, failed.length + auditErrors.length);
    return { status, archived, failed, skipped, auditErrors, errors: [] };
  }
}

module.exports = {
  NMR_INBOX_FOLDER,
  NMR_ARCHIVE_FOLDER,
  NUCLEUS_ARCHIVE_MAP,
  classifyNucleus,
  insideRoot,
  archiveCategory,
  archiveBatchStatus,
  resolveNmrPath,
  volumeRoot,
  NmrInboxStore
};

},
"./lib/nmr-archive-modal": function (module, exports, require) {
const { Modal, Notice } = require('obsidian');

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
  }

  onOpen() {
    this.modalEl.addClass('phdcc-task-modal');
    this.contentEl.createEl('h2', { text: '确认归档核磁原始数据' });
    this.body = this.contentEl.createDiv();
    this.body.createDiv({ cls: 'phdcc-empty', text: '正在检查来源、核种和目标路径…' });
    const footer = this.contentEl.createDiv({ cls: 'modal-button-container' });
    const cancel = footer.createEl('button', { text: '取消', type: 'button' });
    cancel.addEventListener('click', () => this.close());
    this.ctaButton = footer.createEl('button', { text: '预检中…', cls: 'mod-cta', type: 'button' });
    this.ctaButton.disabled = true;
    this.ctaButton.addEventListener('click', () => { void this.submit(); });
    void this.prepare();
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
      const result = await this.nmrInboxStore.archiveSelected(this.plans.map((plan) => plan.relativeScanPath));
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
      title: '',
      category: CATEGORIES.includes(options.category) ? options.category : CATEGORIES[0],
      priority: 'high',
      due: /^\d{4}-\d{2}-\d{2}$/.test(options.due || '') ? options.due : localDate(),
      estimate: 60,
      details: '',
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

    this.addText('关联课题（可选）', '例如：[[课题名称]]', 'project');
    this.addText('课题 ID（可选）', '例如：PROJ-01K…', 'projectId');
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

},
"./lib/settings": function (module, exports, require) {
const { PluginSettingTab, Setting, Notice } = require('obsidian');

const DEFAULT_SETTINGS = {
  openOnStartup: false,
  nmrInboxFolder: '',
  nmrArchiveFolder: '',
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
          if (!this.plugin.settings[key]) new Notice(`${name}为空，NMR页面将提示配置路径。`);
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
const { QuickCreateModal } = require('./lib/quick-create-modal');
const { ResearchDatabase } = require('./lib/database');

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
