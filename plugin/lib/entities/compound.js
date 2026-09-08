const COMPOUND_FOLDER = '00-博士工作台/04-化合物';

function yamlString(value) { return JSON.stringify(String(value ?? '')); }
function sanitizeSegment(value) {
  const clean = String(value || '').replace(/[<>:"/\\|?*]/g, '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 64);
  return clean || 'compound';
}
async function ensureFolder(vault, folder) {
  let current = '';
  for (const segment of folder.split('/')) {
    current = current ? `${current}/${segment}` : segment;
    if (vault.getAbstractFileByPath(current)) continue;
    try { await vault.createFolder(current); } catch (error) { if (!vault.getAbstractFileByPath(current)) throw error; }
  }
}
function buildCompoundPath(vault, code) {
  const segment = sanitizeSegment(code);
  let suffix = 1;
  let candidate = '';
  do { candidate = `${COMPOUND_FOLDER}/${segment}${suffix === 1 ? '' : `-${suffix}`}.md`; suffix += 1; } while (vault.getAbstractFileByPath(candidate));
  return candidate;
}
function renderCompoundContent(compound) {
  return [
    '---',
    `record_id: ${yamlString(compound.recordId)}`,
    'kind: compound',
    `compound_code: ${yamlString(compound.compoundCode)}`,
    `title: ${yamlString(compound.name || compound.compoundCode)}`,
    `name: ${yamlString(compound.name)}`,
    `project_id: ${yamlString(compound.projectId)}`,
    `project: ${yamlString(compound.project)}`,
    `smiles: ${yamlString(compound.smiles)}`,
    `formula: ${yamlString(compound.formula)}`,
    `molecular_weight: ${yamlString(compound.molecularWeight)}`,
    `status: ${yamlString(compound.status || 'active')}`,
    `created: ${yamlString(compound.created)}`,
    `updated: ${yamlString(compound.updated)}`,
    'tags:',
    '  - research/compound',
    '---',
    `# ${compound.name || compound.compoundCode}`,
    '',
    '## 基本信息',
    '',
    `化合物编号：${compound.compoundCode}`,
    '',
    '## 设计与用途',
    '',
    compound.notes || '',
    '',
    '## 合成记录',
    '',
    '## 表征',
    '',
    ''
  ].join('\n');
}
async function createCompound(app, input, generateRecordId) {
  const compoundCode = String(input?.compoundCode || '').trim();
  if (!compoundCode) throw new Error('请输入化合物编号');
  await ensureFolder(app.vault, COMPOUND_FOLDER);
  const now = new Date().toISOString();
  const compound = { recordId: generateRecordId('CMP'), compoundCode, name: String(input.name || '').trim(), projectId: String(input.projectId || '').trim(), project: String(input.project || '').trim(), smiles: String(input.smiles || '').trim(), formula: String(input.formula || '').trim(), molecularWeight: String(input.molecularWeight || '').trim(), status: String(input.status || 'active'), notes: String(input.notes || '').trim(), created: now, updated: now };
  return app.vault.create(buildCompoundPath(app.vault, compoundCode), renderCompoundContent(compound));
}
module.exports = { COMPOUND_FOLDER, buildCompoundPath, renderCompoundContent, createCompound };
