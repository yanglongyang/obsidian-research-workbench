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
  if (!p || !f) return false;
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
    'kind: experiment',
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
  formatMinutes,
  isPathInside,
  TaskStore,
  collectReadOnlyFiles
};
