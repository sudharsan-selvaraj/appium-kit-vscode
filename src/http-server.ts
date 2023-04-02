import { Request, Response } from 'express';
import * as http from 'http';
import * as httpProxy from 'http-proxy';
import * as bodyparser from 'body-parser';
const pathmatch = require('path-match');
//https://github.com/appium/appium/blob/master/packages/base-driver/lib/protocol/routes.js#L943
const requestInterceptor = (
  proxyRequest: http.ClientRequest,
  request: http.IncomingMessage & { body?: any },
  response: http.ServerResponse
) => {
  if (!!request?.method && !new RegExp(/post|put|patch/g).test(request?.method?.toLowerCase())) {
    return;
  }

  const contentType = <string>proxyRequest.getHeader('Content-Type');

  const writeBody = (bodyData: string) => {
    proxyRequest.setHeader('Content-Length', Buffer.byteLength(bodyData));
    proxyRequest.write(bodyData);
  };

  if (!!contentType && contentType.includes('application/json')) {
    writeBody(JSON.stringify(request.body || {}));
  }
};

const bodyInterceptor = (
  callback: (
    reponseBody: string,
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
    let _body: any = [];
    response.on('data', function (chunk) {
      _body.push(chunk);
    });
    response.on('end', function () {
      _body = Buffer.concat(_body).toString();
      console.log('res from  server:', _body);
      callback(_body, proxyRes, request, response);
    });
  };
};

function startServer() {
  const proxy = httpProxy
    .createProxy({
      target: 'http://127.0.0.1:4723',
      ws: true,
    })
    .on('proxyReq', requestInterceptor)
    .on(
      'proxyRes',
      bodyInterceptor(
        (
          responseBody: string,
          proxyRes: http.IncomingMessage,
          request: http.IncomingMessage,
          response: http.ServerResponse
        ) => {
          //   if (!!request?.method && request.method.toLowerCase() === 'post' && ) {
          //     return;
          //   }
        }
      )
    );

  const server = http.createServer(
    (request: http.IncomingMessage, response: http.ServerResponse) => {
      bodyparser.json()(request, response, () => {
        proxy.web(request, response);
      });
    }
  );

  server.on('upgrade', function (req, socket, head) {
    proxy.ws(req, socket, head);
  });

  server.listen(5555, () => {
    console.log('Server started on port 5555');
  });
}

startServer();
