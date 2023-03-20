var { spawn } = require('child_process');

var appiumProcess = spawn('appium', {
  env: process.env,
});
appiumProcess.stdout.on('data', (data) => {
  console.log(data.toString());
});

appiumProcess.stderr.on('data', (data) => {
  console.log(data.toString());
});
