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

let jobProcess = `
  let rJob = require('./index')
  let myconsole = require('console')
  let myprocess = require('process')
  let runWorker = function (options) {
    myconsole.log("================Worker Start=====", options)
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
          myconsole.log('=======worker name=', options.name, '========')
          return next(null, 'Job Process')
        })

        qObj.on('idle', (queueId) => {
          myconsole.log('Queue is idle: ' + queueId)
          myconsole.log("============email worker process id :", myprocess.pid)
          //console.log(process)//.exit()
        })
      } catch (e) {
        myconsole.log(e)
      }
    }).catch(e => myconsole.log(e))
  }
  `
  const sandbox = {
    animal: 'cat',
    count: 2
    }
app.get('/execute-worker/:jobtype', async function (req, res) {
  try {
    let jobProcessCode = await getJobTypeWorkerProcess(req.params.jobtype) // `function (job,next){console.log("dynamic job process load")};`
    jobProcessCode = `let JobExecute = ` + jobProcessCode
    let bindJobWorkerCode = `(function(require) {` + jobProcessCode + ';' + jobProcess + `runWorker({'name': '`+ req.params.jobtype +`'})` + `})`
    const script = new vm.Script(bindJobWorkerCode)
    const context = vm.createContext({
      require: require,
      console: console,
      process: process
    });
    console.log(context)
    let t_exe =  vm.runInContext(bindJobWorkerCode,context,{
      require: require,
      console: console,
      process: process
    })(require)
    console.log(t_exe)
    res.send('Worker Executed')
  } catch (e) {
    console.log(e)
    return res.status(400).send('unable to load worker.')
  }
})

app.listen(6061)



// module.exports.runWorker = runWorker
// console.log(process.env)
// runWorker({name:"EmailWorker"+121})
