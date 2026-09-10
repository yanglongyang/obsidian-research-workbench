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
const { openQuickCreateCommand } = require('../plugin/lib/quick-create-command');
const { isPermanentEntityId } = require('../plugin/lib/entities/identity');
const { createProject } = require('../plugin/lib/entities/project');
const { createCompound } = require('../plugin/lib/entities/compound');
const { createDataAsset } = require('../plugin/lib/entities/data-asset');
const { NMR_LEDGER_PATH, NMR_LEDGER_ID, parseLedgerEntries, upsertNmrLedger, consolidateLegacyNmrAssets } = require('../plugin/lib/entities/nmr-ledger');
const { PermanentIdMigration } = require('../plugin/lib/migrations/permanent-id');
const { filterCompoundsByProject, suggestProjectFromCompound } = require('../plugin/lib/experiment-modal');
const { EntityStore } = require('../plugin/lib/entities/store');
const { WorkQueueStore } = require('../plugin/lib/work-queue');
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
    async read(file) { return file.content || ''; },
    async createFolder(value) { if (options.fail) throw new Error('audit vault unavailable'); files.set(value, { path: value }); },
    async create(value, content) { if (options.fail) throw new Error('audit vault unavailable'); const file = { path: value, content }; files.set(value, file); return file; },
    async modify(file, content) { if (options.fail) throw new Error('audit vault unavailable'); file.content = content; },
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

test('v0.4 record types and relationship integrity detect missing, wrong and legacy references', () => {
  assert.strictEqual(database.recordType('00-博士工作台/02-课题/p.md', { kind: 'project' }), 'project');
  assert.strictEqual(database.recordType('00-博士工作台/04-化合物/c.md', { kind: 'compound' }), 'compound');
  assert.strictEqual(database.recordType('00-博士工作台/04-数据资产/a.md', { kind: 'data-asset' }), 'data-asset');
  const result = database.validateRelationships([
    { id: 'PROJ-1', type: 'project', path: 'p.md' },
    { id: 'CMP-1', type: 'compound', path: 'c.md', projectId: 'PROJ-1' },
    { id: 'EXP-1', type: 'experiment', path: 'e.md', projectId: 'MISSING', compoundId: 'CMP-1' },
    { id: 'DATA-1', type: 'data-asset', path: 'a.md', projectId: 'LEGACY-PROJECT-1', experimentId: 'PROJ-1', compoundId: 'DATA-1' }
  ]);
  assert.strictEqual(result.validRelationCount, 2);
  assert.ok(result.issues.some((issue) => issue.type === 'missing_target'));
  assert.ok(result.issues.some((issue) => issue.type === 'wrong_target_type'));
  assert.ok(result.issues.some((issue) => issue.type === 'legacy_reference'));
  assert.ok(result.issues.some((issue) => issue.type === 'self_reference'));
});

test('permanent entity IDs enforce type prefixes', () => {
  assert.strictEqual(isPermanentEntityId('PROJ-ABC', 'project'), true);
  assert.strictEqual(isPermanentEntityId('LEGACY-PROJECT-ABC', 'project'), false);
  assert.strictEqual(isPermanentEntityId('EXP-ABC', 'project'), false);
  assert.strictEqual(isPermanentEntityId('', 'project'), false);
});

test('relation selector helpers filter and suggest without overwriting explicit values', () => {
  const compounds = [{ id: 'CMP-A', projectId: 'PROJ-A' }, { id: 'CMP-B', projectId: 'PROJ-B' }];
  assert.deepStrictEqual(filterCompoundsByProject(compounds, 'PROJ-A'), [compounds[0]]);
  assert.deepStrictEqual(filterCompoundsByProject(compounds, ''), compounds);
  assert.strictEqual(suggestProjectFromCompound('', compounds[1]), 'PROJ-B');
  assert.strictEqual(suggestProjectFromCompound('PROJ-A', compounds[1]), 'PROJ-A');
});

