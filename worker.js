
const rethink = require('rethinkdb')
const config = require('config')
const JSONfn = require('json-fn')
let pluginWorkerRegister = 'role:worker,cmd:register'

let defaultConnction = config.get('defaultConnection')
let defaultWorker = config.get('defaultWorker')

// console.log(defaultConnectionOptions, defaultQueueOption, defaultCreateJobOption)
module.exports = function worker (options) {
  let rethinkDBInfo, newoptions
  let plugin = this
  let rdbConn = connectRethinkDB(defaultConnction)
  console.log("==========options===>", options)
    this.add(pluginWorkerRegister, async function (msg, response) {
    try {
      let validParamErr
      [validParamErr, msg] = validateRequestBody(msg)
      if (validParamErr) {
        response(validParamErr)
        return false
      }
      console.log("=====================job Options=======")
      await registerWroker(defaultConnction.db, defaultWorker.table, rdbConn, msg)
        .then(result => {
          result.connctionInfo = rethinkDBInfo
          response(null, result)
        })
        .catch(err => {
          err.connctionInfo = rethinkDBInfo
          response(err)
        })
    } catch (err) {
      response(err)
    }
  })
  let validateRequestBody = function (msg) {
    console.log("================>", msg, "<====================")
    if (msg.request$ !== undefined) {
      var contype = msg.request$.headers['content-type']
      // if (!contype || contype.indexOf('application/json') !== 0) {
      //   let err = {error: {message: gErrMessages['ERR_CONTENT_TYPE'], code: 'ERR_CONTENT_TYPE'}}
      //   return [err, null]
      // }
      if (msg.args !== undefined && msg.args.body !== undefined && msg.args.body !== '') {
        try {
          let paserBody = eval('(' + msg.args.body + ')')
          return [null, paserBody]
        } catch (err) {
          console.log(err)
          let err1 = {error: {message: gErrMessages['ERR_INVALID_PRAMATER'], code: 'ERR_INVALID_PRAMATER'}}
          return [err1, null]
        }
      } else {
        let err = {error: {message: gErrMessages['ERR_PRAMATER_MISSING'], code: 'ERR_INVALID_PORT'}}
        return [err, null]
      }
    } else {
      return [null, msg]
    }
  }
  let registerWroker = async function (db, table, rethinkDBConnection, worker) {
    return new Promise((resolve, reject) => {
      let workerData = {
        jobType: worker.jobType,
        payLoad: worker.payload
      }
      console.log(workerData)
      rethink.db(db).table(table).insert(workerData).run(rethinkDBConnection, function (err, result) {
        if (err) {
          reject(err)
        } else {
          resolve('inserted successfully')
        }
      })
    })
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
}

let gErrMessages = {
  'ERR_INVALID_PORT': 'port number should be in the range [1, 65535]',
  'ERR_SERVICE_UNAVAIALBLE': 'Service not avaialble',
  'ERR_REQLDRIVERERROR': 'RethinkDB service unavaialble',
  'ERR_PRAMATER_MISSING': 'job data missing, Please provide body as paramater',
  'ERR_CONTENT_TYPE': 'Content-Type should be application/json',
  'ERR_INVALID_PRAMATER': 'Please provide valid paramater'
}
