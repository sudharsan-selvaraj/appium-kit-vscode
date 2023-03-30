const vscode = acquireVsCodeApi();

function uninstallExtension(extensionName, type) {
  vscode.postMessage({
    type: 'uninstall-extension',
    extensionType: type,
    name: extensionName,
  });
}

function installExtension(type) {
  vscode.postMessage({
    type: 'install-extension',
    extensionType: type,
  });
}
