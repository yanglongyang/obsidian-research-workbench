const DB_FOLDER = '00-博士工作台/应用数据/数据库';
const DB_FILE = `${DB_FOLDER}/records.json`;
const AUDIT_FOLDER = '00-博士工作台/应用数据/审计';
const AUDIT_FILE = `${AUDIT_FOLDER}/nmr-archive.jsonl`;
const DATABASE_SCHEMA_VERSION = 3;
const MANAGED_FOLDERS = ['00-博士工作台', '实验记录', '文献', '文献阅读', 'DMAC_AIE_PET_调研'];

function normalizePath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

function pathInside(filePath, folder) {
  const file = normalizePath(filePath);
  const root = normalizePath(folder);
  return Boolean(file && root && (file === root || file.startsWith(`${root}/`)));
}

function isManagedPath(filePath) {
  return MANAGED_FOLDERS.some((folder) => pathInside(filePath, folder));
}

function isDerivedPath(filePath) {
  const path = normalizePath(filePath);
  return path === DB_FILE || path === AUDIT_FILE || pathInside(path, DB_FOLDER) || pathInside(path, AUDIT_FOLDER);
}

function affectsManagedPath(paths) {
  return (Array.isArray(paths) ? paths : [paths])
    .filter(Boolean)
    .some((filePath) => isManagedPath(filePath) && !isDerivedPath(filePath));
}

function findDuplicateIds(records) {
  const byId = new Map();
  (Array.isArray(records) ? records : []).forEach((record) => {
    if (!record?.id) return;
    if (!byId.has(record.id)) byId.set(record.id, []);
    byId.get(record.id).push(record);
  });
  return [...byId.entries()]
    .filter(([, matches]) => matches.length > 1)
    .map(([id, matches]) => ({ id, paths: matches.map((record) => record.path) }));
}

function simpleHash(value) {
  let hash = 2166136261;
  for (const char of String(value || '')) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0').toUpperCase();
}

function firstString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function firstArray(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(/[ ,]+/).map((item) => item.trim()).filter(Boolean);
  return [];
}

function recordType(filePath, frontmatter) {
  const path = normalizePath(filePath);
  if (frontmatter?.kind === 'workbench-task') return 'task';
  if (frontmatter?.kind === 'project') return 'project';
  if (frontmatter?.kind === 'compound') return 'compound';
  if (frontmatter?.kind === 'data-asset') return 'data-asset';
  if (frontmatter?.kind === 'experiment' || pathInside(path, '00-博士工作台/03-实验') || pathInside(path, '实验记录')) return 'experiment';
  if (pathInside(path, '00-博士工作台/02-课题')) return 'project';
  if (pathInside(path, '00-博士工作台/04-数据')) return 'data';
  if (pathInside(path, '00-博士工作台/05-文献') || pathInside(path, '文献') || pathInside(path, '文献阅读') || pathInside(path, 'DMAC_AIE_PET_调研')) return 'literature';
  if (pathInside(path, '00-博士工作台/06-写作')) return 'writing';
  if (pathInside(path, '00-博士工作台/07-进展')) return 'progress';
  return pathInside(path, '00-博士工作台') ? 'note' : '';
}

const RELATION_RULES = {
  experiment: { projectId: 'project', compoundId: 'compound' },
  compound: { projectId: 'project' },
  'data-asset': { projectId: 'project', experimentId: 'experiment', compoundId: 'compound' }
};

