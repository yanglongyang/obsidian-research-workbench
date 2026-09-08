const { recordType, identityFor } = require('../database');

const PREFIX_BY_TYPE = { task: 'TASK', experiment: 'EXP', project: 'PROJ' };

class PermanentIdMigration {
  constructor(plugin, generateRecordId) {
    this.plugin = plugin;
    this.app = plugin.app;
    this.generateRecordId = generateRecordId;
  }

  scan() {
    const items = [];
    for (const file of this.app.vault.getMarkdownFiles()) {
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter || {};
      const type = recordType(file.path, frontmatter);
      if (!PREFIX_BY_TYPE[type] || String(frontmatter.record_id || '').trim()) continue;
      const identity = identityFor(file.path, frontmatter, type);
      items.push({ file, path: file.path, type, currentId: identity.id, proposedId: this.generateRecordId(PREFIX_BY_TYPE[type]), title: String(frontmatter.title || file.basename) });
    }
    return items;
  }

  async apply(items) {
    const candidates = Array.isArray(items) ? items : [];
    const migrated = [];
    const failed = [];
    const skipped = [];
    for (const item of candidates) {
      try {
        if (!item.file || !this.app.vault.getAbstractFileByPath(item.path)) throw new Error('文件不存在，可能已被移动。');
        const latest = this.app.metadataCache.getFileCache(item.file)?.frontmatter || {};
        if (String(latest.record_id || '').trim()) { skipped.push({ ...item, reason: 'record_id 已在预览后写入' }); continue; }
        await this.app.fileManager.processFrontMatter(item.file, (data) => {
          if (!data.record_id) data.record_id = item.proposedId;
        });
        const after = this.app.metadataCache.getFileCache(item.file)?.frontmatter || {};
        if (String(after.record_id || '').trim() && after.record_id !== item.proposedId) { skipped.push({ ...item, reason: 'record_id 已在写入过程中被其他操作设置' }); continue; }
        migrated.push(item);
      } catch (error) {
        failed.push({ ...item, error: error instanceof Error ? error.message : String(error) });
        console.error('[Research Workbench] permanent ID migration failed', error);
      }
    }
    return { status: failed.length ? (migrated.length || skipped.length ? 'partial_failure' : 'failed') : 'completed', migrated, failed, skipped };
  }
}

module.exports = { PREFIX_BY_TYPE, PermanentIdMigration };
