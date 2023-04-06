import { AppiumSessionLog } from './models/appium-session-log';

const { routeToCommandName } = require('@appium/base-driver');

export function getCommandLog(
  url: string,
  basepath: string,
  method: string,
  response: any
): AppiumSessionLog {
  const commandName = routeToCommandName(url, method, basepath) || '';
  const isSuccess = response.value === null || (response.value && !response.value.error);
  return {
    commandName: commandName.replace(/([A-Z])/g, ' $1').replace(/^./, function (str: string) {
      return str.toUpperCase();
    }),
    description: JSON.stringify(!!response ? response.value : {}),
    sessionId: '',
    isSuccess,
  };
}
