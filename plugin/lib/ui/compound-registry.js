const { Notice } = require('obsidian');

function cleanLink(link) {
  return String(link || '').split('#')[0].split('|')[0].trim();
}

function resolvePath(app, link, sourcePath) {
  if (!link) return null;
  if (typeof app?.metadataCache?.getFirstLinkpathDest === 'function') return app.metadataCache.getFirstLinkpathDest(link, sourcePath || '') || null;
  return app?.vault?.getAbstractFileByPath?.(link) || null;
}

function isManagedPreviewPath(file) {
  return Boolean(file?.path && /(^|\/)CD-[^/]+-preview\.png$/i.test(file.path));
}

function pairedSourceExists(app, previewFile) {
  const sourcePath = previewFile.path.replace(/-preview\.png$/i, '-source.cdx');
  return Boolean(app?.vault?.getAbstractFileByPath?.(sourcePath));
}

function resolveCompoundStructure(app, compound) {
  const explicit = cleanLink(compound?.structurePreview);
  if (explicit) {
    const file = resolvePath(app, explicit, compound?.file?.path);
    return file ? { status: 'resolved', previewPath: file.path, candidates: [file.path] } : { status: 'broken', previewPath: explicit, candidates: [] };
  }
  const cache = compound?.file && app?.metadataCache?.getFileCache?.(compound.file);
  const candidates = [...new Set((cache?.embeds || []).map((embed) => resolvePath(app, cleanLink(embed.link), compound.file.path)).filter((file) => isManagedPreviewPath(file) && pairedSourceExists(app, file)).map((file) => file.path))];
  if (candidates.length === 0) return { status: 'missing', previewPath: '', candidates };
  if (candidates.length > 1) return { status: 'ambiguous', previewPath: '', candidates };
  return { status: 'resolved', previewPath: candidates[0], candidates };
}

function naturalCompoundSort(items) {
  return [...(items || [])].sort((a, b) => String(a.compoundCode || a.title || '').localeCompare(String(b.compoundCode || b.title || ''), undefined, { numeric: true, sensitivity: 'base' }));
}

function countCompoundRelations(records) {
  const experimentCounts = new Map();
  const dataAssetCounts = new Map();
  (records || []).forEach((record) => {
    if (!record?.compoundId) return;
    const target = record.type === 'experiment' ? experimentCounts : record.type === 'data-asset' ? dataAssetCounts : null;
    if (target) target.set(record.compoundId, (target.get(record.compoundId) || 0) + 1);
  });
  return { experimentCounts, dataAssetCounts };
}

function resourcePath(app, file) {
  if (typeof app?.vault?.getResourcePath === 'function') return app.vault.getResourcePath(file);
  if (typeof app?.vault?.adapter?.getResourcePath === 'function') return app.vault.adapter.getResourcePath(file.path);
  return file?.path || '';
}

async function copySmiles(compound) {
  const smiles = String(compound?.smiles || '').trim();
  if (!smiles) return;
  try {
    if (!globalThis.navigator?.clipboard?.writeText) throw new Error('clipboard unavailable');
    await globalThis.navigator.clipboard.writeText(smiles);
    new Notice('SMILES 已复制');
  } catch (error) {
    new Notice('SMILES 复制失败');
  }
}

function makeInteractive(element, handler) {
  element.setAttr('role', 'button'); element.setAttr('tabindex', '0'); element.addEventListener('click', handler);
  element.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handler(event); } });
  return element;
}

