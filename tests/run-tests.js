const assert = require('assert');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const Module = require('module');

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'obsidian') return {
    TFile: class TFile {},
    ItemView: class ItemView { constructor(leaf) { this.leaf = leaf; } },
    Modal: class Modal {},
    Notice: class Notice {},
    Setting: class Setting {},
    setIcon: () => {},
    normalizePath: (value) => String(value || '').replace(/\\/g, '/')
  };
  return originalLoad.call(this, request, parent, isMain);
};

const data = require('../plugin/lib/data');
const database = require('../plugin/lib/database');
const nmr = require('../plugin/lib/nmr');
const ui = require('../plugin/lib/view');
Module._load = originalLoad;

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

function fakeVault(paths = []) {
  const set = new Set(paths);
  return { getAbstractFileByPath: (value) => set.has(value) ? { path: value } : null };
}

function auditVault(options = {}) {
  const files = new Map();
  return {
    files,
    getAbstractFileByPath(value) { return files.has(value) ? files.get(value) : null; },
    async createFolder(value) { if (options.fail) throw new Error('audit vault unavailable'); files.set(value, { path: value }); },
    async create(value, content) { if (options.fail) throw new Error('audit vault unavailable'); const file = { path: value, content }; files.set(value, file); return file; },
    async append(file, content) { if (options.fail) throw new Error('audit vault unavailable'); file.content += content; }
  };
}

async function makeScan(root, name, nucleus = '1H', withFid = true) {
  const folder = path.join(root, name);
  await fs.mkdir(folder, { recursive: true });
  await fs.writeFile(path.join(folder, 'acqus'), `##$NUC1= <${nucleus}>\n`, 'utf8');
  if (withFid) await fs.writeFile(path.join(folder, 'fid'), 'raw data', 'utf8');
  return folder;
}

function pluginFor(inbox, archive, vault = auditVault()) {
  return { settings: { nmrInboxFolder: inbox, nmrArchiveFolder: archive }, app: { vault } };
}

test('stable IDs use the requested prefix and do not repeat', () => {
  const first = data.generateRecordId('TASK');
  const second = data.generateRecordId('TASK');
  assert.match(first, /^TASK-[A-Z0-9]+$/);
  assert.notStrictEqual(first, second);
});

test('path safety handles root, child, traversal and similar prefixes', () => {
  assert.strictEqual(data.isPathInside('00-博士工作台/03-实验/a.md', '00-博士工作台'), true);
  assert.strictEqual(data.isPathInside('00-博士工作台', '00-博士工作台'), true);
  assert.strictEqual(data.isPathInside('00-博士工作台/../秘密.md', '00-博士工作台'), false);
  assert.strictEqual(data.isPathInside('00-博士工作台2/a.md', '00-博士工作台'), false);
  assert.strictEqual(nmr.insideRoot('E:\\待处理数据\\待解核磁\\a', 'E:\\待处理数据\\待解核磁'), true);
  assert.strictEqual(nmr.insideRoot('E:\\待处理数据\\待解核磁2\\a', 'E:\\待处理数据\\待解核磁'), false);
});

test('rename filtering considers both old and new paths', () => {
  assert.strictEqual(database.affectsManagedPath(['00-博士工作台/03-实验/A.md', '临时文件/A.md']), true);
  assert.strictEqual(database.affectsManagedPath(['临时文件/A.md', '00-博士工作台/03-实验/A.md']), true);
  assert.strictEqual(database.affectsManagedPath(['临时文件/A.md', '另一个目录/A.md']), false);
  assert.strictEqual(database.affectsManagedPath(['00-博士工作台/应用数据/数据库/records.json']), false);
});

test('legacy identity is explicit and frontmatter identity wins after move', () => {
  const legacy = database.identityFor('03-实验/a.md', {}, 'experiment');
  assert.strictEqual(legacy.identitySource, 'legacy-path');
  assert.match(legacy.id, /^LEGACY-EXPERIMENT-/);
  assert.deepStrictEqual(database.identityFor('archive/a.md', { record_id: 'EXP-123' }, 'experiment'), { id: 'EXP-123', identitySource: 'frontmatter' });
});

test('managed, derived and duplicate identities are explicit', () => {
  assert.strictEqual(database.isManagedPath('00-博士工作台/03-实验/a.md'), true);
  assert.strictEqual(database.isManagedPath('随手记/a.md'), false);
  assert.strictEqual(database.isDerivedPath('00-博士工作台/应用数据/数据库/records.json'), true);
  const duplicates = database.findDuplicateIds([{ id: 'EXP-1', path: 'a.md' }, { id: 'EXP-1', path: 'b.md' }, { id: 'EXP-2', path: 'c.md' }]);
  assert.deepStrictEqual(duplicates, [{ id: 'EXP-1', paths: ['a.md', 'b.md'] }]);
});

test('NMR nucleus classification and archive mapping', () => {
  assert.strictEqual(nmr.classifyNucleus('##$NUC1= <1H>'), '1H');
  assert.strictEqual(nmr.classifyNucleus('##$NUC1= <13C>'), '13C');
  assert.strictEqual(nmr.classifyNucleus('unknown'), 'unknown');
  assert.strictEqual(nmr.archiveCategory('1H'), '氢谱');
  assert.strictEqual(nmr.archiveCategory('13C'), '碳谱');
  assert.strictEqual(nmr.volumeRoot('D:\\NMR'), 'D:');
  assert.strictEqual(nmr.volumeRoot('E:\\NMR'), 'E:');
});

