(function () {
  const vscode = acquireVsCodeApi();
  const sections = {
    loading: 'loading',
    appiumNotFound: 'appium-not-found',
    configureAppiumPath: 'configure-appium-path',
  };

  function hideAllSection() {
    Object.values(sections).forEach(
      (section) => (document.getElementById(section).style.display = 'none')
    );
  }

  function unHideSection(sectionId) {
    console.log('Unhiding section: ', sectionId);
    document.getElementById(sections[sectionId]).style.display = 'block';
  }

  function initialize() {
    vscode.postMessage({ type: 'ready' });
  }

  function updateDetailsSection() {}

  window.addEventListener('message', (message) => {
    const event = message.data;
    switch (event.type) {
      case 'update_view':
        hideAllSection();
        if (event.section === 'configureAppiumPath') {
          updateDetailsSection(event.data);
        }
        unHideSection(event.section);
        break;
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    initialize();

    document
      .getElementById('refresh-button')
      .addEventListener('click', function () {
        vscode.postMessage({ type: 'refresh' });
      });
  });
})();
