const fs = require('fs/promises');
const path = require('path');

const NMR_INBOX_FOLDER = '';
const NMR_ARCHIVE_FOLDER = '';
const NUCLEUS_ARCHIVE_MAP = { '1H': '氢谱', '13C': '碳谱' };
const { AUDIT_FOLDER, AUDIT_FILE } = require('./database');

const { spawn } = require('child_process');

function isWindowsAbsolute(value) {
  const raw = String(value || '');
  return /^[A-Za-z]:[\\/]/.test(raw) || raw.startsWith('\\\\');
}

function resolveNmrPath(value) {
  const raw = String(value || '');
  return isWindowsAbsolute(raw) ? path.win32.normalize(raw) : path.resolve(raw);
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
    for (const plan of plans) {
      if (!insideRoot(plan.sourcePath, resolveNmrPath(this.inboxFolder)) || !insideRoot(plan.destinationPath, archiveRoot)) {
        failed.push({ plan, error: '归档路径校验失败' });
        break;
      }
      try {
        if (await pathExists(plan.destinationPath)) throw new Error('目标已存在，不会覆盖。');
        await fs.mkdir(path.win32.dirname(plan.destinationPath), { recursive: true });
        await fs.rename(plan.sourcePath, plan.destinationPath);
        archived.push(plan);
        const entry = {
          archive_id: `NMRARC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          timestamp: new Date().toISOString(),
          source: plan.sourcePath,
          destination: plan.destinationPath,
          relative_path: plan.relativeScanPath,
          nucleus: plan.nucleus,
          file_count: plan.fileCount,
          directory_count: plan.directoryCount,
          total_bytes: plan.totalBytes,
          experiment_id: '',
          compound_id: '',
          status: 'success'
        };
        try {
          await this.writeAudit(entry);
        } catch (auditError) {
          console.error('[Research Workbench] NMR success audit failed', auditError);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failed.push({ plan, error: message });
        try {
          await this.writeAudit({ archive_id: `NMRARC-${Date.now().toString(36).toUpperCase()}`, timestamp: new Date().toISOString(), source: plan.sourcePath, destination: plan.destinationPath, relative_path: plan.relativeScanPath, nucleus: plan.nucleus, status: 'failed', error: message });
        } catch (auditError) { console.error('[Research Workbench] NMR audit failed', auditError); }
        break;
      }
    }
    const firstFailedIndex = archived.length + failed.length;
    for (let index = firstFailedIndex; index < plans.length; index += 1) skipped.push({ plan: plans[index], reason: '前一项归档失败，未执行' });
    const status = archiveBatchStatus(archived.length, failed.length);
    return { status, archived, failed, skipped, errors: [] };
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
  NmrInboxStore
};
