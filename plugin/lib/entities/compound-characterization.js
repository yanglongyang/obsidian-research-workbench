const fs = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');

const CHARACTERIZATION_BLOCK = 'research-characterization';
const CHARACTERIZATION_TYPES = [
  { value: '1h-nmr', label: '¹H NMR' },
  { value: '13c-nmr', label: '¹³C NMR' },
  { value: '2d-nmr', label: '2D NMR' },
  { value: 'hrms', label: 'HRMS' },
  { value: 'hplc', label: 'HPLC' },
  { value: 'other', label: '其他' }
];

function typeLabel(type) {
  return CHARACTERIZATION_TYPES.find((item) => item.value === String(type || '').trim())?.label || '其他';
}

function normalizeCharacterizationLinks(value) {
  const input = Array.isArray(value) ? value : value ? [value] : [];
  return input.map((item) => {
    if (typeof item === 'string') {
      const pathValue = item.trim();
      return pathValue ? { type: 'other', label: '表征文件', path: pathValue } : null;
    }
    if (!item || typeof item !== 'object') return null;
    const type = String(item.type || 'other').trim() || 'other';
    const pathValue = String(item.path || '').trim();
    if (!pathValue) return null;
    return {
      type,
      label: String(item.label || typeLabel(type)).trim() || typeLabel(type),
      path: pathValue
    };
  }).filter(Boolean);
}

function cleanExternalPath(value) {
  const raw = String(value || '').trim();
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) return raw.slice(1, -1).trim();
  return raw;
}

function isAbsoluteExternalPath(value) {
  const target = cleanExternalPath(value);
  return path.win32.isAbsolute(target) || path.posix.isAbsolute(target);
}

async function openExternalPath(value, platform = process.platform) {
  const target = cleanExternalPath(value);
  if (!target) throw new Error('未填写表征文件路径');
  if (!isAbsoluteExternalPath(target)) throw new Error('表征路径必须是绝对路径');
  await fs.access(target);
  const command = platform === 'win32' ? 'explorer.exe' : platform === 'darwin' ? 'open' : 'xdg-open';
  await new Promise((resolve, reject) => {
    const child = spawn(command, [target], { detached: true, stdio: 'ignore', windowsHide: platform === 'win32' });
    child.once('error', reject);
    child.once('spawn', () => { child.unref(); resolve(); });
  });
}

async function ensureCharacterizationBlock(app, file) {
  if (!file) throw new Error('化合物笔记不存在');
  const content = await app.vault.read(file);
  if (new RegExp('```' + CHARACTERIZATION_BLOCK + '(?:\\s|$)').test(content)) return false;
  const block = '\n\n```' + CHARACTERIZATION_BLOCK + '\n```\n';
  const heading = /^##\s*表征\s*$/m;
  const match = heading.exec(content);
  let updated = '';
  if (match) {
    const insertAt = match.index + match[0].length;
    updated = content.slice(0, insertAt) + block + content.slice(insertAt).replace(/^\s*\n?/, '\n');
  } else {
    updated = content.replace(/\s*$/, '') + '\n\n## 表征' + block;
  }
  await app.vault.modify(file, updated);
  return true;
}

async function setCharacterizationLinks(app, file, links) {
  const normalized = normalizeCharacterizationLinks(links);
  if (!app?.fileManager?.processFrontMatter) throw new Error('当前 Obsidian 版本不支持更新 frontmatter');
  await app.fileManager.processFrontMatter(file, (frontmatter) => {
    frontmatter.characterization_links = normalized.map((item) => ({ type: item.type, label: item.label, path: item.path }));
    frontmatter.updated = new Date().toISOString();
  });
  await ensureCharacterizationBlock(app, file);
  return normalized;
}

module.exports = {
  CHARACTERIZATION_BLOCK,
  CHARACTERIZATION_TYPES,
  typeLabel,
  normalizeCharacterizationLinks,
  cleanExternalPath,
  isAbsoluteExternalPath,
  openExternalPath,
  ensureCharacterizationBlock,
  setCharacterizationLinks
};
