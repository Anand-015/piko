// This worker only configures the toolbar action. Website access and service
// communication are deliberately deferred until their implementation phases.
void chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(() => {
    // A fixed diagnostic avoids logging browser context or user information.
    console.error('PIKO_SIDE_PANEL_CONFIGURATION_FAILED')
  })