test('schema v3 and duplicate target precedence remain explicit', () => {
  assert.strictEqual(database.DATABASE_SCHEMA_VERSION, 3);
  const result = database.validateRelationships([
    { id: 'CMP-1', type: 'compound', path: 'a.md' },
    { id: 'CMP-1', type: 'compound', path: 'b.md' },
    { id: 'DATA-1', type: 'data-asset', path: 'd.md', compoundId: 'CMP-1' }
  ]);
  assert.ok(result.issues.some((issue) => issue.type === 'duplicate_record_id'));
  assert.strictEqual(result.validRelationCount, 0);
});

test('EntityStore selectors exclude legacy and wrong-prefix records', () => {
  const files = [{ path: '00-博士工作台/02-课题/a.md', basename: 'a' }, { path: '00-博士工作台/02-课题/b.md', basename: 'b' }];
  const metadata = new Map([[files[0], { kind: 'project', record_id: 'PROJ-1', title: 'A' }], [files[1], { kind: 'project', record_id: 'LEGACY-PROJECT-X', title: 'B' }]]);
  const plugin = { app: { vault: { getMarkdownFiles: () => files }, metadataCache: { getFileCache: (file) => ({ frontmatter: metadata.get(file) }) } } };
  assert.deepStrictEqual(new EntityStore(plugin).listProjects().map((item) => item.id), ['PROJ-1']);
});

test('relationship conflicts are reported only when both sides are explicit', () => {
  const consistent = database.validateRelationships([
    { id: 'PROJ-A', type: 'project', path: 'p.md' },
    { id: 'CMP-A', type: 'compound', path: 'c.md', projectId: 'PROJ-A' },
    { id: 'EXP-A', type: 'experiment', path: 'e.md', projectId: 'PROJ-A', compoundId: 'CMP-A' },
    { id: 'DATA-A', type: 'data-asset', path: 'd.md', projectId: 'PROJ-A', experimentId: 'EXP-A', compoundId: 'CMP-A' }
  ]);
  assert.strictEqual(consistent.issues.filter((issue) => issue.type === 'relation_conflict').length, 0);
  const conflict = database.validateRelationships([
    { id: 'PROJ-A', type: 'project', path: 'p.md' },
    { id: 'PROJ-B', type: 'project', path: 'p2.md' },
    { id: 'CMP-B', type: 'compound', path: 'c.md', projectId: 'PROJ-B' },
    { id: 'EXP-B', type: 'experiment', path: 'e.md', projectId: 'PROJ-A', compoundId: 'CMP-B' },
    { id: 'DATA-B', type: 'data-asset', path: 'd.md', projectId: 'PROJ-A', experimentId: 'EXP-B', compoundId: 'CMP-B' }
  ]);
  assert.ok(conflict.issues.some((issue) => issue.type === 'relation_conflict'));
  const missing = database.validateRelationships([{ id: 'DATA-C', type: 'data-asset', path: 'd.md', experimentId: 'EXP-MISSING' }]);
  assert.strictEqual(missing.issues.filter((issue) => issue.type === 'relation_conflict').length, 0);
});

function entityApp() {
  const files = new Map();
  const vault = {
    getAbstractFileByPath(value) { return files.get(value) || null; },
    async createFolder(value) { files.set(value, { path: value }); },
    async create(value, content) { const file = { path: value, basename: value.split('/').pop().replace(/\.md$/, ''), extension: 'md', content }; files.set(value, file); return file; }
  };
  return { files, vault };
}

test('project, compound and data asset creation writes typed Markdown entities', async () => {
  const app = entityApp();
  const id = (prefix) => `${prefix}-TEST`;
  const project = await createProject(app, { title: 'P/1' }, id);
  const compound = await createCompound(app, { compoundCode: 'C/1', projectId: 'PROJ-TEST' }, id);
  const asset = await createDataAsset(app, { title: 'NMR', assetType: 'nmr', dataPath: 'E:/nmr', projectId: 'PROJ-TEST', experimentId: 'EXP-TEST', compoundId: 'CMP-TEST' }, id);
  assert.match(project.path, /02-课题/); assert.match(project.content, /kind: project/); assert.match(project.content, /record_id: "PROJ-TEST"/);
  assert.match(compound.path, /04-化合物/); assert.match(compound.content, /kind: compound/);
  assert.match(asset.file.path, /04-数据资产/); assert.match(asset.file.content, /asset_type: "nmr"/);
  await assert.rejects(() => createProject(app, {}, id));
  await assert.rejects(() => createCompound(app, {}, id));
  await assert.rejects(() => createDataAsset(app, { title: 'bad', assetType: 'invalid', dataPath: 'x' }, id));
});

