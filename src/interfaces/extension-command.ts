export interface ExtensionCommand {
  getCommandName(): string;
  excute: (...args: any) => void;
}
