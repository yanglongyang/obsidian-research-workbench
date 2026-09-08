const PREFIX_BY_ENTITY = { project: 'PROJ-', experiment: 'EXP-', compound: 'CMP-', 'data-asset': 'DATA-', task: 'TASK-' };

function isPermanentEntityId(id, type) {
  const value = String(id || '').trim();
  const prefix = PREFIX_BY_ENTITY[type];
  return Boolean(prefix && value.startsWith(prefix) && value.length > prefix.length && !value.startsWith('LEGACY-'));
}

module.exports = { PREFIX_BY_ENTITY, isPermanentEntityId };
