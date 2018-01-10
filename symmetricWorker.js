const rJob = require('./index')
const config = require('config')
var _ = require('underscore')
var app = require('express')()
var server = require('http').Server(app)
var io = require('socket.io')(server)
const rethink = require('rethinkdb')
const defaultConnection = config.get('defaultConnection')
const symmetricWorker = config.get('symmetricWorker')
const pino = require('pino')

const waitingThreshold = symmetricWorker.get('waitingThreshold')
const increaseWorker = symmetricWorker.get('increaseWorker')
const maxWorker = symmetricWorker.get('maxWorker')
const PINO = config.get('pino')
let wCount = 1

if(process.env.rdb_host!== undefined && process.env.rdb_host!== '') {
    defaultConnection.host = process.env.rdb_host
}

if(process.env.rdb_port!== undefined && process.env.rdb_port!== '') {
    defaultConnection.port = process.env.rdb_port
}

let rdbConn
connectRethinkDB(defaultConnection).then(result => {
  rdbConn = result
  checkTableExistsOrNot(rdbConn, symmetricWorker.table).then(res => pino(PINO).info(res))
})

server.listen(symmetricWorker.port)

// register job type queue object
let registeredJobTypeQueueObj = {}

process.setMaxListeners(0)
let socketObj = io.of('/execute-worker')
socketObj.on('connection', function (socket) {
  pino(PINO).info('socket connected')
})

app.put('/register-jobtype/:jobtype', async function (req, res) {
  try {
    let newConnection = _.extend({'connection':defaultConnection},{
        'queue': {'name': req.params.jobtype}
      })
    //pino(PINO).info(newConnection)
    generateQueueObjectByJobTypeWithSaveToDB(req.params.jobtype, newConnection)
    .then(result => { /* pino(PINO).info("register response==",result); */ res.send(result) })
    .catch(err => { /* pino(PINO).info("register response==",err); */ res.send(err) })
  } catch (e) {
    //pino(PINO).info(e)
    return res.status(400).send('JobType not registered')
  }
})

app.delete('/register-jobtype/:jobtype', async function (req, res) {
  try {
    //pino(PINO).info(registeredJobTypeQueueObj[req.params.jobtype])
    if (registeredJobTypeQueueObj[req.params.jobtype] !== undefined) {
      delete registeredJobTypeQueueObj[req.params.jobtype]
      deleteDataJobType(symmetricWorker.table, rdbConn, req.params.jobtype)
        .then(result => { res.send('JobType successfully unregister') })
        .catch(err => { res.send(res) })
      // pino(PINO).info('===========remove job type======')
    } else {
      res.send('JobType not found')
    }
  } catch (e) {
    pino(PINO).error(e)
    return res.status(400).send('JobType not found')
  }
})

app.post('/register-jobtype/:jobtype', async function (req, res) {
  try {
    let newConnection = _.extend({'connection':defaultConnection},{
      connection: req.body.connection,
    })
    pino(PINO).info('newOptions',newConnection)
    generateQueueObjectByJobTypeWithSaveToDB(req.param.jobtype, newConnection)
    .then(result => { pino(PINO).info("register response",result); res.send(result) })
    .catch(err => { pino(PINO).error("register response",err);res.send(err) })
  } catch (e) {
    pino(PINO).error(e)
    return res.status(400).send('JobType not registered')
  }
})

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


async function getSummary () {
  try {
    // pino(PINO).info("=======registeredJobTypeQueueObj length===>",Object.keys(registeredJobTypeQueueObj).length)
    if (Object.keys(registeredJobTypeQueueObj).length > 0) {
      pino(PINO).info('Summary Start')
      for (var jobType in registeredJobTypeQueueObj) {
          let objQ = registeredJobTypeQueueObj[jobType].qObj
          //pino(PINO).info("=============queue obj===>",objQ,"<===============")
          pino(PINO).info('JobType', jobType)
          let concurrency = objQ.concurrency
          let summary = await objQ.summary().catch(e => pino(PINO).error(e))
          pino(PINO).info(summary)
          //pino(PINO).info('======running=>', objQ.running, '======concurrency=>', concurrency, '=======summary===', summary)

          let sCreated = summary.created ? summary.created : 0
          let denominator = (summary.total - (summary.active + summary.completed + summary.cancelled + summary.failed + summary.terminated + sCreated))
          let waitingRatio = denominator != 0 ? (summary.waiting) / denominator : 0
          // pino(PINO).info("=======waitingRatio====>",waitingRatio)
          if (waitingRatio > waitingThreshold && wCount < maxWorker ) {
            let startWorkers = parseInt(((100 * (waitingRatio - waitingThreshold)) * increaseWorker) / 100)
             pino(PINO).info("before emit")
            socketObj.emit('worker', {'jobType': jobType, 'needWorker': startWorkers, 'options': registeredJobTypeQueueObj[jobType].options})
          }
          // pino(PINO).info("============simatric process id :",process.pid)
      }
      pino(PINO).info('Summary End')
    }
  } catch (e) {
    pino(PINO).error(e)
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
        pino(PINO).info('data inserted')
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
