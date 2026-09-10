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
