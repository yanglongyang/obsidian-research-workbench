const PREFIX_BY_ENTITY = { project: 'PROJ-', experiment: 'EXP-', compound: 'CMP-', 'data-asset': 'DATA-', task: 'TASK-' };
const FOLDERS_BY_ENTITY = { task: ['00-博士工作台/应用数据/任务'], project: ['00-博士工作台/02-课题'], experiment: ['00-博士工作台/03-实验', '实验记录'], compound: ['00-博士工作台/04-化合物'], 'data-asset': ['00-博士工作台/04-数据资产'] };

function isPermanentEntityId(id, type) {
  return validateEntityId(id, type).valid;
}

function expectedPrefixForType(type) { return PREFIX_BY_ENTITY[type] || ''; }
function validateEntityId(id, type) {
  const value = String(id || '').trim();
  const expectedPrefix = expectedPrefixForType(type);
  const valid = Boolean(expectedPrefix && value.startsWith(expectedPrefix) && value.length > expectedPrefix.length && !value.startsWith('LEGACY-'));
  return { valid, id: value, type, expectedPrefix, reason: valid ? '' : (!expectedPrefix ? 'unknown_type' : 'invalid_prefix') };
}

function normalizeEntityPath(value) { return String(value || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, ''); }
function validateEntityRecord(record) {
  const type = record?.type || record?.kind || '';
  const id = validateEntityId(record?.id, type);
  const folders = FOLDERS_BY_ENTITY[type] || [];
  const path = normalizeEntityPath(record?.path || record?.file?.path);
  const inFolder = folders.some((folder) => path === folder || path.startsWith(`${folder}/`));
  return { ...id, path, folders, entityIdValid: id.valid, validFolder: !folders.length || inFolder, valid: id.valid && (!folders.length || inFolder), reason: !id.valid ? id.reason : (!inFolder ? 'wrong_entity_folder' : '') };
}

module.exports = { PREFIX_BY_ENTITY, FOLDERS_BY_ENTITY, expectedPrefixForType, validateEntityId, validateEntityRecord, isPermanentEntityId };
