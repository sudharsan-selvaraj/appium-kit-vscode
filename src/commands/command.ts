import { ExtensionCommand } from '../models/extension-command';

export abstract class Command implements ExtensionCommand {
  constructor(private name: string) {}

  getCommandName(): string {
    return this.name;
  }

  abstract excute(...args: any): void;
}
