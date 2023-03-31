import getPort from 'get-port';

async function findFreePort() {
  return await getPort();
}

async function isPortFree(port: number) {
  return (await getPort({ port })) === port;
}

export { findFreePort, isPortFree };
