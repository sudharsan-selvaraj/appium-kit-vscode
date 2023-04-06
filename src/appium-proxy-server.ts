import * as http from 'http';
import * as httpProxy from 'http-proxy';
import * as bodyparser from 'body-parser';
import * as yargs from 'yargs';
import { AppiumIpcMessage } from './appium-ipc-event';
import getPort from 'get-port';
export interface AppiumLaunchOption {
  appiumPort: number;
  proxyPort: number;
  address: string;
  configPath: string;
  appiumHome: string;
  appiumModulePath: string;
  basePath: string;
}

const sendMessage = (event: AppiumIpcMessage<any>) => {
  if (process.send) {
    process.send(event);
  }
};

const dynamicRequire = (path: string) => {
  return eval(`require('${path}');`); // Ensure Webpack does not analyze the require statement
};

function getSessionIdFromUrl(url: string) {
  const SESSION_ID_PATTERN = /\/session\/([^/]+)/;
  const match = SESSION_ID_PATTERN.exec(url);
  if (match) {
    return match[1];
  }
  return null;
}

const parseCliOptions = (args: Array<string>): AppiumLaunchOption => {
  yargs.options({
    appiumPort: {
      number: true,
      required: true,
    },
    proxyPort: {
      number: true,
      required: true,
    },
    address: {
      number: true,
      required: true,
    },
    configPath: {
      string: true,
      required: true,
    },
    appiumHome: {
      string: true,
      required: true,
    },
    appiumModulePath: {
      string: true,
      required: true,
    },
    basePath: {
      string: true,
      required: true,
    },
  });

  return yargs(args).parse() as any;
};

const isCreateSessionCommand = (method: string, path: string) => {
  return method.toLowerCase() === 'post' && path.endsWith('session');
};

const isDeleteCommand = (method: string, path: string) => {
  return (
    method.toLowerCase() === 'delete' && path.endsWith(`session/${getSessionIdFromUrl(path || '')}`)
  );
};

const patchRequestBody = (
  proxyRequest: http.ClientRequest,
  request: http.IncomingMessage & { body?: any },
  response: http.ServerResponse
) => {
  if (!!request.body) {
    const contentType = <string>proxyRequest.getHeader('Content-Type');
    const writeBody = (bodyData: string) => {
      proxyRequest.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyRequest.write(bodyData);
    };
    if (!!contentType && contentType.includes('application/json')) {
      writeBody(JSON.stringify(request.body || {}));
    }
  }
};

const startAppium = async (options: AppiumLaunchOption) => {
  console.log(`* Starting appium server with appium home ${options.appiumHome}`);
  const { main: appium } = dynamicRequire(options.appiumModulePath);
  try {
    console.log(`\n> node ${options.appiumModulePath} --config ${options.configPath}`);
    const appiumServer = await appium({
      port: options.proxyPort,
      appiumHome: options.appiumHome,
      subCommand: 'server',
      configFile: options.configPath,
    });

    process.on('exit', () => {
      appiumServer.close();
    });
  } catch (err) {
    console.error(err);
    process.disconnect();
  }
};

const responseInterceptor = (
  callback: (
    reponseBody: string | null,
    proxyRes: http.IncomingMessage,
    request: http.IncomingMessage,
    response: http.ServerResponse
  ) => void
) => {
  return (
    proxyRes: http.IncomingMessage,
    request: http.IncomingMessage,
    response: http.ServerResponse
  ) => {
    let _chunk: any = [],
      body = null;
    proxyRes.on('data', function (chunk) {
      _chunk.push(chunk);
    });
    proxyRes.on('end', function () {
      body = Buffer.concat(_chunk).toString();
      callback(body, proxyRes, request, response);
    });
  };
};

async function startServer() {
  let options = parseCliOptions(process.argv.slice(2));
  const appiumUrl = ` http://127.0.0.1:${options.proxyPort}`;

  const proxy = httpProxy
    .createProxy({
      target: appiumUrl,
      ws: true,
    })
    .on('proxyReq', patchRequestBody)
    .on(
      'proxyRes',
      responseInterceptor(
        (
          responseBody: string | null,
          proxyRes: http.IncomingMessage,
          request: http.IncomingMessage,
          response: http.ServerResponse
        ) => {
          const pathName = <string>request.url || '';
          const method = request.method;

          if (method && pathName.startsWith(options.basePath)) {
            const responseObj = JSON.parse(responseBody || '{}');
            const isError = responseObj.value && !!responseObj.value.error;

            if (isCreateSessionCommand(method, pathName) && !isError) {
              sendMessage({
                event: 'session-started',
                data: responseObj,
              });
            } else if (isDeleteCommand(method, pathName) && !isError) {
              sendMessage({
                event: 'session-stopped',
                data: {
                  sessionId: getSessionIdFromUrl(pathName || ''),
                },
              });
            } else {
              sendMessage({
                event: 'session-command',
                data: {
                  sessionId: getSessionIdFromUrl(pathName || ''),
                  response: responseObj,
                  url: appiumUrl + pathName,
                  path: pathName,
                  method: method,
                },
              });
            }
          }
        }
      )
    );

  await startAppium(options);

  const server = http.createServer(
    (request: http.IncomingMessage, response: http.ServerResponse) => {
      bodyparser.json()(request, response, () => {
        if (isCreateSessionCommand(request?.method as string, request?.url as string)) {
          const capabilities = (request as any).body.capabilities;
          const mjpegServerPort = Object.assign(
            {},
            capabilities['alwaysMatch'],
            (capabilities['firstMatch'] || [])[0] || {}
          )['appium:mjpegServerport'];
          if (!mjpegServerPort) {
            getPort().then((port) => {
              (request as any).body.capabilities.alwaysMatch['appium:mjpegServerPort'] = 5556;
              console.log(
                'MjpegServerPort is ' +
                  (request as any).body.capabilities.alwaysMatch['appium:mjpegServerPort']
              );
              proxy.web(request, response);
            });
          }
        } else {
          proxy.web(request, response);
        }
      });
    }
  );

  server.on('upgrade', function (req, socket, head) {
    proxy.ws(req, socket, head);
  });

  server.listen(options.appiumPort);
  server.on('error', function (e) {
    // Handle your error here
    console.error(e);
  });

  process.on('exit', () => {
    server.close();
  });
}

if (require.main === module) {
  startServer();
}
