let rJob = require('./index')

process.on('message', (m) => {
  console.log('CHILD got message:', m);
});

process.send({ foo: 'bar' });

'use strict'
const vm = require('vm')
var rp = require('request-promise')

// this is job process global variable
global.JobExecute

function getJobTypeWorkerProcess (jobType) {
  return new Promise((resolve, reject) => {
    rp('http://localhost:3000/job-module/' + jobType)
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
  rJob.getJobQueue({
      "connction" : {
          "host": "localhost",
          "port": 28015
          },
        "queue" : {
        "name": options.name
      }}).then(async result => {
    try {
      let qObj = result.q
      qObj.process((job, next) => {
        JobExecute('job', 'next')
        console.log('=======worker name=', options.name, '========')
        return next(null, 'Job Process')
      })

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
      JobExecute = ` + jobProcessCode,
      { filename: 'jobProcessTrace.vm' })
    script.runInThisContext()
    runWorker({'name': jobType})
    console.log('Child Process as Worker Executed')
  } catch (e) {
    console.log(e)
    console.log('unable to load child worker.')
  }
}

executeWorker(process.argv[2], {})
