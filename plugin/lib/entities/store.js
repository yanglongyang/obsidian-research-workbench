const { PROJECT_ENTITY_FOLDER } = require('./project');
const { COMPOUND_FOLDER } = require('./compound');
const { DATA_ASSET_FOLDER } = require('./data-asset');
const { EXPERIMENT_FOLDERS } = require('../data');

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

  listProjects() { return this.list('project').filter((item) => item.id); }
  listExperiments() { return this.list('experiment').filter((item) => item.id); }
  listCompounds() { return this.list('compound').filter((item) => item.id); }
  listDataAssets() { return this.list('data-asset').filter((item) => item.id); }
}

module.exports = { EntityStore };
