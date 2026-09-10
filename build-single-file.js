const fs = require('fs');
const path = require('path');

const pluginDir = path.join(__dirname, 'plugin');
const entries = [
  ['./lib/data', path.join(pluginDir, 'lib', 'data.js')],
  ['./lib/database', path.join(pluginDir, 'lib', 'database.js')],
  ['./lib/entities/project', path.join(pluginDir, 'lib', 'entities', 'project.js')],
  ['./lib/entities/compound', path.join(pluginDir, 'lib', 'entities', 'compound.js')],
  ['./lib/entities/data-asset', path.join(pluginDir, 'lib', 'entities', 'data-asset.js')],
  ['./lib/entities/nmr-ledger', path.join(pluginDir, 'lib', 'entities', 'nmr-ledger.js')],
  ['./lib/entities/identity', path.join(pluginDir, 'lib', 'entities', 'identity.js')],
  ['./lib/ui/page-renderers', path.join(pluginDir, 'lib', 'ui', 'page-renderers.js')],
  ['./lib/entities/store', path.join(pluginDir, 'lib', 'entities', 'store.js')],
  ['./lib/migrations/permanent-id', path.join(pluginDir, 'lib', 'migrations', 'permanent-id.js')],
  ['./lib/nmr', path.join(pluginDir, 'lib', 'nmr.js')],
  ['./lib/nmr-archive-modal', path.join(pluginDir, 'lib', 'nmr-archive-modal.js')],
  ['./lib/nmr-delete-modal', path.join(pluginDir, 'lib', 'nmr-delete-modal.js')],
  ['./lib/work-queue', path.join(pluginDir, 'lib', 'work-queue.js')],
  ['./lib/modal', path.join(pluginDir, 'lib', 'modal.js')],
  ['./lib/experiment-modal', path.join(pluginDir, 'lib', 'experiment-modal.js')],
  ['./lib/settings', path.join(pluginDir, 'lib', 'settings.js')],
  ['./lib/quick-create-modal', path.join(pluginDir, 'lib', 'quick-create-modal.js')],
  ['./lib/quick-create-command', path.join(pluginDir, 'lib', 'quick-create-command.js')],
  ['./lib/modals/project-modal', path.join(pluginDir, 'lib', 'modals', 'project-modal.js')],
  ['./lib/modals/compound-modal', path.join(pluginDir, 'lib', 'modals', 'compound-modal.js')],
  ['./lib/modals/data-asset-modal', path.join(pluginDir, 'lib', 'modals', 'data-asset-modal.js')],
  ['./lib/modals/migration-modal', path.join(pluginDir, 'lib', 'modals', 'migration-modal.js')],
  ['./lib/modals/nmr-ledger-migration-modal', path.join(pluginDir, 'lib', 'modals', 'nmr-ledger-migration-modal.js')],
  ['./lib/view', path.join(pluginDir, 'lib', 'view.js')],
  ['./main', path.join(pluginDir, 'main.src.js')]
];

