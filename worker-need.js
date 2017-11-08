// with ES6 import
const config = require('config')
const cp = require('child_process')
const pino = require('pino')
const PINO = config.get('pino')
const symmetricWorker = config.get('symmetricWorker')

let executeChildProcessAsWorker = function (jobType, options) {
  try {
    let strOptions = JSON.stringify(options)
    let n = cp.fork(`${__dirname}/${symmetricWorker.childProcessFile}`, [jobType, strOptions])
    n.on('message', (m) => {
      pino(PINO).info('PARENT got message:', m)
    })
  } catch (e) {
    pino(PINO).error('Unable to load child process :', e)
  }
}

var socket = require('socket.io-client')(symmetricWorker.executeWorkerURL, {reconnect: true})

socket.on('connect', function () {pino(PINO).info('socket is connected')})
socket.on('worker', function (data) {
  executeChildProcessAsWorker(data.jobType, data.options)

  //let code = await getCode(data); // get code from db
  //vm.runInThisContext(code)(require);
})
socket.on('disconnect', function () {pino(PINO).info('socket is disconnected')})
