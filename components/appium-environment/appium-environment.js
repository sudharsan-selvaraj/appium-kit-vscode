(function () {
  const vscode = acquireVsCodeApi();

  window.addEventListener('message', (message) => {
    const event = message.data;
    switch (event.type) {
      case 'update_view':
        if (activeSection !== event.section) {
          hideAllSections();
        }
        if (typeof sections[event.section].onUpdate === 'function') {
          sections[event.section].onUpdate(event.data);
        }
        unHideSection(event.section);
        vscode.setState({
          section: event.section,
          data: event.data,
        });
        break;
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('appium-executable').addEventListener('vsc-change', (event) => {
      console.log(event);
      vscode.postMessage({
        type: 'select-appium-executable',
        index: event.detail.selectedIndex,
      });
    });

    document.getElementById('appium-home').addEventListener('vsc-change', (event) => {
      console.log(event);
      vscode.postMessage({
        type: 'select-appium-home',
        index: event.detail.selectedIndex,
      });
    });
  });
})();
