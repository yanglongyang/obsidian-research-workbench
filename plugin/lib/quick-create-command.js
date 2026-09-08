async function openQuickCreateCommand(app, viewType, ViewClass, activateView) {
  let leaf = app.workspace.getLeavesOfType(viewType)[0];
  if (!leaf?.view || !(leaf.view instanceof ViewClass)) {
    await activateView();
    leaf = app.workspace.getLeavesOfType(viewType)[0];
  }
  if (leaf?.view instanceof ViewClass) leaf.view.openQuickCreate();
}

module.exports = { openQuickCreateCommand };
