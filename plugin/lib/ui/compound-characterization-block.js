const { Notice } = require('obsidian');
const { normalizeCharacterizationLinks, openExternalPath } = require('../entities/compound-characterization');
const { CompoundCharacterizationModal } = require('../modals/compound-characterization-modal');

function renderCharacterizationBlock(plugin, sourcePath, container) {
  const file = plugin.app.vault.getAbstractFileByPath(sourcePath);
  if (!file) return void container.createDiv({ cls: 'phdcc-characterization-empty', text: '无法定位当前化合物笔记。' });
  const frontmatter = plugin.app.metadataCache.getFileCache(file)?.frontmatter || {};
  const links = normalizeCharacterizationLinks(frontmatter.characterization_links);
  const root = container.createDiv({ cls: 'phdcc-characterization-block' });

  const head = root.createDiv({ cls: 'phdcc-characterization-block-head' });
  head.createDiv({ cls: 'phdcc-characterization-block-title', text: links.length ? `已关联表征 ${links.length} 项` : '尚未关联表征文件' });
  const manage = head.createEl('button', { cls: 'phdcc-characterization-manage', text: links.length ? '管理关联' : '+ 关联表征文件', attr: { type: 'button' } });
  manage.addEventListener('click', () => {
    new CompoundCharacterizationModal(plugin.app, file, {
      links,
      onSaved: () => {
        root.empty();
        renderCharacterizationBlock(plugin, sourcePath, root);
      }
    }).open();
  });

  if (!links.length) return;
  const list = root.createDiv({ cls: 'phdcc-characterization-block-list' });
  links.forEach((link) => {
    const row = list.createDiv({ cls: 'phdcc-characterization-block-row' });
    const copy = row.createDiv({ cls: 'phdcc-characterization-block-copy' });
    copy.createDiv({ cls: 'phdcc-characterization-block-label', text: link.label });
    copy.createDiv({ cls: 'phdcc-characterization-block-path', text: link.path });
    const open = row.createEl('button', { text: '打开', attr: { type: 'button' } });
    open.addEventListener('click', async () => {
      try { await openExternalPath(link.path); }
      catch (error) { new Notice(error instanceof Error ? error.message : '无法打开表征文件'); }
    });
  });
}

module.exports = { renderCharacterizationBlock };
