const { DATA_ASSET_FOLDER, ensureFolder } = require('./data-asset');

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
