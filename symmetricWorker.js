const rJob = require('./index')
const config = require('config')
var _ = require('underscore')
var app = require('express')()
var server = require('http').Server(app)
var io = require('socket.io')(server)

let rethink = require('rethinkdb')
let defaultConnection = config.get('defaultConnection')
let symmetricWorker = config.get('symmetricWorker')
let rdbConn
connectRethinkDB(defaultConnection).then(result => {
  rdbConn = result
  checkTableExistsOrNot(rdbConn, symmetricWorker.table).then(res => console.log(res))
})

server.listen(symmetricWorker.port)

// register job type queue object
let registeredJobTypeQueueObj = {}

app.get('/register-jobtype/:jobtype', async function (req, res) {
  try {
    let newConnection = _.extend({'connection':defaultConnection},{
        'queue': {'name': req.params.jobtype}
      })
    //console.log(newConnection)
    generateQueueObjectByJobTypeWithSaveToDB(req.params.jobtype, newConnection)
    .then(result => { /* console.log("register response==",result); */ res.send(result) })
    .catch(err => { /* console.log("register response==",err); */ res.send(err) })
  } catch (e) {
    //console.log(e)
    return res.status(400).send('JobType not registered')
  }
})

app.get('/unregister-jobtype/:jobtype', async function (req, res) {
  try {
    //console.log(registeredJobTypeQueueObj[req.params.jobtype])
    if (registeredJobTypeQueueObj[req.params.jobtype] !== undefined) {
      delete registeredJobTypeQueueObj[req.params.jobtype]
      deleteDataJobType(symmetricWorker.table, rdbConn, req.params.jobtype)
      .then(result => { res.send('JobType successfully unregister') })
      .catch(err => { res.send(res) })
      // console.log('===========remove job type======')
    } else {
      res.send('JobType not found')
    }
  } catch (e) {
    console.log(e)
    return res.status(400).send('JobType not found')
  }
})

