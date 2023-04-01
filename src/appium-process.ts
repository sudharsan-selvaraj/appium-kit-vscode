import * as express from 'express';
import * as yargs from 'yargs';
import * as http from 'http';
import * as axios from 'axios';
import getPort from 'get-port';
import bodyParser = require('body-parser');
import _ = require('lodash');
import { readFileSync } from 'fs';

function getCliOptions(args: Array<string>): any {
  yargs.options({
    port: {
      number: true,
      required: true,
    },
    basepath: {
      number: true,
      required: true,
    },
    proxyPort: {
      number: true,
      required: true,
    },
    address: {
      string: true,
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
    appiumExecutable: {
      string: true,
      required: true,
    },
  });

  return yargs(args).parse();
}

function startExpressApp(options: any) {
  return new Promise((resolve) => {
    const app = express();
    app.use(bodyParser.json());
    app.use((request: express.Request, response: express.Response) => {
      console.log('create Session');
    });
    app.post('/^(.*)session$/', (request: express.Request, response: express.Response) => {
      console.log('create Session');
    });

    app.delete('/^(.*)/:sessionId/', (request: express.Request, response: express.Response) => {
      console.log('delete Session');
    });

    app.listen(options.port, () => {
      resolve('');
    });
  });
}

function doProxyRequest(request: express.Request) {}

async function startAppium(args: any) {
  const { main: appium } = await import(args.appiumExecutable);
  try {
    await appium({
      port: args.proxyPort,
      appiumHome: args.appiumHome,
      subCommand: 'server',
      configFile: args.configPath,
    });
  } catch (err) {
    console.error(err);
    process.disconnect();
  }
}

async function main() {
  let args = getCliOptions(process.argv.slice(2));
  await startExpressApp(args);
  await startAppium(args);
}

if (require.main === module) {
  main();
}

//main();