function renderStructureCell(view, row, compound, resolution) {
  const cell = row.createDiv({ cls: 'phdcc-compound-cell phdcc-compound-structure' });
  if (resolution.status === 'resolved') {
    const file = view.app.vault.getAbstractFileByPath(resolution.previewPath);
    if (!file) return void cell.createDiv({ cls: 'phdcc-compound-placeholder is-broken', text: '结构文件缺失' });
    const image = cell.createEl('img', { cls: 'phdcc-compound-structure-image', attr: { alt: `${compound.compoundCode || compound.title} structure`, 'data-path': file.path } });
    image.src = `${resourcePath(view.app, file)}${file.stat?.mtime ? `?mtime=${file.stat.mtime}` : ''}`;
    image.addEventListener('error', () => { image.remove(); cell.createDiv({ cls: 'phdcc-compound-placeholder is-broken', text: '结构文件缺失' }); });
    if (!view.compoundPreviewImages) view.compoundPreviewImages = new Map();
    if (!view.compoundPreviewImages.has(file.path)) view.compoundPreviewImages.set(file.path, new Set());
    view.compoundPreviewImages.get(file.path).add(image);
    return;
  }
  const text = resolution.status === 'ambiguous' ? '检测到多个结构式' : resolution.status === 'broken' ? '结构文件缺失' : '未添加结构式';
  const placeholder = cell.createDiv({ cls: `phdcc-compound-placeholder is-${resolution.status}`, text });
  if (resolution.status === 'ambiguous') placeholder.createDiv({ cls: 'phdcc-compound-placeholder-detail', text: '请在 frontmatter 指定 structure_preview' });
}

function installPreviewListener(view) {
  if (view.compoundPreviewListenerInstalled || !view.app?.vault?.on || typeof view.registerEvent !== 'function') return;
  view.compoundPreviewListenerInstalled = true;
  view.registerEvent(view.app.vault.on('modify', (file) => {
    const images = view.compoundPreviewImages?.get(file?.path);
    if (!images?.size) return;
    const src = `${resourcePath(view.app, file)}${file.stat?.mtime ? `?mtime=${file.stat.mtime}` : ''}`;
    images.forEach((image) => { image.src = src; });
  }));
}

function renderCompoundRegistry(view, compounds, options = {}) {
  // Re-rendering replaces the DOM; keep the modify listener scoped to the
  // images currently visible in this registry rather than retaining stale
  // nodes from previous pages/tabs.
  view.compoundPreviewImages = new Map();
  installPreviewListener(view);
  const items = naturalCompoundSort(compounds);
  const root = options.container || view.pageEl.createDiv({ cls: 'phdcc-compound-registry' });
  const header = root.createDiv({ cls: 'phdcc-compound-header', attr: { role: 'row' } });
  ['结构式', '化合物', '相关课题', '分子量', '操作'].forEach((label) => header.createDiv({ cls: 'phdcc-compound-cell', text: label }));
  items.forEach((compound) => {
    const row = root.createDiv({ cls: 'phdcc-compound-row', attr: { role: 'row' } });
    const resolution = resolveCompoundStructure(view.app, compound);
    renderStructureCell(view, row, compound, resolution);
    const identity = row.createDiv({ cls: 'phdcc-compound-cell phdcc-compound-identity' });
    const code = identity.createDiv({ cls: 'phdcc-compound-code', text: compound.compoundCode || compound.title });
    makeInteractive(code, () => void view.openFile(compound.file));
    identity.createDiv({ cls: 'phdcc-record-id', text: compound.id });
    const project = row.createDiv({ cls: `phdcc-compound-cell phdcc-compound-project${compound.project ? '' : ' is-muted'}`, text: compound.project || '未归属课题' });
    const molecularWeight = row.createDiv({ cls: `phdcc-compound-cell phdcc-compound-molecular-weight${compound.molecularWeight ? '' : ' is-muted'}`, text: compound.molecularWeight || '—' });
    const actions = row.createDiv({ cls: 'phdcc-compound-cell phdcc-compound-actions' });
    const copy = actions.createEl('button', { cls: 'phdcc-row-action phdcc-copy-smiles', text: '复制 SMILES', attr: { type: 'button', title: compound.smiles ? '复制 SMILES' : '未填写 SMILES' } });
    if (!compound.smiles) copy.disabled = true;
    copy.addEventListener('click', () => void copySmiles(compound));
    const open = actions.createEl('button', { cls: 'phdcc-row-action', text: '打开', attr: { type: 'button' } });
    open.addEventListener('click', () => void view.openFile(compound.file));
    if (compound.file) view.addTrashAction(actions, compound.file, { title: compound.title, recordId: compound.id });
  });
  if (!items.length) root.createDiv({ cls: 'phdcc-compound-placeholder', text: '暂无化合物记录' });
  return root;
}

module.exports = { resolveCompoundStructure, naturalCompoundSort, countCompoundRelations, renderCompoundRegistry, resourcePath, copySmiles };
