import * as yaml from 'yaml';
import { lilconfig } from 'lilconfig';

const jsonLoader = (filepath: string, content: string) => {
  try {
    return JSON.parse(content);
  } catch (err) {}
};

const yamlLoader = (filepath: string, content: string) => {
  try {
    const parsed = yaml.parse(content);
    return typeof parsed === 'object' ? parsed : undefined;
  } catch (err) {}
};

const lc = lilconfig('appium-vscode', {
  loaders: {
    '.yaml': yamlLoader,
    '.yml': yamlLoader,
    '.json': jsonLoader,
    noExt: jsonLoader,
  },
});

export async function readConfigFile(configPath: string) {
  return (await lc.load(configPath))?.config;
}
