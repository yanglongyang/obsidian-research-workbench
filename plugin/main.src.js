const { Plugin } = require('obsidian');
const { VIEW_TYPE, WorkbenchView } = require('./lib/view');

module.exports = class PhDCommandCenterPlugin extends Plugin {
  async onload() {
    this.refreshTimer = null;
    this.registerView(VIEW_TYPE, (leaf) => new WorkbenchView(leaf, this));

    this.addRibbonIcon('layout-dashboard', '打开科研工作台', () => {
      void this.activateView();
    });

    this.addCommand({
      id: 'open-phd-command-center',
      name: '打开科研工作台',
      callback: () => { void this.activateView(); }
    });

    const scheduleRefresh = () => {
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = window.setTimeout(() => {
        for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
          if (leaf.view instanceof WorkbenchView) void leaf.view.refresh();
        }
      }, 250);
    };

    this.registerEvent(this.app.vault.on('create', scheduleRefresh));
    this.registerEvent(this.app.vault.on('modify', scheduleRefresh));
    this.registerEvent(this.app.vault.on('delete', scheduleRefresh));
    this.registerEvent(this.app.vault.on('rename', scheduleRefresh));
    this.register(() => window.clearTimeout(this.refreshTimer));

    this.app.workspace.onLayoutReady(() => { void this.activateView(); });
  }

  async activateView() {
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      leaf = this.app.workspace.getLeaf('tab');
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    this.app.workspace.revealLeaf(leaf);
  }

  onunload() {
    window.clearTimeout(this.refreshTimer);
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
  }
};
