import * as loki from 'lokijs';
import * as path from 'path';
import _ = require('lodash');
import { ExtensionContext } from 'vscode';
import { AppiumHome, AppiumBinary } from '../types';
import { EXTENSIONS_FILES_RETAIVE_PATH } from '../constants';
import * as fs from 'fs';
const lfsa = require('lokijs/src/loki-fs-structured-adapter');

export interface DatabaseCollections {
  appiumHome: Collection<AppiumHome>;
  appiumBinary: Collection<AppiumBinary>;
}

const RELATIVE_DB_PATH = path.join(EXTENSIONS_FILES_RETAIVE_PATH, 'database');

function initializeDb(context: ExtensionContext): Promise<DatabaseCollections> {
  return new Promise((resolve) => {
    const adapter = new lfsa();
    const collections: any = {};
    const pathToDataBase = path.join(context.extensionUri.fsPath, RELATIVE_DB_PATH);
    if (!fs.existsSync(pathToDataBase)) {
      fs.mkdirSync(pathToDataBase, { recursive: true });
    }
    const database = new loki(path.join(pathToDataBase, 'appium-kit.db'), {
      adapter: adapter,
      autoload: true,
      autoloadCallback: () => {
        ['appiumHome', 'appiumBinary'].forEach((table) => {
          collections[table as keyof DatabaseCollections] =
            database.getCollection(table) || database.addCollection(table);
        });
        resolve(collections);
      },
      autosave: true,
      autosaveInterval: 4000,
    });
  });
}

export { initializeDb };
