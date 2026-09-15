const { DATA_ASSET_FOLDER, ensureFolder } = require('./data-asset');

const NMR_LEDGER_PATH = `${DATA_ASSET_FOLDER}/NMR 归档台账.md`;
const NMR_LEDGER_ID = 'DATA-NMR-LEDGER';
const START_MARKER = '<!-- NMR_LEDGER_ENTRIES_START -->';
const END_MARKER = '<!-- NMR_LEDGER_ENTRIES_END -->';
const LEDGER_HEADERS = ['条目 ID', '标题', '核种', '数据路径', '课题 ID', '课题', '实验 ID', '实验', '化合物 ID', '化合物', '采集时间', '归档时间'];
const LEGACY_LEDGER_HEADERS = ['条目 ID', '核种', '数据路径', '课题', '实验', '化合物', '归档时间'];
let ledgerWriteQueue = Promise.resolve();

function yamlString(value) { return JSON.stringify(String(value ?? '')); }
function cell(value) { return String(value ?? '').replace(/[\r\n]+/g, ' ').replace(/\|/g, '\\|').trim() || '—'; }
function isNmrLedgerPath(value) { return String(value || '').replace(/\\/g, '/') === NMR_LEDGER_PATH; }
function serializeTableLine(line) {
  const raw = String(line || '').trim();
  if (!raw.startsWith('|') || !raw.endsWith('|')) return null;
  const values = []; let current = '';
  for (let index = 1; index < raw.length - 1; index += 1) {
    const char = raw[index];
    if (char === '\\' && raw[index + 1] === '|') { current += '|'; index += 1; continue; }
    if (char === '|') { values.push(current.trim()); current = ''; continue; }
    current += char;
  }
  values.push(current.trim());
  return values;
}

function renderLedger(entries, archiveRoot = '', timestamps = {}) {
  const created = timestamps.created || new Date().toISOString();
  const updated = timestamps.updated || new Date().toISOString();
  const rows = entries.map((entry) => `| ${cell(entry.entryId)} | ${cell(entry.title)} | ${cell(entry.nucleus)} | ${cell(entry.dataPath)} | ${cell(entry.projectId)} | ${cell(entry.project)} | ${cell(entry.experimentId)} | ${cell(entry.experiment)} | ${cell(entry.compoundId)} | ${cell(entry.compound)} | ${cell(entry.acquiredAt)} | ${cell(entry.archivedAt)} |`).join('\n');
  return ['---', `record_id: ${yamlString(NMR_LEDGER_ID)}`, 'kind: data-asset', `title: ${yamlString('NMR 归档台账')}`, `asset_type: ${yamlString('nmr')}`, `data_path: ${yamlString(archiveRoot)}`, `status: ${yamlString('available')}`, `created: ${yamlString(created)}`, `updated: ${yamlString(updated)}`, 'tags:', '  - research/data', '  - research/nmr', '---', '# NMR 归档台账', '', '每行对应一套已归档的核磁原始数据。可直接编辑此表；原始目录的实际位置以“数据路径”为准。', '', '## 归档记录', '', START_MARKER, `| ${LEDGER_HEADERS.join(' | ')} |`, `| ${LEDGER_HEADERS.map(() => '---').join(' | ')} |`, rows, END_MARKER, ''].join('\n');
}

function parseLedgerEntries(content) {
  const text = String(content || '');
  const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const startMatches = text.match(new RegExp(escape(START_MARKER), 'g')) || [];
  const endMatches = text.match(new RegExp(escape(END_MARKER), 'g')) || [];
  const start = text.indexOf(START_MARKER); const end = text.indexOf(END_MARKER);
  if (startMatches.length !== 1 || endMatches.length !== 1 || start < 0 || end <= start) return { ok: false, entries: [], error: 'NMR 台账 marker 缺失、重复或顺序错误' };
  const region = text.slice(start + START_MARKER.length, end).split('\n').map((line) => line.trim()).filter(Boolean);
  if (region.length < 2) return { ok: false, entries: [], error: 'NMR 台账表头不完整' };
  const header = serializeTableLine(region[0]); const divider = serializeTableLine(region[1]);
  const isV2 = header && header.length === LEDGER_HEADERS.length && LEDGER_HEADERS.every((value, index) => header[index] === value);
  const isLegacy = header && header.length === LEGACY_LEDGER_HEADERS.length && LEGACY_LEDGER_HEADERS.every((value, index) => header[index] === value);
  const expectedHeaders = isV2 ? LEDGER_HEADERS : isLegacy ? LEGACY_LEDGER_HEADERS : null;
  if (!expectedHeaders || !divider || divider.length !== expectedHeaders.length || divider.some((value) => !/^:?-{3,}:?$/.test(value))) return { ok: false, entries: [], error: 'NMR 台账表格表头异常' };
  const entries = [];
  for (const line of region.slice(2)) {
    const values = serializeTableLine(line);
    if (!values || values.length !== expectedHeaders.length || values.some((value) => !value)) return { ok: false, entries: [], error: 'NMR 台账表格正文异常' };
    const valueOrEmpty = (value) => value === '—' ? '' : value;
    entries.push(isV2
      ? { entryId: values[0], title: valueOrEmpty(values[1]), nucleus: values[2], dataPath: values[3], projectId: valueOrEmpty(values[4]), project: valueOrEmpty(values[5]), experimentId: valueOrEmpty(values[6]), experiment: valueOrEmpty(values[7]), compoundId: valueOrEmpty(values[8]), compound: valueOrEmpty(values[9]), acquiredAt: valueOrEmpty(values[10]), archivedAt: valueOrEmpty(values[11]) }
      : { entryId: values[0], nucleus: values[1], dataPath: values[2], projectId: '', project: valueOrEmpty(values[3]), experimentId: '', experiment: valueOrEmpty(values[4]), compoundId: '', compound: valueOrEmpty(values[5]), acquiredAt: '', archivedAt: valueOrEmpty(values[6]) });
  }
  const ids = new Set();
  for (const entry of entries) { if (ids.has(entry.entryId)) return { ok: false, entries: [], error: `NMR 台账存在重复条目 ID：${entry.entryId}` }; ids.add(entry.entryId); }
  return { ok: true, entries, error: '' };
}

