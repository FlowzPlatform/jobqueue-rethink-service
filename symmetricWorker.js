const rJob = require('./index')
const config = require('config')
var _ = require('underscore')
var app = require('express')()
var server = require('http').Server(app)
var io = require('socket.io')(server)
server.listen(9001)

let defaultConnection = config.get('defaultConnection')
// register job type queue object
let registeredJobTypeQueueObj = {}

app.get('/register-jobtype/:jobtype', async function (req, res) {
  try {
    console.log('=========req.params.jobtype=', req.params.jobtype)
    let newConnection = _.extend({'connection':defaultConnection},{
        'queue': {'name': req.params.jobtype}
      })
    console.log(newConnection)
    generateQueueObjectByJobType(req.params.jobtype, newConnection)
    .then(result => { console.log("register response==",result); res.send(result) })
    .catch(err => { console.log("register response==",err);res.send(err) })
  } catch (e) {
    //console.log(e)
    console.log("api register response==",e);
    return res.status(400).send('JobType not registered')
  }
})

app.post('/register-jobtype/:jobtype', async function (req, res) {
  try {
    let newConnection = plugin.util.deepextend({
      connction: req.body.connection,
      }, defaultConnection)
    console.log('================newOptions====',newConnection)
    generateQueueObjectByJobType(req.param.jobtype, newConnection)
    .then(result => { console.log("register response==",result); res.send(result) })
    .catch(err => { console.log("register response==",err);res.send(err) })
  } catch (e) {
    console.log(e)
    return res.status(400).send('JobType not registered')
  }
})



let waitingThreshold = 0.40
let increaseWorker = 10
let maxWorker = 10

let wCount = 1

let generateQueueObjectByJobType = function (jobType, options) {
  return new Promise((resolve, reject) => {
    rJob.getJobQueue(options).then(result => {
      try {
        registeredJobTypeQueueObj[jobType] = {'qObj': result.q, 'options': options}
        resolve('JobType registered successfully')
      } catch (e) {
        reject(e)
      }
    }).catch(e => reject(e))
  })
}

process.setMaxListeners(0)
let socketObj = io.of('/execute-worker')
socketObj.on('connection', function (socket) {
  console.log('socket connected')
})

async function getSummary()
{
  try {
    console.log("=======registeredJobTypeQueueObj length===>",Object.keys(registeredJobTypeQueueObj).length)
    if (Object.keys(registeredJobTypeQueueObj).length > 0) {
      //for (let i = 0; i < registeredJobTypeQueueObj.length; i++) {
      for (var jobType in registeredJobTypeQueueObj) {
          objQ = registeredJobTypeQueueObj[jobType].qObj
          //console.log("=============queue obj===>",objQ,"<===============")
          console.log("=================================", jobType, " Summary Start===========================================")
          let concurrency = objQ.concurrency
          let summary = await objQ.summary().catch(e=>console.log(e))
          console.log("======running=>",objQ.running,"======concurrency=>",concurrency,"=======summary===",summary)

          let waitingRatio = (summary.waiting) / (summary.total - (summary.completed ))
          console.log("=======waitingRatio====>",waitingRatio)
          if (waitingRatio > waitingThreshold && wCount < maxWorker ) {
            let startWorkers = parseInt(((100 *(waitingRatio - waitingThreshold)) * increaseWorker) / 100)
            console.log("==============before emit=========")
            socketObj.emit('worker', {'jobType': jobType, 'needWorker': startWorkers, 'options': registeredJobTypeQueueObj[jobType].options})
          }
          console.log("============simatric process id :",process.pid)
          console.log("==================================Summary End===========================================", wCount)
      }
    }
  } catch (e) {
    console.log(e)
  }
  setTimeout(() => { getSummary() }, 5000)
}
getSummary()