app.post('/register-jobtype/:jobtype', async function (req, res) {
  try {
    let newConnection = plugin.util.deepextend({
      connction: req.body.connection,
      }, defaultConnection)
    console.log('================newOptions====',newConnection)
    generateQueueObjectByJobTypeWithSaveToDB(req.param.jobtype, newConnection)
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

let generateQueueObjectByJobTypeWithSaveToDB = function (jobType, options) {
  return new Promise((resolve, reject) => {
    if (registeredJobTypeQueueObj[jobType]) {
      resolve('JobType successfully registered')
    } else {
      rJob.getJobQueue(options).then(result => {
        try {
          let registeredJobType = {
            jobType: jobType,
            options: options
          }
          saveToRethinkDB(symmetricWorker.table, rdbConn, registeredJobType)
          registeredJobTypeQueueObj[jobType] = {'qObj': result.q, 'options': options}
          resolve('JobType successfully registered')
        } catch (e) {
          reject(e)
        }
      }).catch(e => reject(e))
    }
  })
}

let generateQueueObjectByJobTypeWithOutSave = function (jobType, options) {
  return new Promise((resolve, reject) => {
    if (registeredJobTypeQueueObj[jobType]) {
      resolve('JobType registered successfully')
    } else {
      rJob.getJobQueue(options).then(result => {
        try {
          registeredJobTypeQueueObj[jobType] = {'qObj': result.q, 'options': options}
          resolve('JobType registered successfully')
        } catch (e) {
          reject(e)
        }
      }).catch(e => reject(e))
    }
  })
}

process.setMaxListeners(0)
let socketObj = io.of('/execute-worker')
socketObj.on('connection', function (socket) {
  console.log('socket connected')
})

async function getSummary () {
  try {
    // console.log("=======registeredJobTypeQueueObj length===>",Object.keys(registeredJobTypeQueueObj).length)
    if (Object.keys(registeredJobTypeQueueObj).length > 0) {
      console.log('=================================Summary Start===========================================')
      for (var jobType in registeredJobTypeQueueObj) {
          let objQ = registeredJobTypeQueueObj[jobType].qObj
          //console.log("=============queue obj===>",objQ,"<===============")
          console.log('========JobType=', jobType, '=========')
          let concurrency = objQ.concurrency
          let summary = await objQ.summary().catch(e => console.log(e))
          console.log(summary)
          //console.log('======running=>', objQ.running, '======concurrency=>', concurrency, '=======summary===', summary)

          let waitingRatio = (summary.waiting) / (summary.total - (summary.active + summary.completed + summary.cancelled + summary.failed + summary.terminated ))
          // console.log("=======waitingRatio====>",waitingRatio)
          if (waitingRatio > waitingThreshold && wCount < maxWorker ) {
            let startWorkers = parseInt(((100 * (waitingRatio - waitingThreshold)) * increaseWorker) / 100)
             console.log("==============before emit=========")
            socketObj.emit('worker', {'jobType': jobType, 'needWorker': startWorkers, 'options': registeredJobTypeQueueObj[jobType].options})
          }
          // console.log("============simatric process id :",process.pid)
      }
      console.log('=================================Summary End=============================================')
    }
  } catch (e) {
    console.log(e)
  }
  setTimeout(() => { getSummary() }, 5000)
}

function connectRethinkDB (cxnOptions) {
  return new Promise((resolve, reject) => {
    rethink.connect({ host: cxnOptions.host, port: cxnOptions.port, db: cxnOptions.db }, function (err, conn) {
      if (err) {
        reject(err)
      } else {
        resolve(conn)
      }
    })
  })
}

function checkTableExistsOrNot (connection, table) {
  return new Promise((resolve, reject) => {
    rethink.tableList().run(connection).then(function (tableNames) {
      if (_.includes(tableNames, table)) {
        resolve('table already exists')
      } else {
        rethink.tableCreate(table).run(connection)
        resolve('table created')
      }
    })
  })
}

function saveToRethinkDB (table, connection, data) {
  return new Promise(async(resolve, reject) => {
    let result = await getDataJobType(table, connection, data.jobType)
    let messageData = data
    let saveData
    if (result.id === undefined) {
      saveData = rethink.table(table).insert(messageData)
    } else {
      saveData = rethink.table(table).filter({id: result.id}).update(messageData)
    }
    saveData.run(connection, function (err, result) {
      if (err) {
        reject(err)
      } else {
        console.log('data inserted')
        resolve(result)
      }
    })
  })
}

function getDataJobType (table, connection, jobTyped) {
  return new Promise(async (resolve, reject) => {
    await rethink.table(table)
      .filter(rethink.row('jobType').eq(jobTyped))
      .run(connection, function (err, cursor) {
        if (err) {
          reject(err)
        } else {
          cursor.toArray(function (err, result) {
            if (err) {
              reject(err)
            } else {
              if (result.length > 0) {
                resolve(result[0])
              } else {
                resolve(result)
              }
            }
          })
        }
      })
  })
}

function deleteDataJobType (table, connection, jobTyped) {
  return new Promise(async (resolve, reject) => {
    await rethink.table(table)
      .filter(rethink.row('jobType').eq(jobTyped))
      .delete()
      .run(connection, function (err, cursor) {
        if (err) {
          reject(null)
        } else {
          resolve(null)
        }
      })
  })
}

function getAllJobType (table, connection) {
  return new Promise(async (resolve, reject) => {
    await rethink.table(table)
      .run(connection, function (err, cursor) {
        if (err) {
          resolve(null)
        } else {
          cursor.toArray(function (err, result) {
            if (err) {
              reject(err)
            } else {
              resolve(result)
            }
          })
        }
      })
  })
}

async function startAllRegisteredJobType () {
  if(!rdbConn) {
    setTimeout(() => { startAllRegisteredJobType() }, 1000)
  } else {
    let jobTypes = await getAllJobType(symmetricWorker.table, rdbConn)
    for (var i = 0; i < jobTypes.length; i++) {
      await generateQueueObjectByJobTypeWithOutSave(jobTypes[i].jobType, jobTypes[i].options)
    }
    getSummary()
  }
}

startAllRegisteredJobType()
