import * as http from 'http';
import * as httpProxy from 'http-proxy';
import * as bodyparser from 'body-parser';
import * as yargs from 'yargs';
import { AppiumIpcEvent, AppiumIpcMessage } from './appium-ipc-event';

export interface AppiumLaunchOption {
  appiumPort: number;
  proxyPort: number;
  address: number;
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

const hasBody = (request: http.IncomingMessage) => {
  return !!request?.method && new RegExp(/post|put|patch/g).test(request?.method?.toLowerCase());
};

const pathRequestBody = (
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
  /* new comment */
  console.log(`* Starting appium server with appium home ${options.appiumHome}`);
  const { main: appium } = dynamicRequire(options.appiumModulePath);
  try {
    console.log(`> node ${options.appiumModulePath} --config ${options.configPath}`);
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

function startServer() {
  let options = parseCliOptions(process.argv.slice(2));

  const proxy = httpProxy
    .createProxy({
      target: `http://127.0.0.1:${options.proxyPort}`,
      ws: true,
    })
    .on('proxyReq', pathRequestBody)
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
            if (
              method.toLowerCase() === 'post' &&
              pathName.startsWith(options.basePath) &&
              pathName.endsWith('session')
            ) {
              sendMessage({
                event: 'session-started',
                // data: JSON.parse(responseBody || '{}'),
                data: { sessionId: '123', capabilities: {} },
              });
            } else if (method.toLowerCase() === 'delete' && getSessionIdFromUrl(pathName || '')) {
              sendMessage({
                event: 'session-stopped',
                data: {
                  sessionId: getSessionIdFromUrl(pathName || ''),
                },
              });
            } else {
            }
          }
          console.log(!!responseBody ? JSON.parse(responseBody) : null);
        }
      )
    );

  const server = http.createServer(
    (request: http.IncomingMessage, response: http.ServerResponse) => {
      bodyparser.json()(request, response, () => {
        console.log('Incomming request');
        proxy.web(request, response);
      });
    }
  );

  server.on('upgrade', function (req, socket, head) {
    proxy.ws(req, socket, head);
  });

  server.listen(options.appiumPort, async () => {
    await startAppium(options);
  });
  process.on('exit', () => {
    server.close();
  });
}

if (require.main === module) {
  startServer();
}
