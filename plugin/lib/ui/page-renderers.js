/* Mechanical page renderer boundary. Renderers receive the WorkbenchView instance
 * so existing state, helpers and modal behavior remain unchanged. */
function renderProjectPage(view, title) { return view._renderProjectPage(title); }
function renderCompoundPage(view) { return view._renderCompoundPage(); }
function renderIntegrityPage(view) { return view._renderIntegrityPage(); }
function renderExperimentPage(view) { return view._renderExperimentPage(); }
function renderResearchDatabasePage(view) { return view._renderResearchDatabasePage(); }
function renderDataPage(view) { return view._renderDataPage(); }
function renderNmrInboxPage(view) { return view._renderNmrInboxPage(); }

module.exports = { renderProjectPage, renderCompoundPage, renderIntegrityPage, renderExperimentPage, renderResearchDatabasePage, renderDataPage, renderNmrInboxPage };
