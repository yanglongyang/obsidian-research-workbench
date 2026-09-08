const fs = require('fs/promises');
const path = require('path');

const NMR_INBOX_FOLDER = 'E:\\待处理数据\\待解核磁';
const NMR_ARCHIVE_FOLDER = 'E:\\实验文档，数据\\核磁';

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
  return relative && !relative.startsWith(`..${pathApi.sep}`) && relative !== '..' && !pathApi.isAbsolute(relative);
}

function archiveCategory(nucleus) {
  if (nucleus === '1H') return '氢谱';
  if (nucleus === '13C') return '碳谱';
  return '';
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
  async openFolder(folder, app) {
    const target = resolveNmrPath(folder);
    const root = resolveNmrPath(NMR_INBOX_FOLDER);
    const archiveRoot = resolveNmrPath(NMR_ARCHIVE_FOLDER);
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
    const root = resolveNmrPath(NMR_INBOX_FOLDER);
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
    const inboxRoot = resolveNmrPath(NMR_INBOX_FOLDER);
    const archiveRoot = resolveNmrPath(NMR_ARCHIVE_FOLDER);
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

  async archiveSelected(relativePaths) {
    const { plans, errors } = await this.preflightArchive(relativePaths);
    if (errors.length) throw new Error(`预检未通过：${errors.join('；')}`);
    const archiveRoot = resolveNmrPath(NMR_ARCHIVE_FOLDER);
    const moved = [];
    for (const plan of plans) {
      if (!insideRoot(plan.sourcePath, resolveNmrPath(NMR_INBOX_FOLDER)) || !insideRoot(plan.destinationPath, archiveRoot)) {
        throw new Error('归档路径校验失败');
      }
      if (await pathExists(plan.destinationPath)) throw new Error(`${plan.relativeScanPath} 的目标已存在，已停止归档。`);
      await fs.mkdir(path.win32.dirname(plan.destinationPath), { recursive: true });
      await fs.rename(plan.sourcePath, plan.destinationPath);
      moved.push(plan);
    }
    return moved;
  }
}

module.exports = {
  NMR_INBOX_FOLDER,
  NMR_ARCHIVE_FOLDER,
  NmrInboxStore
};
