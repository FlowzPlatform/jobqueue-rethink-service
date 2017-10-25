'use strict'
const vm = require('vm')
var rp = require('request-promise')
// this is job process global variable
global.JobExecute
let rJob = require('./index')
const express = require('express')
const app = express()

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
        "name": "RegistrationEmail"
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
      })
    } catch (e) {
      console.log(e)
    }
  }).catch(e => console.log(e))
}

app.get('/execute-worker/:jobtype', async function (req, res) {
  try {
    let jobProcessCode = await getJobTypeWorkerProcess(req.params.jobtype) // `function (job,next){console.log("dynamic job process load")};`
    const script = new vm.Script(`
      JobExecute = ` + jobProcessCode,
      { filename: 'jobProcessTrace.vm' })
    script.runInThisContext()
    runWorker({'name': req.params.jobtype})
    res.send('Worker Executed')
  } catch (e) {
    console.log(e)
    return res.status(400).send('unable to load worker.')
  }
})

app.listen(6060)



// module.exports.runWorker = runWorker
// console.log(process.env)
// runWorker({name:"EmailWorker"+121})
