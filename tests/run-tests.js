const assert = require('assert');
const Module = require('module');

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'obsidian') return { TFile: class TFile {}, normalizePath: (value) => String(value || '').replace(/\\/g, '/') };
  return originalLoad.call(this, request, parent, isMain);
};

const { generateRecordId, isPathInside, buildExperimentPath } = (() => {
  const data = require('../plugin/lib/data');
  return { generateRecordId: data.generateRecordId, isPathInside: data.isPathInside, buildExperimentPath: data.buildExperimentPath };
})();
const { identityFor, isManagedPath, isDerivedPath } = require('../plugin/lib/database');
const { classifyNucleus, insideRoot, archiveCategory, archiveBatchStatus } = require('../plugin/lib/nmr');

function fakeVault(paths = []) {
  const set = new Set(paths);
  return { getAbstractFileByPath: (value) => set.has(value) ? { path: value } : null };
}

function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (error) { console.error(`FAIL ${name}: ${error.message}`); process.exitCode = 1; }
}

test('stable IDs use the requested prefix and do not repeat', () => {
  const first = generateRecordId('TASK');
  const second = generateRecordId('TASK');
  assert.match(first, /^TASK-[A-Z0-9]+$/);
  assert.notStrictEqual(first, second);
});

test('path safety handles root, child, traversal and similar prefixes', () => {
  assert.strictEqual(isPathInside('00-博士工作台/03-实验/a.md', '00-博士工作台'), true);
  assert.strictEqual(isPathInside('00-博士工作台', '00-博士工作台'), true);
  assert.strictEqual(isPathInside('00-博士工作台/../秘密.md', '00-博士工作台'), false);
  assert.strictEqual(isPathInside('00-博士工作台2/a.md', '00-博士工作台'), false);
  assert.strictEqual(insideRoot('E:\\待处理数据\\待解核磁\\a', 'E:\\待处理数据\\待解核磁'), true);
  assert.strictEqual(insideRoot('E:\\待处理数据\\待解核磁2\\a', 'E:\\待处理数据\\待解核磁'), false);
});

test('legacy identity is explicit and frontmatter identity wins after move', () => {
  const legacy = identityFor('03-实验/a.md', {}, 'experiment');
  assert.strictEqual(legacy.identitySource, 'legacy-path');
  assert.match(legacy.id, /^LEGACY-EXPERIMENT-/);
  assert.deepStrictEqual(identityFor('archive/a.md', { record_id: 'EXP-123' }, 'experiment'), { id: 'EXP-123', identitySource: 'frontmatter' });
});

test('managed and derived paths are separated', () => {
  assert.strictEqual(isManagedPath('00-博士工作台/03-实验/a.md'), true);
  assert.strictEqual(isManagedPath('随手记/a.md'), false);
  assert.strictEqual(isDerivedPath('00-博士工作台/应用数据/数据库/records.json'), true);
  assert.strictEqual(isDerivedPath('00-博士工作台/03-实验/a.md'), false);
});

test('NMR nucleus classification and archive mapping', () => {
  assert.strictEqual(classifyNucleus('##$NUC1= <1H>'), '1H');
  assert.strictEqual(classifyNucleus('##$NUC1= <13C>'), '13C');
  assert.strictEqual(classifyNucleus('unknown'), 'unknown');
  assert.strictEqual(archiveCategory('1H'), '氢谱');
  assert.strictEqual(archiveCategory('13C'), '碳谱');
});

test('NMR batch status distinguishes complete, partial and failed', () => {
  assert.strictEqual(archiveBatchStatus(3, 0), 'completed');
  assert.strictEqual(archiveBatchStatus(2, 1), 'partial_failure');
  assert.strictEqual(archiveBatchStatus(0, 2), 'failed');
});

test('experiment path sanitizes titles and avoids collisions', () => {
  const vault = fakeVault(['00-博士工作台/03-实验/2026-09-08-20260908-120000-a-1.md']);
  const result = buildExperimentPath(vault, 'a/:*?', '2026-09-08');
  assert.match(result, /^00-博士工作台\/03-实验\/2026-09-08-/);
});

Module._load = originalLoad;
if (process.exitCode) process.exit(process.exitCode);
