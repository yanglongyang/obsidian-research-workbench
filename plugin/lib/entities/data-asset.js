const DATA_ASSET_FOLDER = '00-博士工作台/04-数据资产';
const ASSET_TYPES = ['nmr', 'hplc', 'ms', 'uvvis', 'fluorescence', 'image', 'orca', 'raw', 'other'];

function yamlString(value) { return JSON.stringify(String(value ?? '')); }
function sanitizeSegment(value) {
  const clean = String(value || '').replace(/[<>:"/\\|?*]/g, '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 72);
  return clean || 'data-asset';
}
async function ensureFolder(vault, folder) {
  let current = '';
  for (const segment of folder.split('/')) {
    current = current ? `${current}/${segment}` : segment;
    if (vault.getAbstractFileByPath(current)) continue;
    try { await vault.createFolder(current); } catch (error) { if (!vault.getAbstractFileByPath(current)) throw error; }
  }
}
function buildDataAssetPath(vault, title) {
  const segment = sanitizeSegment(title);
  let suffix = 1;
  let candidate = '';
  do { candidate = `${DATA_ASSET_FOLDER}/${segment}${suffix === 1 ? '' : `-${suffix}`}.md`; suffix += 1; } while (vault.getAbstractFileByPath(candidate));
  return candidate;
}
function renderDataAssetContent(asset) {
  return [
    '---',
    `record_id: ${yamlString(asset.recordId)}`,
    'kind: data-asset',
    `title: ${yamlString(asset.title)}`,
    `asset_type: ${yamlString(asset.assetType)}`,
    `project_id: ${yamlString(asset.projectId)}`,
    `project: ${yamlString(asset.project)}`,
    `experiment_id: ${yamlString(asset.experimentId)}`,
    `experiment: ${yamlString(asset.experiment)}`,
    `compound_id: ${yamlString(asset.compoundId)}`,
    `compound: ${yamlString(asset.compound)}`,
    `data_path: ${yamlString(asset.dataPath)}`,
    `acquired_at: ${yamlString(asset.acquiredAt)}`,
    `status: ${yamlString(asset.status || 'available')}`,
    `created: ${yamlString(asset.created)}`,
    `updated: ${yamlString(asset.updated)}`,
    'tags:',
    '  - research/data',
    '---',
    `# ${asset.title}`,
    '',
    '## 数据位置',
    '',
    asset.dataPath || '',
    '',
    '## 备注',
    '',
    asset.notes || '',
    ''
  ].join('\n');
}
async function createDataAsset(app, input, generateRecordId) {
  const title = String(input?.title || '').trim();
  const assetType = String(input?.assetType || '').trim();
  const dataPath = String(input?.dataPath || '').trim();
  if (!title) throw new Error('请输入数据资产标题');
  if (!ASSET_TYPES.includes(assetType)) throw new Error('数据资产类型无效');
  if (!dataPath) throw new Error('请输入数据路径');
  await ensureFolder(app.vault, DATA_ASSET_FOLDER);
  const now = new Date().toISOString();
  const asset = { recordId: generateRecordId('DATA'), title, assetType, dataPath, projectId: String(input.projectId || '').trim(), project: String(input.project || '').trim(), experimentId: String(input.experimentId || '').trim(), experiment: String(input.experiment || '').trim(), compoundId: String(input.compoundId || '').trim(), compound: String(input.compound || '').trim(), acquiredAt: String(input.acquiredAt || '').trim(), status: String(input.status || 'available'), notes: String(input.notes || '').trim(), created: now, updated: now };
  const file = await app.vault.create(buildDataAssetPath(app.vault, title), renderDataAssetContent(asset));
  return { file, asset };
}
module.exports = { DATA_ASSET_FOLDER, ASSET_TYPES, buildDataAssetPath, renderDataAssetContent, createDataAsset };