test('migration preview uses real legacy IDs and apply honors TOCTOU skip/failure', async () => {
  const files = [{ path: '实验记录/old.md', basename: 'old' }, { path: '00-博士工作台/02-课题/legacy.md', basename: 'legacy' }];
  const frontmatter = new Map(files.map((file) => [file.path, { kind: file.path.includes('课题') ? undefined : 'experiment', title: file.basename }]));
  frontmatter.set(files[1].path, { title: 'Legacy Project' });
  const app = { vault: { getMarkdownFiles: () => files, getAbstractFileByPath: (path) => files.find((file) => file.path === path) || null }, metadataCache: { getFileCache: (file) => ({ frontmatter: frontmatter.get(file.path) }) }, fileManager: { async processFrontMatter(file, callback) { const data = frontmatter.get(file.path); callback(data); } } };
  const migration = new PermanentIdMigration({ app }, (prefix) => `${prefix}-NEW`);
  const items = migration.scan();
  assert.ok(items.every((item) => item.currentId.startsWith('LEGACY-') && item.currentId.split('-').length >= 3));
  frontmatter.get(files[0].path).record_id = 'EXP-MANUAL';
  const result = await migration.apply(items);
  assert.strictEqual(result.skipped.length, 1);
  assert.strictEqual(result.migrated.length, 1);
  assert.strictEqual(frontmatter.get(files[1].path).record_id, 'PROJ-NEW');
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
  assert.strictEqual(ui.badgeTone('19F', 'nmr'), 'warning');
  assert.strictEqual(ui.VALID_SECTIONS.has('nmr-inbox'), true);
  assert.strictEqual(ui.VALID_SECTIONS.has('work-queue'), true);
});

test('Quick Create command activates a closed view before opening modal', async () => {
  class FakeView {}
  let current = [];
  let activated = 0;
  let opened = 0;
  const app = { workspace: { getLeavesOfType: () => current } };
  const view = new FakeView();
  await openQuickCreateCommand(app, 'view', FakeView, async () => {
    activated += 1;
    view.openQuickCreate = () => { opened += 1; };
    current = [{ view }];
  });
  assert.strictEqual(activated, 1);
  assert.strictEqual(opened, 1);
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

test('NMR archive renames the batch folder while preserving scan folders', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'phdcc-rename-'));
  const inbox = path.join(root, 'inbox'); const archive = path.join(root, 'archive');
  await fs.mkdir(inbox, { recursive: true }); await makeScan(inbox, 'old-batch\\10', '1H', true); await makeScan(inbox, 'other-batch\\10', '1H', true);
  const store = new nmr.NmrInboxStore(pluginFor(inbox, archive));
  const renamed = await store.preflightArchive(['old-batch\\10'], { 'old-batch': 'YLY-145' });
  assert.strictEqual(renamed.errors.length, 0); assert.match(renamed.plans[0].destinationPath, /YLY-145\\10$/); assert.strictEqual(renamed.plans[0].scanFolderName, '10');
  const duplicate = await store.preflightArchive(['old-batch\\10', 'other-batch\\10'], { 'old-batch': 'same', 'other-batch': 'same' });
  assert.ok(duplicate.errors.some((error) => /重复/.test(error)));
  const invalid = await store.preflightArchive(['old-batch\\10'], { 'old-batch': 'bad/name' });
  assert.ok(invalid.errors.some((error) => /不允许/.test(error)));
  const result = await store.archiveSelected(['old-batch\\10'], {}, { 'old-batch': 'YLY-145' });
  assert.strictEqual(result.status, 'completed');
  assert.strictEqual(await fs.access(path.join(archive, '氢谱', 'YLY-145', '10')).then(() => true), true);
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

test('NMR delete removes only the selected inbox scan and writes an audit trail', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'phdcc-delete-'));
  const inbox = path.join(root, 'inbox');
  await fs.mkdir(inbox, { recursive: true });
  const selected = await makeScan(inbox, 'batch\\10', '1H', true);
  const sibling = await makeScan(inbox, 'batch\\11', '13C', true);
  const vault = auditVault();
  const store = new nmr.NmrInboxStore(pluginFor(inbox, '', vault));
  const result = await store.deleteSelected(['batch\\10']);
  assert.strictEqual(result.status, 'completed');
  assert.strictEqual(result.deleted.length, 1);
  assert.strictEqual(await fs.access(selected).then(() => true).catch(() => false), false);
  assert.strictEqual(await fs.access(sibling).then(() => true), true);
  const audit = vault.files.get('00-博士工作台/应用数据/审计/nmr-archive.jsonl').content;
  assert.match(audit, /"operation":"delete"/);
  assert.match(audit, /"status":"delete_started"/);
  assert.match(audit, /"status":"deleted"/);
  await fs.rm(root, { recursive: true, force: true });
});