function readFrontmatterScalar(content, key) {
  const match = String(content || '').match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
  if (!match) return '';
  const raw = match[1].trim();
  if (raw.startsWith('"')) { try { return String(JSON.parse(raw)); } catch (error) { return raw.replace(/^"|"$/g, ''); } }
  if (raw.startsWith("'")) return raw.slice(1, raw.endsWith("'") ? -1 : undefined).replace(/''/g, "'");
  return raw;
}
function withLedgerLock(task) { const run = ledgerWriteQueue.then(task, task); ledgerWriteQueue = run.catch(() => undefined); return run; }

async function upsertNmrLedger(app, input) {
  return withLedgerLock(async () => {
    if (!app?.vault) throw new Error('Obsidian Vault 不可用，无法登记 NMR 台账');
    const entryId = String(input?.entryId || '').trim(); const dataPath = String(input?.dataPath || '').trim();
    if (!entryId || !dataPath) throw new Error('NMR 台账条目缺少 ID 或数据路径');
    await ensureFolder(app.vault, DATA_ASSET_FOLDER);
    const existing = app.vault.getAbstractFileByPath(NMR_LEDGER_PATH); const now = new Date().toISOString();
    let entries = []; let created = now; let existingArchiveRoot = '';
    if (existing) {
      const previous = await app.vault.read(existing); const parsed = parseLedgerEntries(previous);
      if (!parsed.ok) throw new Error(`NMR 台账结构异常，为避免覆盖历史记录，已停止写入：${parsed.error}`);
      entries = parsed.entries; created = readFrontmatterScalar(previous, 'created') || now; existingArchiveRoot = readFrontmatterScalar(previous, 'data_path');
    }
    const entry = { entryId, title: String(input.title || ''), nucleus: String(input.nucleus || ''), dataPath, projectId: String(input.projectId || ''), project: String(input.project || ''), experimentId: String(input.experimentId || ''), experiment: String(input.experiment || ''), compoundId: String(input.compoundId || ''), compound: String(input.compound || ''), acquiredAt: String(input.acquiredAt || ''), archivedAt: String(input.archivedAt || now) };
    const index = entries.findIndex((item) => item.entryId === entryId); if (index >= 0) entries[index] = entry; else entries.push(entry);
    const content = renderLedger(entries, String(input.archiveRoot || '').trim() || existingArchiveRoot, { created, updated: now });
    const file = existing || await app.vault.create(NMR_LEDGER_PATH, content); if (existing) await app.vault.modify(file, content);
    const verified = parseLedgerEntries(await app.vault.read(file));
    if (!verified.ok || !verified.entries.some((item) => item.entryId === entryId && item.dataPath === dataPath)) throw new Error('NMR 台账写入后校验失败，为避免不一致，未确认登记成功');
    return { file, ledgerId: NMR_LEDGER_ID, entryId, created: !existing, entryCount: verified.entries.length };
  });
}

function legacyNmrAssets(app) {
  if (!app?.vault || !app?.metadataCache) return [];
  return app.vault.getMarkdownFiles().filter((file) => file.path.startsWith(`${DATA_ASSET_FOLDER}/`) && !isNmrLedgerPath(file.path)).map((file) => ({ file, frontmatter: app.metadataCache.getFileCache(file)?.frontmatter || {} })).filter(({ frontmatter }) => frontmatter.kind === 'data-asset' && frontmatter.asset_type === 'nmr' && frontmatter.created_via !== 'data-asset-modal');
}