function validateRelationships(records) {
  const list = Array.isArray(records) ? records : [];
  const byId = new Map();
  list.forEach((record) => { if (record?.id) { if (!byId.has(record.id)) byId.set(record.id, []); byId.get(record.id).push(record); } });
  const issues = [];
  const duplicateIds = [...byId.entries()].filter(([, matches]) => matches.length > 1);
  duplicateIds.forEach(([id, matches]) => matches.forEach((source) => issues.push({ type: 'duplicate_record_id', sourcePath: source.path, sourceId: source.id, field: 'record_id', targetId: id, message: `record_id 重复：${id}` })));
  let validRelationCount = 0;
  list.forEach((source) => {
    const rules = RELATION_RULES[source.type] || {};
    Object.entries(rules).forEach(([field, expectedType]) => {
      const targetId = String(source[field] || '').trim();
      if (!targetId) return;
      if (targetId === source.id) { issues.push({ type: 'self_reference', sourcePath: source.path, sourceId: source.id, field, targetId, message: `${field} 不能指向自身` }); return; }
      if (targetId.startsWith('LEGACY-')) { issues.push({ type: 'legacy_reference', sourcePath: source.path, sourceId: source.id, field, targetId, message: `${field} 仍引用旧路径 ID` }); return; }
      const matches = byId.get(targetId) || [];
      if (!matches.length) { issues.push({ type: 'missing_target', sourcePath: source.path, sourceId: source.id, field, targetId, message: `${field} 目标不存在：${targetId}` }); return; }
      if (matches.length > 1) { issues.push({ type: 'duplicate_record_id', sourcePath: source.path, sourceId: source.id, field, targetId, message: `目标 ID 重复：${targetId}` }); return; }
      if (matches[0].type !== expectedType) { issues.push({ type: 'wrong_target_type', sourcePath: source.path, sourceId: source.id, field, targetId, expectedType, actualType: matches[0].type, message: `${field} 目标类型应为 ${expectedType}` }); return; }
      validRelationCount += 1;
    });
  });
  const byUniqueId = (id, type) => {
    const matches = byId.get(id) || [];
    return matches.length === 1 && matches[0].type === type ? matches[0] : null;
  };
  const addConflict = (source, field, targetId, relatedField, expectedId, actualId, message) => issues.push({ type: 'relation_conflict', sourceId: source.id, sourcePath: source.path, field, targetId, relatedField, expectedId, actualId, message });
  list.forEach((source) => {
    if (source.type === 'experiment') {
      const compound = source.compoundId && byUniqueId(source.compoundId, 'compound');
      if (source.projectId && compound?.projectId && source.projectId !== compound.projectId) addConflict(source, 'compoundId', source.compoundId, 'projectId', source.projectId, compound.projectId, '实验关联的化合物属于其他课题');
    }
    if (source.type === 'data-asset') {
      const experiment = source.experimentId && byUniqueId(source.experimentId, 'experiment');
      const compound = source.compoundId && byUniqueId(source.compoundId, 'compound');
      if (source.projectId && experiment?.projectId && source.projectId !== experiment.projectId) addConflict(source, 'experimentId', source.experimentId, 'projectId', source.projectId, experiment.projectId, '数据资产的 project_id 与关联实验的 project_id 不一致');
      if (source.projectId && compound?.projectId && source.projectId !== compound.projectId) addConflict(source, 'compoundId', source.compoundId, 'projectId', source.projectId, compound.projectId, '数据资产关联的化合物属于其他课题');
      if (experiment?.compoundId && compound?.id && experiment.compoundId !== compound.id) addConflict(source, 'compoundId', source.compoundId, 'experiment.compoundId', experiment.compoundId, compound.id, '数据资产的实验与化合物关联不一致');
    }
  });
  return { issues, validRelationCount };
}

function identityFor(filePath, frontmatter, type) {
  const supplied = firstString(frontmatter.record_id);
  if (supplied) return { id: supplied, identitySource: 'frontmatter' };
  return { id: `LEGACY-${String(type || 'record').toUpperCase()}-${simpleHash(filePath)}`, identitySource: 'legacy-path' };
}

function frontmatterTags(frontmatter) {
  return firstArray(frontmatter?.tags);
}

class ResearchDatabase {
  constructor(plugin) {
    this.plugin = plugin;
    this.app = plugin.app;
    this.records = [];
    this.duplicateIds = [];
    this.lastSync = '';
    this.error = '';
  }

