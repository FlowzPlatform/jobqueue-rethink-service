let rJob = require('./index')
let eWorker = require('./emailWorker')
var io = require('socket.io')(9001)
//var exec = require('child_process').exec;

let waitingThreshold = 0.40
let increaseWorker = 10
let maxWorker = 10

let wCount = 1

let defaultConnection = {
  'connction': {
    'host': 'localhost',
    'port': 28015
  },
  'queue': {
    'name': 'RegistrationEmail'
  }
}

rJob.getJobQueue(defaultConnection).then(async result => {
  try {
    qObj = result.q
    getSummary(qObj)
  } catch (e) {
    console.log(e)
  }
}).catch(e => console.log(e))
process.setMaxListeners(0)
async function getSummary(objQ)
{
    try {
      console.log("==================================Summary Start===========================================")
      let concurrency = objQ.concurrency
      let summary = await objQ.summary().catch(e=>console.log(e))
      console.log("======running=>",objQ.running,"======concurrency=>",concurrency,"=======summary===",summary)

      let waitingRatio = (summary.waiting) / summary.total
      console.log("=======waitingRatio====>",waitingRatio)
      if (waitingRatio > waitingThreshold && wCount < maxWorker ) {
        let startWorkers = parseInt(((100 *(waitingRatio - waitingThreshold)) * increaseWorker) / 100)


        io.of('/execute-worker')
        .on('connection', function (socket) {
          console.log("=======need to startWorkers====>",startWorkers)
          socket.emit('worker', {'jobType': defaultConnection.queue.name, 'needWorker': startWorkers})
        })

        // for(let i = 0; i < startWorkers; i++) {
        //
        //   // var dependency = {"name": "EmailWorker"+wCount}
        //   // var args = [JSON.stringify(dependency)]
        //   // var child = require('child_process').fork('emailWorker', ['PROCESSNAME=EmailWorker'+wCount])
        //   // childProcess[dependency.name] = child
        //   // child.send(dependency.name)
        //   // child.on('message', function(m) {
        //   //   // Receive results from child process
        //   //   console.log(wCount + ' received: ' + m)
        //   // })
        //
        //   exec('node http://localhost:3000/download/RegistrationEmail', function(error, stdout, stderr) {
        //       console.log('stdout: ', stdout);
        //       console.log('stderr: ', stderr);
        //       if (error !== null) {
        //           console.log('exec error: ', error);
        //       }
        //   });
        //
        //
        //   // eWorker.runWorker()
        //   wCount++
        // }
      }
      console.log("============simatric process id :",process.pid)
      console.log("==================================Summary End===========================================", wCount)
    } catch (e) {
      console.log(e)
    }
    setTimeout(() => { getSummary(objQ) }, 5000)
}


//app.listen(6001)
//app.listen(9001)
