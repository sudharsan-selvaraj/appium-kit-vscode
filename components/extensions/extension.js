const vscode = acquireVsCodeApi();

function installExtension(type) {
  vscode.postMessage({
    type: 'install-extension',
    extensionType: type,
  });
}

function uninstallExtension(extensionName, type) {
  vscode.postMessage({
    type: 'uninstall-extension',
    extensionType: type,
    name: extensionName,
  });
}

function updateExtension(extensionName, type) {
  vscode.postMessage({
    type: 'update-extension',
    extensionType: type,
    name: extensionName,
  });
}
