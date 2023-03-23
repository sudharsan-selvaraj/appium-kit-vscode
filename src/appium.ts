import _ = require('lodash');
import * as semver from 'semver';
import * as fs from 'fs';
import * as path from 'path';
import { sync as which } from 'which';

const APPIUM_BINARY = 'appium';
const SUPPORTED_APPIUM_VERSION = '>=2.0.0';
class Appium {
  static getAppiumInstallationPath() {
    try {
      const appiumPath = which(APPIUM_BINARY);
      return appiumPath;
    } catch (err) {
      return '';
    }
  }

  static async getAppiumVersion(appiumPath: string) {
    try {
      const realFilePath = fs.realpathSync(appiumPath);
      if (fs.existsSync(realFilePath)) {
        const directory = path.join(
          realFilePath.split('node_modules')[0],
          'node_modules',
          'appium'
        );
        const pkgJson = fs.readFileSync(path.join(directory, 'package.json'), {
          encoding: 'utf-8',
        });
        return JSON.parse(pkgJson).version.trim();
      }
    } catch (err) {
      return null;
    }
  }

  static isVersionSupported(currVesion: string) {
    return semver.satisfies(
      semver.coerce(currVesion)?.version as string,
      SUPPORTED_APPIUM_VERSION
    );
  }
}

export { SUPPORTED_APPIUM_VERSION, Appium };
