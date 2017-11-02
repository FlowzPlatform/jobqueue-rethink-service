let rJob = require('./index')
let registerWorker = config.get('registerWorker')

process.on('message', (m) => {
  console.log('CHILD got message:', m)
})

'use strict'
const vm = require('vm')
var rp = require('request-promise')

// this is job process global variable
global.JobExecute

function getJobTypeWorkerProcess (jobType) {
  return new Promise((resolve, reject) => {
    rp(registerWorker + jobType)
      .then(function (jobProcessCode) {
        resolve(jobProcessCode)
      })
      .catch(function (err) {
        reject(err)
      })
  })
}

let runWorker = function (options) {
  console.log("================Worker Start=====", options)
  rJob.getJobQueue(options).then(async result => {
    try {
      console.log('=======job queue object created =', options.queue.name, '========')
      let qObj = result.q
      qObj.process(async (job, next, onCancel) => {
        try {
          JobExecute(job)
            .then(result => { console.log('=======worker done=', options.queue.name, '========'); next(null, result) })
            .catch(err => {
              // console.log("==========================job.id=",job.id);
                qObj.getJob(job.id).then((savedJobs) => {
                    const processDate = new Date((new Date()).getTime() + (2 * 60 * 1000))
                    savedJobs[0].status = 'active'
                    return qObj.reanimateJob(savedJobs[0], processDate)
                  }).catch(err => console.error(err))

              console.log('=======worker error=', options.queue.name, '========');
            })
          console.log('=======worker name=', options.queue.name, '========')
        } catch (err) {
          console.log('=======handle by try-catch=', options.queue.name, '========')
          return next(err)
        }
      })
      // process.on('unhandledRejection', error => {
      //   // Won't execute
      //   console.log('unhandledRejection', error);
      // });
      qObj.on('idle', (queueId) => {
        console.log('Queue is idle: ' + queueId)
        console.log("============email worker process id :", process.pid)
        //console.log(process)//.exit()
        process.send({ 'subprocess': 'exit', 'pid': process.pid })
        process.exit()
      })
    } catch (e) {
      console.log(e)
    }
  }).catch(e => console.log(e))
}

module.exports.runWorker = runWorker

let executeWorker = async function (jobType, options) {
  try {
    let jobProcessCode = await getJobTypeWorkerProcess(jobType) // `function (job,next){console.log("dynamic job process load")};`
    const script = new vm.Script(`
      (function(require) {
        JobExecute = function(job) {
          return new Promise(
            async (resolve, reject) =>
            {
              try {
                 ` + jobProcessCode + `
              } catch(err) {
                reject({ error: err,jobdata:job})
              }
            }
          )
        }
      })`,
      { filename: 'jobProcessTrace.vm' })
    script.runInThisContext()(require)
    runWorker(options)
    console.log('Child Process as Worker Executed')
  } catch (e) {
    console.log(e)
    console.log('unable to load child worker.')
  }
}

let jobOptions = JSON.parse(process.argv[3])
executeWorker(process.argv[2], jobOptions)
