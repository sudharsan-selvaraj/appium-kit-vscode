import _ = require('lodash');
import * as semver from 'semver';
import { exec } from 'teen_process';
import { sync as which } from 'which';

const APPIUM_BINARY = 'appium';
const SUPPORTED_APPIUM_VERSION = '>=2.0.0';

export class Appium {
  static getAppiumInstallationPath() {
    try {
      const appiumPath = which(APPIUM_BINARY);
      return appiumPath;
    } catch (err) {
      return null;
    }
  }

  static async getAppiumVersion(appiumPath: string) {
    try {
      const { stdout } = await exec(appiumPath, ['-v']);
      return stdout.trim();
    } catch (err) {
      return null;
    }
  }

  static async isVersionSupported(currVesion: string) {
    return semver.satisfies(currVesion, SUPPORTED_APPIUM_VERSION);
  }
}
