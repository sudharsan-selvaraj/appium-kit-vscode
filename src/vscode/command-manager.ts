import { ExtensionCommand } from '../interfaces/extension-command';
import * as vscode from 'vscode';

export class CommandManager {
  static registerCommand(command: ExtensionCommand) {
    vscode.commands.registerCommand(command.getCommandName(), (args) => {
      command.excute(args);
    });
  }

  static registerCommands(commands: ExtensionCommand[]) {
    commands.forEach(CommandManager.registerCommand);
  }
}
