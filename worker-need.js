// with ES6 import
const cp = require('child_process');

let executeChildProcessAsWorker = function (jobType, options) {
  let strOptions = JSON.stringify(options)
  let n = cp.fork(`${__dirname}/start-child-worker.js`, [jobType, strOptions])
  n.on('message', (m) => {
    console.log('PARENT got message:', m)
  })
}

var socket = require('socket.io-client')('http://localhost:9001/execute-worker', {reconnect: true})

socket.on('connect', function () {})
socket.on('worker', function (data) {
  console.log('========', data)
  executeChildProcessAsWorker(data.jobType,data.options)

  //let code = await getCode(data); // get code from db
  //vm.runInThisContext(code)(require);
})
socket.on('disconnect', function () {console.log('socket is disconnected')})
