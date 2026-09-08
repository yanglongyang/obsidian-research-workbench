const DB_FOLDER = '00-博士工作台/应用数据/数据库';
const DB_FILE = `${DB_FOLDER}/records.json`;

function normalizePath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

function pathInside(filePath, folder) {
  const file = normalizePath(filePath);
  const root = normalizePath(folder);
  return file === root || file.startsWith(`${root}/`);
}

function simpleHash(value) {
  let hash = 2166136261;
  for (const char of String(value || '')) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function firstString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function recordType(filePath, frontmatter) {
  const path = normalizePath(filePath);
  if (frontmatter?.kind === 'workbench-task') return 'task';
  if (frontmatter?.kind === 'experiment' || pathInside(path, '00-博士工作台/03-实验') || pathInside(path, '实验记录')) return 'experiment';
  if (pathInside(path, '00-博士工作台/02-课题')) return 'project';
  if (pathInside(path, '00-博士工作台/04-数据')) return 'data';
  if (pathInside(path, '00-博士工作台/05-文献') || pathInside(path, '文献') || pathInside(path, '文献阅读') || pathInside(path, 'DMAC_AIE_PET_调研')) return 'literature';
  if (pathInside(path, '00-博士工作台/06-写作')) return 'writing';
  if (pathInside(path, '00-博士工作台/07-进展')) return 'progress';
  return pathInside(path, '00-博士工作台') ? 'note' : '';
}

function frontmatterTags(frontmatter) {
  const tags = frontmatter?.tags;
  if (Array.isArray(tags)) return tags.map((tag) => String(tag)).filter(Boolean);
  if (typeof tags === 'string') return tags.split(/[ ,]+/).map((tag) => tag.trim()).filter(Boolean);
  return [];
}

class ResearchDatabase {
  constructor(plugin) {
    this.plugin = plugin;
    this.app = plugin.app;
    this.records = [];
    this.lastSync = '';
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
      const type = recordType(file.path, this.app.metadataCache.getFileCache(file)?.frontmatter || {});
      if (!type) continue;
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter || {};
      const path = normalizePath(file.path);
      const tags = frontmatterTags(frontmatter);
      records.push({
        id: firstString(frontmatter.record_id) || `REC-${simpleHash(path)}`,
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
        sample: firstString(frontmatter.sample),
        dataPath: firstString(frontmatter.data_path),
        tags,
        updated: firstString(frontmatter.updated) || new Date(file.stat.mtime).toISOString(),
        size: file.stat.size
      });
    }
    return records.sort((a, b) => String(b.updated).localeCompare(String(a.updated)) || a.title.localeCompare(b.title));
  }

  async sync() {
    await this.ensureFolder();
    const records = this.collectRecords();
    const payload = JSON.stringify({ version: 1, updated: new Date().toISOString(), records }, null, 2) + '\n';
    const existing = this.app.vault.getAbstractFileByPath(DB_FILE);
    if (!existing) await this.app.vault.create(DB_FILE, payload);
    else if (existing.extension === 'json') {
      const old = await this.app.vault.read(existing);
      try {
        const oldData = JSON.parse(old);
        if (JSON.stringify(oldData.records || []) !== JSON.stringify(records)) await this.app.vault.modify(existing, payload);
      } catch (error) {
        await this.app.vault.modify(existing, payload);
      }
    }
    this.records = records;
    this.lastSync = new Date().toISOString();
    return records;
  }

  async refresh() {
    return this.sync();
  }
}

module.exports = { DB_FOLDER, DB_FILE, ResearchDatabase };
