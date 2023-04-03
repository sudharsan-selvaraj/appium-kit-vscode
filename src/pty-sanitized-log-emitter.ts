import * as vscode from 'vscode';

export class SanitizedPtyEventEmitter extends vscode.EventEmitter<string> {
  public fire(data: string) {
    super.fire(data.replace(/\n/g, '\r\n'));
  }

  public log(data: string) {
    this.fire(`${data}\r\n`);
  }
}
