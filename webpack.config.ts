//@ts-check

import { NodeModulesAccessor, NodeModulesKeys } from './src/build';
import * as CopyPlugin from 'copy-webpack-plugin';
import * as webpack from 'webpack';
const path = require('path');

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

function copyNodeModulesFiles(): CopyPlugin {
  const files: NodeModulesKeys[] = Object.keys(NodeModulesKeys)
    .filter((key) => !isNaN(Number(key)))
    .map((key) => Number(key));
  const copies: CopyPlugin.ObjectPattern[] = files.map((file) => {
    const value = NodeModulesAccessor.getPathToNodeModulesFile(file);
    let sourcePath;
    let destinationPath;
    if (value.includeFolder) {
      sourcePath = path.join(...value.sourcePath);
      destinationPath = path.join(...value.destinationPath);
    } else {
      sourcePath = path.join(...value.sourcePath, value.fileName);
      destinationPath = path.join(...value.destinationPath, value.fileName);
    }
    return {
      from: sourcePath,
      to: destinationPath,
    };
  });
  return new CopyPlugin({
    patterns: copies,
  });
}

/** @type WebpackConfig */
const extensionConfig = {
  target: 'node', // VS Code extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
  mode: 'none', // this leaves the source code as close as possible to the original (when packaging we set this to 'production')

  entry: './src/extension.ts', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  output: {
    // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
  },
  externals: {
    vscode: 'commonjs vscode', // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
    // modules added here also need to be added in the .vscodeignore file
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: ['.ts', '.js'],
    alias: {
      handlebars: path.resolve(__dirname, 'node_modules', 'handlebars', 'dist', 'handlebars.js'),
    },
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
          },
        ],
      },
    ],
  },
  devtool: 'nosources-source-map',
  infrastructureLogging: {
    level: 'log', // enables logging required for problem matchers
  },
  plugins: [
    copyNodeModulesFiles(),
    new webpack.IgnorePlugin({
      resourceRegExp: /spdx-(exceptions|license-ids)/,
    }),
    new webpack.WatchIgnorePlugin({
      paths: [path.resolve(__dirname, 'dist')],
    }),
  ],
};
module.exports = [extensionConfig];
