const PROJECT_ENTITY_FOLDER = '00-博士工作台/02-课题';

function yamlString(value) { return JSON.stringify(String(value ?? '')); }

function sanitizeSegment(value) {
  const clean = String(value || '').replace(/[<>:"/\\|?*]/g, '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 64);
  return clean || 'project';
}

async function ensureFolder(vault, folder) {
  let current = '';
  for (const segment of folder.split('/')) {
    current = current ? `${current}/${segment}` : segment;
    if (vault.getAbstractFileByPath(current)) continue;
    try { await vault.createFolder(current); } catch (error) {
      if (!vault.getAbstractFileByPath(current)) throw error;
    }
  }
}

function buildProjectPath(vault, title) {
  const segment = sanitizeSegment(title);
  let suffix = 1;
  let candidate = '';
  do {
    candidate = `${PROJECT_ENTITY_FOLDER}/${segment}${suffix === 1 ? '' : `-${suffix}`}.md`;
    suffix += 1;
  } while (vault.getAbstractFileByPath(candidate));
  return candidate;
}

function renderProjectContent(project) {
  return [
    '---',
    `record_id: ${yamlString(project.recordId)}`,
    'kind: project',
    `title: ${yamlString(project.title)}`,
    `status: ${yamlString(project.status || 'active')}`,
    `description: ${yamlString(project.description)}`,
    `stage: ${yamlString(project.stage)}`,
    `next_action: ${yamlString(project.nextAction)}`,
    `created: ${yamlString(project.created)}`,
    `updated: ${yamlString(project.updated)}`,
    'tags:',
    '  - research/project',
    '---',
    `# ${project.title}`,
    '',
    '## 目标与范围',
    '',
    project.description || '',
    '',
    '## 下一步',
    '',
    project.nextAction || '',
    ''
  ].join('\n');
}

async function createProject(app, input, generateRecordId) {
  const title = String(input?.title || '').trim();
  if (!title) throw new Error('请输入课题名称');
  await ensureFolder(app.vault, PROJECT_ENTITY_FOLDER);
  const now = new Date().toISOString();
  const project = { recordId: generateRecordId('PROJ'), title, status: String(input.status || 'active'), description: String(input.description || '').trim(), stage: String(input.stage || '').trim(), nextAction: String(input.nextAction || '').trim(), created: now, updated: now };
  return app.vault.create(buildProjectPath(app.vault, title), renderProjectContent(project));
}

module.exports = { PROJECT_ENTITY_FOLDER, buildProjectPath, renderProjectContent, createProject };
