(async () => {
  const vscode = acquireVsCodeApi();

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('add-new-driver').addEventListener('click', () => {
      vscode.postMessage({
        type: 'install-new-driver',
      });
    });
  });
})();
