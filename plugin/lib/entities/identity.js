const PREFIX_BY_ENTITY = { project: 'PROJ-', experiment: 'EXP-', compound: 'CMP-', 'data-asset': 'DATA-', task: 'TASK-' };

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

module.exports = { PREFIX_BY_ENTITY, expectedPrefixForType, validateEntityId, isPermanentEntityId };