test('NMR delete refuses unlisted paths and blocks deletion when initial audit fails', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'phdcc-delete-safe-'));
  const inbox = path.join(root, 'inbox');
  await fs.mkdir(inbox, { recursive: true });
  const source = await makeScan(inbox, 'blocked', '1H', true);
  const store = new nmr.NmrInboxStore(pluginFor(inbox, '', auditVault({ fail: true })));
  const missing = await store.preflightDelete(['..\\outside']);
  assert.ok(missing.errors.some((error) => /不在待解核磁目录/.test(error)));
  const result = await store.deleteSelected(['blocked']);
  assert.strictEqual(result.status, 'failed');
  assert.strictEqual(await fs.access(source).then(() => true), true);
  await fs.rm(root, { recursive: true, force: true });
});

test('NMR archive appends one ledger entry with relations and records the ledger ID', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'phdcc-asset-'));
  const inbox = path.join(root, 'inbox'); const archive = path.join(root, 'archive');
  await fs.mkdir(inbox, { recursive: true }); await makeScan(inbox, 'linked', '1H', true);
  const vault = auditVault(); const store = new nmr.NmrInboxStore(pluginFor(inbox, archive, vault));
  let received;
  store.registerNmrArchive = async (_app, input) => { received = input; return { ledgerId: NMR_LEDGER_ID, entryId: input.entryId }; };
  const result = await store.archiveSelected(['linked'], { projectId: 'PROJ-A', experimentId: 'EXP-A', compoundId: 'CMP-A' });
  assert.strictEqual(result.status, 'completed'); assert.strictEqual(received.nucleus, '1H'); assert.strictEqual(received.projectId, 'PROJ-A');
  assert.match(vault.files.get('00-博士工作台/应用数据/审计/nmr-archive.jsonl').content, new RegExp(`"data_asset_id":"${NMR_LEDGER_ID}"`));
  await fs.rm(root, { recursive: true, force: true });
});

test('NMR ledger registration failure keeps moved raw data and returns partial failure', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'phdcc-asset-fail-'));
  const inbox = path.join(root, 'inbox'); const archive = path.join(root, 'archive');
  await fs.mkdir(inbox, { recursive: true }); await makeScan(inbox, 'registered-fail', '1H', true);
  const vault = auditVault(); const store = new nmr.NmrInboxStore(pluginFor(inbox, archive, vault));
  store.registerNmrArchive = async () => { throw new Error('registration unavailable'); };
  const result = await store.archiveSelected(['registered-fail']);
  assert.strictEqual(result.status, 'partial_failure'); assert.strictEqual(result.registrationErrors.length, 1);
  assert.strictEqual(await fs.access(path.join(archive, '氢谱', 'registered-fail')).then(() => true), true);
  assert.match(vault.files.get('00-博士工作台/应用数据/审计/nmr-archive.jsonl').content, /registration_error/);
  await fs.rm(root, { recursive: true, force: true });
});