function normalizeLocalRequires(id, source) {
  if (id === './lib/modal') return source.replace("require('./data')", "require('./lib/data')");
  if (id === './lib/view') {
    return source
      .replace("require('./data')", "require('./lib/data')")
      .replace("require('./modal')", "require('./lib/modal')")
      .replace("require('./nmr')", "require('./lib/nmr')")
      .replace("require('./nmr-archive-modal')", "require('./lib/nmr-archive-modal')")
      .replace("require('./nmr-delete-modal')", "require('./lib/nmr-delete-modal')")
      .replace("require('./work-queue')", "require('./lib/work-queue')")
      .replace("require('./quick-create-modal')", "require('./lib/quick-create-modal')")
      .replace("require('./experiment-modal')", "require('./lib/experiment-modal')")
      .replace("require('./database')", "require('./lib/database')")
      .replace("require('./entities/store')", "require('./lib/entities/store')")
      .replace("require('./modals/project-modal')", "require('./lib/modals/project-modal')")
      .replace("require('./modals/compound-modal')", "require('./lib/modals/compound-modal')")
      .replace("require('./modals/data-asset-modal')", "require('./lib/modals/data-asset-modal')")
      .replace("require('./modals/migration-modal')", "require('./lib/modals/migration-modal')")
      .replace("require('./modals/nmr-ledger-migration-modal')", "require('./lib/modals/nmr-ledger-migration-modal')")
      .replace("require('./ui/page-renderers')", "require('./lib/ui/page-renderers')");
  }
  if (id === './lib/ui/page-renderers') return source;
  if (id === './lib/entities/store') {
    return source
      .replace("require('./project')", "require('./lib/entities/project')")
      .replace("require('./compound')", "require('./lib/entities/compound')")
      .replace("require('./data-asset')", "require('./lib/entities/data-asset')")
      .replace("require('./identity')", "require('./lib/entities/identity')")
      .replace("require('../data')", "require('./lib/data')");
  }
  if (id === './lib/migrations/permanent-id') {
    return source.replace("require('../database')", "require('./lib/database')");
  }
  if (id === './lib/modals/project-modal') return source.replace("require('../entities/project')", "require('./lib/entities/project')").replace("require('../data')", "require('./lib/data')");
  if (id === './lib/modals/compound-modal') return source.replace("require('../entities/compound')", "require('./lib/entities/compound')").replace("require('../data')", "require('./lib/data')");
  if (id === './lib/modals/data-asset-modal') return source.replace("require('../entities/data-asset')", "require('./lib/entities/data-asset')").replace("require('../data')", "require('./lib/data')");
  if (id === './lib/modals/migration-modal') return source.replace("require('../migrations/permanent-id')", "require('./lib/migrations/permanent-id')").replace("require('../data')", "require('./lib/data')");
  if (id === './lib/modals/nmr-ledger-migration-modal') return source.replace("require('../entities/nmr-ledger')", "require('./lib/entities/nmr-ledger')");
  if (id === './lib/nmr') return source.replace("require('./database')", "require('./lib/database')").replace("require('./entities/nmr-ledger')", "require('./lib/entities/nmr-ledger')").replace("require('./data')", "require('./lib/data')");
  if (id === './lib/entities/nmr-ledger') return source.replace("require('./data-asset')", "require('./lib/entities/data-asset')");
  if (id === './lib/settings') return source;
  if (id === './lib/quick-create-modal') return source;
  if (id === './lib/quick-create-command') return source;
  if (id === './lib/experiment-modal') return source.replace("require('./data')", "require('./lib/data')");
  if (id === './main') {
    return source
      .replace("require('./lib/view')", "require('./lib/view')")
      .replace("require('./lib/settings')", "require('./lib/settings')")
      .replace("require('./lib/database')", "require('./lib/database')")
      .replace("require('./lib/quick-create-command')", "require('./lib/quick-create-command')");
  }
  return source;
}

const factories = entries.map(([id, file]) => {
  const source = normalizeLocalRequires(id, fs.readFileSync(file, 'utf8'));
  return `${JSON.stringify(id)}: function (module, exports, require) {\n${source}\n}`;
});

const bundle = `// Generated from the reviewed source modules in ./lib.
// Obsidian community plugins use a single CommonJS entry file.
const __phdccNativeRequire = require;
const __phdccFactories = {
${factories.join(',\n')}
};
const __phdccCache = Object.create(null);
function __phdccLoad(id) {
  if (__phdccCache[id]) return __phdccCache[id].exports;
  const factory = __phdccFactories[id];
  if (!factory) throw new Error('Unknown bundled module: ' + id);
  const module = { exports: {} };
  __phdccCache[id] = module;
  factory(module, module.exports, (request) => {
    if (request === 'obsidian' || request === 'fs/promises' || request === 'path' || request === 'child_process') return __phdccNativeRequire(request);
    return __phdccLoad(request);
  });
  return module.exports;
}
module.exports = __phdccLoad('./main');
`;

fs.writeFileSync(path.join(pluginDir, 'main.js'), bundle, 'utf8');
