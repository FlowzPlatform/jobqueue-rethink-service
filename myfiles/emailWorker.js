let rJob = require('./index')

let runWorker = function (options) {
  console.log("================Worker Start=====", options)
  rJob.getJobQueue({
      "connction" : {
          "host": "localhost",
          "port": 28015
          },
        "queue" : {
        "name": "RegistrationEmail"
      }}).then(async result => {
    try {
      qObj = result.q
      qObj.process((job, next) => {
        for(let i = 0; i < 1000000; i++) {
          for(let j = 0; j < 1000; j++) {

          }
        }
        console.log('=======worker name=', options.name, '========')
        return next(null, 'Job Process')
      })

      qObj.on('idle', (queueId) => {
        console.log('Queue is idle: ' + queueId)
        console.log("============email worker process id :", process.pid)
        //console.log(process)//.exit()
      })
    } catch (e) {
      console.log(e)
    }
  }).catch(e => console.log(e))
}

module.exports.runWorker = runWorker
//console.log(process.env)
runWorker({name:"EmailWorker"+121})
