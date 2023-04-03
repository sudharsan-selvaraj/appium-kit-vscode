import * as vscode from 'vscode';
export type Consumer<T> = (args: T) => void | Promise<void>;
export interface AppiumHome {
  name: string;
  path: string;
  isActive?: boolean;
}

export enum AppiumSource {
  global = 'global',
  workspace = 'workspace',
}

export enum ConfigDirectorSource {
  global = 'global',
  workspace = 'workspace',
}

export interface AppiumBinary {
  version: string;
  path: string;
  executable: string;
  source: AppiumSource;
  isSupported: boolean;
  isActive?: boolean;
}

export interface ConfigDirectory {
  name: ConfigDirectorSource;
  uri: vscode.Uri;
  pattern: vscode.GlobPattern;
}

export interface ConfigFile {
  uri: vscode.Uri;
  isValid: boolean;
  config: Record<string, any>;
  directory: ConfigDirectory['name'];
}

export interface AppiumExtension {
  type: ExtensionType;
  name: string;
  installSpec?: string;
  packageName: string;
  version: string;
  updates: {
    safe?: string;
    force?: string;
  };
  isDeleting: boolean;
  isUpdating: boolean;
  source: 'npm' | 'github' | 'local' | 'git';
  description?: string;
  path: string;
  platforms?: string[];
}

export type ExtensionType = 'driver' | 'plugin';

export enum AppiumServerSatus {
  running,
  starting,
  stopped,
}
