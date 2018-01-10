'use strict'
let rJob = require('./index')
const config = require('config')
let registerWorker = config.get('registerWorker')
const pino = require('pino')
const PINO = config.get('pino')


if(process.env.getJobModuleApiURL!== undefined && process.env.getJobModuleApiURL!== '') {
    registerWorker.getJobModuleApiURL = process.env.getJobModuleApiURL
}

process.on('message', (m) => {
  pino(PINO).info('CHILD got message:', m)
})

const vm = require('vm')
var rp = require('request-promise')

// this is job process global variable
global.JobExecute

function getJobTypeWorkerProcess (jobType) {
  return new Promise((resolve, reject) => {
    rp(registerWorker.getJobModuleApiURL + jobType)
      .then(function (jobProcessCode) {
        resolve(jobProcessCode)
      })
      .catch(function (err) {
        reject(err)
      })
  })
}

let runWorker = function (options) {
  pino(PINO).info("Worker Start", options)
  rJob.getJobQueue(options).then(async result => {
    try {
      pino(PINO).info('job queue object created', options.queue.name)
      let qObj = result.q
      qObj.process(async (job, next, onCancel) => {
        try {
          JobExecute(job)
            .then(result => { pino(PINO).info('worker done', options.queue.name); next(null, result) })
            .catch(err => {
              qObj.getJob(job.id).then((savedJobs) => {
                  const processDate = new Date((new Date()).getTime() + (2 * 60 * 1000))
                  savedJobs[0].status = 'active'
                  return qObj.reanimateJob(savedJobs[0], processDate)
                }).catch(err => pino(PINO).error(err))

              pino(PINO).error('worker error', options.queue.name)
            })
          pino(PINO).info('worker name', options.queue.name)
        } catch (err) {
          pino(PINO).error('handle by try-catch', options.queue.name)
          return next(err)
        }
      })
      // process.on('unhandledRejection', error => {
      //   // Won't execute
      //   pino(PINO).error('unhandledRejection', error);
      // });
      qObj.on('idle', (queueId) => {
        pino(PINO).info('Queue is idle: ' + queueId)
        pino(PINO).info("worker process id :", process.pid)
        process.send({ 'subprocess': 'exit', 'pid': process.pid })
        process.exit()
      })
    } catch (e) {
      pino(PINO).error(e)
    }
  }).catch(e => pino(PINO).error(e))
}

module.exports.runWorker = runWorker

let executeWorker = async function (jobType, options) {
  try {
    let jobProcessCode = await getJobTypeWorkerProcess(jobType) // `function (job,next){pino(PINO).info("dynamic job process load")};`
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
    pino(PINO).info('Child Process as Worker Executed')
  } catch (e) {
    pino(PINO).error(e)
    pino(PINO).error('unable to load child worker.')
  }
}

let jobOptions = JSON.parse(process.argv[3])
executeWorker(process.argv[2], jobOptions)
