const { PROJECT_ENTITY_FOLDER } = require('./project');
const { COMPOUND_FOLDER } = require('./compound');
const { DATA_ASSET_FOLDER } = require('./data-asset');
const { EXPERIMENT_FOLDERS } = require('../data');
const { isPermanentEntityId } = require('./identity');

function text(value) { return typeof value === 'string' ? value.trim() : ''; }
function inFolder(file, folders) {
  return folders.some((folder) => file.path === folder || file.path.startsWith(`${folder}/`));
}

class EntityStore {
  constructor(plugin) { this.plugin = plugin; this.app = plugin.app; }

  list(kind) {
    const folders = kind === 'project' ? [PROJECT_ENTITY_FOLDER] : kind === 'compound' ? [COMPOUND_FOLDER] : kind === 'data-asset' ? [DATA_ASSET_FOLDER] : kind === 'experiment' ? EXPERIMENT_FOLDERS : [];
    return this.app.vault.getMarkdownFiles().map((file) => {
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter || {};
      return { file, frontmatter };
    }).filter(({ file, frontmatter }) => frontmatter.kind === kind && inFolder(file, folders)).map(({ file, frontmatter }) => ({
      file,
      kind,
      id: text(frontmatter.record_id),
      title: text(frontmatter.title) || file.basename,
      projectId: text(frontmatter.project_id),
      project: text(frontmatter.project),
      experimentId: text(frontmatter.experiment_id),
      experiment: text(frontmatter.experiment),
      compoundId: text(frontmatter.compound_id),
      compound: text(frontmatter.compound),
      compoundCode: text(frontmatter.compound_code),
      assetType: text(frontmatter.asset_type),
      status: text(frontmatter.status),
      nextAction: text(frontmatter.next_action || frontmatter.nextAction),
      date: text(frontmatter.experiment_date || frontmatter.date || frontmatter.acquired_at),
      dataPath: text(frontmatter.data_path)
    })).sort((a, b) => a.title.localeCompare(b.title));
  }

  listProjects() { return this.list('project').filter((item) => isPermanentEntityId(item.id, 'project')); }
  listExperiments() { return this.list('experiment').filter((item) => isPermanentEntityId(item.id, 'experiment')); }
  listCompounds() { return this.list('compound').filter((item) => isPermanentEntityId(item.id, 'compound')); }
  listDataAssets() { return this.list('data-asset').filter((item) => isPermanentEntityId(item.id, 'data-asset')); }

  getById(id, expectedKind = '') {
    const items = expectedKind ? this.list(expectedKind) : ['project', 'experiment', 'compound', 'data-asset'].flatMap((kind) => this.list(kind));
    const matches = items.filter((item) => isPermanentEntityId(item.id, expectedKind || ({ project: 'project', experiment: 'experiment', compound: 'compound', 'data-asset': 'data-asset' }[item.kind] || '') ) && item.id === id);
    return matches.length === 1 ? matches[0] : null;
  }
}

module.exports = { EntityStore };
