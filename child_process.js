const cp = require('child_process');
const n = cp.fork(`${__dirname}/start-child-worker.js`,['RegistrationEmail']);

n.on('message', (m) => {

  console.log('PARENT got message:', m);

});

n.send({ hello: 'world' });

console.log("=======parent======process Id:",process.pid)
