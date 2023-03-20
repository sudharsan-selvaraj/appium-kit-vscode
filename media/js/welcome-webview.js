(function () {
  /** @type {import("vscode-webview").WebviewApi */
  const vscode = acquireVsCodeApi();

  function updateInfo(appiumInfo) {
    vscode.setState(appiumInfo);
    document.querySelector(
      '#appium-server-info'
    ).textContent = `Locally installed appium is detected with version ${appiumInfo.version} under path ${appiumInfo.path}`;
  }

  window.addEventListener('message', ({ data: message }) => {
    switch (message.type) {
      case 'info':
        updateInfo(message.json);
        return;
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    console.log('loaded.. sending message');
    vscode.postMessage({ type: 'update' });
  });
})();
