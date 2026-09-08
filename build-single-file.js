const fs = require('fs');
const path = require('path');

const pluginDir = path.join(__dirname, 'plugin');
const entries = [
  ['./lib/data', path.join(pluginDir, 'lib', 'data.js')],
  ['./lib/database', path.join(pluginDir, 'lib', 'database.js')],
  ['./lib/nmr', path.join(pluginDir, 'lib', 'nmr.js')],
  ['./lib/nmr-archive-modal', path.join(pluginDir, 'lib', 'nmr-archive-modal.js')],
  ['./lib/modal', path.join(pluginDir, 'lib', 'modal.js')],
  ['./lib/experiment-modal', path.join(pluginDir, 'lib', 'experiment-modal.js')],
  ['./lib/settings', path.join(pluginDir, 'lib', 'settings.js')],
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
      .replace("require('./experiment-modal')", "require('./lib/experiment-modal')")
      .replace("require('./database')", "require('./lib/database')");
  }
  if (id === './lib/nmr') return source.replace("require('./database')", "require('./lib/database')");
  if (id === './lib/settings') return source;
  if (id === './lib/experiment-modal') return source.replace("require('./data')", "require('./lib/data')");
  if (id === './main') {
    return source
      .replace("require('./lib/view')", "require('./lib/view')")
      .replace("require('./lib/settings')", "require('./lib/settings')")
      .replace("require('./lib/database')", "require('./lib/database')");
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