test('NMR batch status distinguishes complete, partial and failed', () => {
  assert.strictEqual(nmr.archiveBatchStatus(3, 0), 'completed');
  assert.strictEqual(nmr.archiveBatchStatus(2, 1), 'partial_failure');
  assert.strictEqual(nmr.archiveBatchStatus(0, 2), 'failed');
});

test('UI helpers format relative dates and status tones', () => {
  assert.strictEqual(ui.formatRelativeDate('2026-09-09', '2026-09-09'), '今天');
  assert.strictEqual(ui.formatRelativeDate('2026-09-10', '2026-09-09'), '明天');
  assert.strictEqual(ui.formatRelativeDate('2026-09-08', '2026-09-09'), '昨天');
  assert.strictEqual(ui.formatRelativeDate('2026-09-01', '2026-09-09'), '逾期 8 天');
  assert.strictEqual(ui.badgeTone('high', 'priority'), 'danger');
  assert.strictEqual(ui.badgeTone('blocked'), 'danger');
  assert.strictEqual(ui.badgeTone('unknown', 'nmr'), 'warning');
  assert.strictEqual(ui.VALID_SECTIONS.has('nmr-inbox'), true);
});

test('experiment path sanitizes titles and avoids collisions', () => {
  const vault = fakeVault(['00-博士工作台/03-实验/2026-09-08-20260908-120000-a-1.md']);
  const result = data.buildExperimentPath(vault, 'a/:*?', '2026-09-08');
  assert.match(result, /^00-博士工作台\/03-实验\/2026-09-08-/);
});

test('NMR preflight rejects missing fid, unknown nucleus, existing destination and accepts valid scan', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'phdcc-preflight-'));
  const inbox = path.join(root, 'inbox');
  const archive = path.join(root, 'archive');
  await fs.mkdir(inbox, { recursive: true });
  await makeScan(inbox, 'valid', '1H', true);
  await makeScan(inbox, 'missing-fid', '1H', false);
  await makeScan(inbox, 'unknown', '19F', true);
  await makeScan(inbox, 'existing', '13C', true);
  await fs.mkdir(path.join(archive, '碳谱', 'existing'), { recursive: true });
  const store = new nmr.NmrInboxStore(pluginFor(inbox, archive));
  const valid = await store.preflightArchive(['valid']);
  assert.strictEqual(valid.errors.length, 0);
  assert.strictEqual(valid.plans.length, 1);
  assert.match((await store.preflightArchive(['missing-fid'])).errors.join(' '), /缺少 fid/);
  assert.match((await store.preflightArchive(['unknown'])).errors.join(' '), /无法从 acqus 识别核种/);
  assert.match((await store.preflightArchive(['existing'])).errors.join(' '), /目标已存在/);
  await fs.rm(root, { recursive: true, force: true });
});

test('NMR archive writes started and success audit entries', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'phdcc-archive-'));
  const inbox = path.join(root, 'inbox');
  const archive = path.join(root, 'archive');
  await fs.mkdir(inbox, { recursive: true });
  await makeScan(inbox, 'valid', '1H', true);
  const vault = auditVault();
  const store = new nmr.NmrInboxStore(pluginFor(inbox, archive, vault));
  const result = await store.archiveSelected(['valid']);
  assert.strictEqual(result.status, 'completed');
  assert.strictEqual(result.archived.length, 1);
  const audit = vault.files.get('00-博士工作台/应用数据/审计/nmr-archive.jsonl').content;
  assert.match(audit, /"status":"started"/);
  assert.match(audit, /"status":"success"/);
  assert.strictEqual(await fs.access(path.join(archive, '氢谱', 'valid')).then(() => true), true);
  await fs.rm(root, { recursive: true, force: true });
});

test('NMR audit failure prevents moving source data', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'phdcc-audit-fail-'));
  const inbox = path.join(root, 'inbox');
  const archive = path.join(root, 'archive');
  await fs.mkdir(inbox, { recursive: true });
  const source = await makeScan(inbox, 'blocked', '1H', true);
  const store = new nmr.NmrInboxStore(pluginFor(inbox, archive, auditVault({ fail: true })));
  const result = await store.archiveSelected(['blocked']);
  assert.strictEqual(result.status, 'failed');
  assert.strictEqual(await fs.access(source).then(() => true), true);
  await fs.rm(root, { recursive: true, force: true });
});

test('NMR archive reports real partial failure', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'phdcc-partial-'));
  const inbox = path.join(root, 'inbox');
  const archive = path.join(root, 'archive');
  await fs.mkdir(inbox, { recursive: true });
  const first = await makeScan(inbox, 'first', '1H', true);
  const missing = path.join(inbox, 'missing');
  const store = new nmr.NmrInboxStore(pluginFor(inbox, archive));
  const plan = (sourcePath, relativeScanPath) => ({ sourcePath, destinationPath: path.join(archive, '氢谱', relativeScanPath), relativeScanPath, nucleus: '1H', fileCount: 2, directoryCount: 0, totalBytes: 10, scanFolder: sourcePath });
  store.preflightArchive = async () => ({ plans: [plan(first, 'first'), plan(missing, 'missing')], errors: [] });
  const result = await store.archiveSelected(['first', 'missing']);
  assert.strictEqual(result.status, 'partial_failure');
  assert.strictEqual(result.archived.length, 1);
  assert.strictEqual(result.failed.length, 1);
  await fs.rm(root, { recursive: true, force: true });
});

async function run() {
  let failed = 0;
  for (const item of tests) {
    try {
      await item.fn();
      console.log(`PASS ${item.name}`);
    } catch (error) {
      failed += 1;
      console.error(`FAIL ${item.name}: ${error.stack || error.message}`);
    }
  }
  if (failed) process.exitCode = 1;
}

run();