async function preflightLegacyNmrAssets(app) {
  const items = legacyNmrAssets(app); const errors = []; const warnings = []; const seenIds = new Map(); const seenPaths = new Map(); let ledgerEntries = [];
  const ledger = app?.vault?.getAbstractFileByPath(NMR_LEDGER_PATH);
  if (ledger) { const parsed = parseLedgerEntries(await app.vault.read(ledger)); if (!parsed.ok) errors.push(`现有 NMR 台账无法解析：${parsed.error}`); else ledgerEntries = parsed.entries; }
  for (const item of items) {
    const id = String(item.frontmatter.record_id || '').trim(); const dataPath = String(item.frontmatter.data_path || '').trim();
    if (!id) errors.push(`${item.file.path}：缺少 record_id`); if (!dataPath) errors.push(`${item.file.path}：缺少 data_path`);
    if (id) { if (seenIds.has(id)) errors.push(`重复 record_id：${id}（${seenIds.get(id)} 与 ${item.file.path}）`); else seenIds.set(id, item.file.path); }
    if (dataPath) { if (seenPaths.has(dataPath)) errors.push(`重复 data_path：${dataPath}（${seenPaths.get(dataPath)} 与 ${item.file.path}）`); else seenPaths.set(dataPath, item.file.path); }
    if (dataPath && ledgerEntries.some((entry) => entry.dataPath === dataPath)) errors.push(`${item.file.path}：data_path 已存在于 NMR 台账：${dataPath}`);
    if (id && ledgerEntries.some((entry) => entry.entryId === `LEGACY-${id}`)) errors.push(`${item.file.path}：迁移 entry ID 已存在：LEGACY-${id}`);
    const lossy = [];
    if (String(item.frontmatter.status || '').trim() && String(item.frontmatter.status).trim() !== 'available') lossy.push('status');
    if (String(item.frontmatter.notes || '').trim()) lossy.push('notes');
    // Legacy data-asset notes are normally stored in the markdown body under
    // `## 备注`, not in frontmatter. Read the body during preflight so a
    // migration never silently discards researcher-entered notes.
    try {
      const body = await app.vault.read(item.file);
      const noteSection = String(body || '').match(/(?:^|\n)##\s*备注\s*\n([\s\S]*?)(?=\n##\s|\s*$)/);
      if (noteSection && noteSection[1].trim()) lossy.push('notes');
    } catch (error) {
      errors.push(`${item.file.path}：无法读取正文，已停止迁移（${error instanceof Error ? error.message : String(error)}）`);
    }
    if (lossy.length) warnings.push(`${item.file.path}：以下字段无法完整写入台账：${[...new Set(lossy)].join('、')}`);
  }
  return { items, errors, warnings, ledgerEntries };
}

async function consolidateLegacyNmrAssets(app) {
  const preflight = await preflightLegacyNmrAssets(app);
  if (preflight.errors.length || preflight.warnings.length) return { status: 'failed', migrated: [], skipped: preflight.items.map(({ file }) => ({ file, reason: preflight.errors.join('；') || preflight.warnings.join('；') })), failed: [], errors: preflight.errors, warnings: preflight.warnings };
  const migrated = []; const skipped = []; const failed = [];
  for (const { file, frontmatter } of preflight.items) {
    const id = String(frontmatter.record_id).trim(); const dataPath = String(frontmatter.data_path).trim();
    try {
      const result = await upsertNmrLedger(app, { entryId: `LEGACY-${id}`, title: frontmatter.title, nucleus: /13C/i.test(String(frontmatter.title || '')) ? '13C' : /1H/i.test(String(frontmatter.title || '')) ? '1H' : 'NMR', dataPath, projectId: frontmatter.project_id, project: frontmatter.project, experimentId: frontmatter.experiment_id, experiment: frontmatter.experiment, compoundId: frontmatter.compound_id, compound: frontmatter.compound, acquiredAt: frontmatter.acquired_at, archivedAt: frontmatter.updated || frontmatter.created || frontmatter.acquired_at, archiveRoot: '' });
      const ledger = app.vault.getAbstractFileByPath(NMR_LEDGER_PATH); const parsed = ledger ? parseLedgerEntries(await app.vault.read(ledger)) : { ok: false, entries: [] }; const verified = parsed.ok && parsed.entries.some((entry) => entry.entryId === result.entryId && entry.dataPath === dataPath);
      if (!verified) { failed.push({ file, error: '写入后回读未找到匹配台账条目，原笔记未移入回收站' }); continue; }
      if (typeof app.vault.trash !== 'function') throw new Error('Obsidian Vault 不支持可恢复回收站');
      await app.vault.trash(file, false); migrated.push(file);
    } catch (error) { failed.push({ file, error: error instanceof Error ? error.message : String(error) }); }
  }
  return { status: failed.length ? (migrated.length ? 'partial_failure' : 'failed') : 'completed', migrated, skipped, failed, errors: [], warnings: [] };
}

module.exports = { NMR_LEDGER_PATH, NMR_LEDGER_ID, START_MARKER, END_MARKER, LEDGER_HEADERS, LEGACY_LEDGER_HEADERS, isNmrLedgerPath, parseLedgerEntries, renderLedger, upsertNmrLedger, legacyNmrAssets, preflightLegacyNmrAssets, consolidateLegacyNmrAssets };
