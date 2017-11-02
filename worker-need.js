// with ES6 import
const config = require('config')
const cp = require('child_process');
let symmetricWorker = config.get('symmetricWorker')

let executeChildProcessAsWorker = function (jobType, options) {
  try {
    let strOptions = JSON.stringify(options)
    let n = cp.fork(`${__dirname}/${symmetricWorker.childProcessFile}`, [jobType, strOptions])
    n.on('message', (m) => {
      console.log('PARENT got message:', m)
    })
  } catch (e) {
    console.log('Unable to load child process :', e)
  }
}

var socket = require('socket.io-client')(symmetricWorker.executeWorkerURL, {reconnect: true})

socket.on('connect', function () {})
socket.on('worker', function (data) {
  // console.log('========', data)
  executeChildProcessAsWorker(data.jobType, data.options)

  //let code = await getCode(data); // get code from db
  //vm.runInThisContext(code)(require);
})
socket.on('disconnect', function () {console.log('socket is disconnected')})