test('NMR final audit failure does not roll back move or ledger entry', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'phdcc-final-audit-'));
  const inbox = path.join(root, 'inbox'); const archive = path.join(root, 'archive');
  await fs.mkdir(inbox, { recursive: true }); await makeScan(inbox, 'audit-final', '1H', true);
  const vault = auditVault(); const store = new nmr.NmrInboxStore(pluginFor(inbox, archive, vault));
  let auditCount = 0; store.writeAudit = async (entry) => { auditCount += 1; if (entry.status === 'success') throw new Error('final audit unavailable'); };
  let created = false; store.registerNmrArchive = async (_app, input) => { created = true; return { ledgerId: NMR_LEDGER_ID, entryId: input.entryId }; };
  const result = await store.archiveSelected(['audit-final']);
  assert.strictEqual(result.status, 'partial_failure'); assert.strictEqual(result.auditErrors.length, 1); assert.strictEqual(created, true); assert.ok(auditCount >= 2);
  assert.strictEqual(await fs.access(path.join(archive, '氢谱', 'audit-final')).then(() => true), true);
  await fs.rm(root, { recursive: true, force: true });
});

test('NMR ledger stores multiple archives in one Markdown file', async () => {
  const vault = auditVault();
  const app = { vault };
  await upsertNmrLedger(app, { entryId: 'NMRARC-1', nucleus: '1H', dataPath: 'E:\\NMR\\氢谱\\YLY-1\\10', project: '课题 A', archivedAt: '2026-09-10T00:00:00.000Z', archiveRoot: 'E:\\NMR' });
  await upsertNmrLedger(app, { entryId: 'NMRARC-2', nucleus: '13C', dataPath: 'E:\\NMR\\碳谱\\YLY-1\\11', compound: 'YLY-1', archivedAt: '2026-09-10T01:00:00.000Z', archiveRoot: 'E:\\NMR' });
  const ledger = vault.files.get(NMR_LEDGER_PATH).content;
  assert.match(ledger, /record_id: "DATA-NMR-LEDGER"/);
  assert.strictEqual(parseLedgerEntries(ledger).length, 2);
  assert.strictEqual(vault.files.size, 3);
});

test('legacy single-file NMR assets consolidate into the ledger and move to vault trash', async () => {
  const vault = auditVault();
  const first = { path: '00-博士工作台/04-数据资产/old-1.md', basename: 'old-1', extension: 'md', content: '' };
  const second = { path: '00-博士工作台/04-数据资产/old-2.md', basename: 'old-2', extension: 'md', content: '' };
  vault.files.set(first.path, first); vault.files.set(second.path, second);
  vault.getMarkdownFiles = () => [...vault.files.values()].filter((file) => file.extension === 'md');
  vault.trash = async (file) => { vault.files.delete(file.path); };
  const metadata = new Map([
    [first, { kind: 'data-asset', asset_type: 'nmr', record_id: 'DATA-OLD-1', data_path: 'E:\\NMR\\氢谱\\1', title: '1H NMR' }],
    [second, { kind: 'data-asset', asset_type: 'nmr', record_id: 'DATA-OLD-2', data_path: 'E:\\NMR\\碳谱\\2', title: '13C NMR' }]
  ]);
  const result = await consolidateLegacyNmrAssets({ vault, metadataCache: { getFileCache: (file) => ({ frontmatter: metadata.get(file) || {} }) } });
  assert.strictEqual(result.migrated.length, 2);
  assert.strictEqual(vault.files.has(first.path), false);
  assert.strictEqual(parseLedgerEntries(vault.files.get(NMR_LEDGER_PATH).content).length, 2);
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

test('work queue summarizes top-level entries and excludes the dedicated NMR inbox', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'phdcc-work-queue-'));
  await fs.mkdir(path.join(root, 'project-a', 'raw'), { recursive: true });
  await fs.mkdir(path.join(root, '待解核磁'), { recursive: true });
  await fs.writeFile(path.join(root, 'project-a', 'raw', 'result.csv'), 'x');
  await fs.writeFile(path.join(root, 'brief.docx'), 'draft');
  const plugin = { settings: { processingInboxFolder: root } };
  const result = await new WorkQueueStore(plugin).listSource('data');
  assert.deepStrictEqual(result.entries.map((entry) => entry.name).sort(), ['brief.docx', 'project-a']);
  assert.strictEqual(result.entries.find((entry) => entry.name === 'project-a').fileCount, 1);
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