  async ensureFolder() {
    const segments = DB_FOLDER.split('/');
    let current = '';
    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      if (this.app.vault.getAbstractFileByPath(current)) continue;
      try {
        await this.app.vault.createFolder(current);
      } catch (error) {
        if (!this.app.vault.getAbstractFileByPath(current)) throw error;
      }
    }
  }

  collectRecords() {
    const records = [];
    for (const file of this.app.vault.getMarkdownFiles()) {
      if (!isManagedPath(file.path) || isDerivedPath(file.path)) continue;
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter || {};
      const type = recordType(file.path, frontmatter);
      if (!type) continue;
      const path = normalizePath(file.path);
      const identity = identityFor(path, frontmatter, type);
      records.push({
        id: identity.id,
        identitySource: identity.identitySource,
        type,
        title: firstString(frontmatter.title) || file.basename,
        path,
        folder: path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '',
        kind: firstString(frontmatter.kind),
        status: firstString(frontmatter.status),
        priority: firstString(frontmatter.priority),
        category: firstString(frontmatter.category) || firstString(frontmatter.project),
        date: firstString(frontmatter.due) || firstString(frontmatter.experiment_date) || firstString(frontmatter.date),
        project: firstString(frontmatter.project),
        projectId: firstString(frontmatter.project_id),
        compoundId: firstString(frontmatter.compound_id),
        experimentId: firstString(frontmatter.experiment_id),
        dataAssetId: firstString(frontmatter.data_asset_id),
        parentId: firstString(frontmatter.parent_id),
        relatedIds: firstArray(frontmatter.related_ids),
        sample: firstString(frontmatter.sample),
        dataPath: firstString(frontmatter.data_path),
        assetType: firstString(frontmatter.asset_type),
        compoundCode: firstString(frontmatter.compound_code),
        acquiredAt: firstString(frontmatter.acquired_at),
        tags: frontmatterTags(frontmatter),
        updated: firstString(frontmatter.updated) || new Date(file.stat.mtime).toISOString(),
        size: file.stat.size
      });
    }
    return records.sort((a, b) => String(b.updated).localeCompare(String(a.updated)) || a.title.localeCompare(b.title));
  }

  async sync() {
    this.error = '';
    this.relationshipIssues = [];
    this.validRelationCount = 0;
    try {
      await this.ensureFolder();
      const records = this.collectRecords();
      const payloadData = { version: DATABASE_SCHEMA_VERSION, updated: new Date().toISOString(), records };
      const payload = JSON.stringify(payloadData, null, 2) + '\n';
      const existing = this.app.vault.getAbstractFileByPath(DB_FILE);
      if (!existing) await this.app.vault.create(DB_FILE, payload);
      else if (existing.extension === 'json') {
        const old = await this.app.vault.read(existing);
        try {
          const oldData = JSON.parse(old);
          if (JSON.stringify(oldData.records || []) !== JSON.stringify(records) || oldData.version !== DATABASE_SCHEMA_VERSION) await this.app.vault.modify(existing, payload);
        } catch (error) {
          await this.app.vault.modify(existing, payload);
        }
      }
      this.duplicateIds = findDuplicateIds(records);
      const integrity = validateRelationships(records);
      this.relationshipIssues = integrity.issues;
      this.validRelationCount = integrity.validRelationCount;
      this.records = records;
      this.lastSync = new Date().toISOString();
      return records;
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
      console.error('[Research Workbench] database sync failed', error);
      throw error;
    }
  }

  async refresh() {
    return this.sync();
  }
}

module.exports = {
  DB_FOLDER,
  DB_FILE,
  AUDIT_FOLDER,
  AUDIT_FILE,
  DATABASE_SCHEMA_VERSION,
  MANAGED_FOLDERS,
  normalizePath,
  pathInside,
  isManagedPath,
  isDerivedPath,
  affectsManagedPath,
  findDuplicateIds,
  validateRelationships,
  simpleHash,
  recordType,
  identityFor,
  ResearchDatabase
};
