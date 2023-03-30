export enum NodeModulesKeys {
  codiconCss,
  webviewElementJs,
}

export interface NodeModulesValue {
  sourcePath: string[];
  destinationPath: string[];
  fileName: string;
  includeFolder?: boolean;
}

export class NodeModulesAccessor {
  static readonly outputPath = 'dist';

  private static readonly pathMapping = new Map<NodeModulesKeys, NodeModulesValue>([
    [
      NodeModulesKeys.codiconCss,
      {
        sourcePath: ['node_modules', '@vscode', 'codicons', 'dist'],
        destinationPath: ['libs', '@vscode', 'codicons', 'dist'],
        fileName: 'codicon.css',
        includeFolder: true,
      },
    ],
    [
      NodeModulesKeys.webviewElementJs,
      {
        sourcePath: ['node_modules', '@bendera', 'vscode-webview-elements', 'dist'],
        destinationPath: ['libs', '@bendera', 'vscode-webview-elements', 'dist'],
        fileName: 'bundled.js',
        includeFolder: true,
      },
    ],
  ]);

  static getPathToOutputFile(key: NodeModulesKeys): string[] {
    const path = this.getMappedValue(key);
    return [this.outputPath, ...path.destinationPath, path.fileName];
  }

  static getPathToNodeModulesFile(key: NodeModulesKeys): NodeModulesValue {
    return this.getMappedValue(key);
  }

  private static getMappedValue(key: NodeModulesKeys): NodeModulesValue {
    const value = this.pathMapping.get(key);
    if (!value) {
      throw Error(`Path to "${key}" is not mapped.`);
    }
    return value;
  }
}
