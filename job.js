const Queue = require('rethinkdb-job-queue')
const config = require('config')

let pluginPin = 'role:job,cmd:create'
if (config.has('pluginOptions.pin')) {
  pluginPin = config.get('pluginOptions.pin')
}

let dbConfig = config.get('defaultConnection')
let qConfig = config.get('defaultQueue')

const qCreateOption = config.get('defaultCreateJob')
const defaultConnectionOptions = dbConfig
const defaultQueueOption = qConfig
const defaultCreateJobOption = qCreateOption

// console.log(defaultConnectionOptions, defaultQueueOption, defaultCreateJobOption)
module.exports = function job (options) {
  let rethinkDBInfo, newoptions
  options = this.util.deepextend({
    queueOption: defaultQueueOption,
    connctionOption: defaultConnectionOptions,
    createJobOption: defaultCreateJobOption
  }, options)

  this.add(pluginPin, async function (msg, response) {
    try {
      if (msg.args !== undefined && msg.args.body !== undefined) {
        msg = JSON.parse(msg.args.body)
      }
      // if any option pass as parameter it will create jobs
      let newoption = {
        queueOption: msg.queueOption,
        connctionOption: msg.connctionOption,
        createJobOption: msg.createJobOption
      }
      // console.log(newoption)
      newoptions = this.util.deepextend({
        queueOption: options.queueOption,
        connctionOption: options.connctionOption,
        createJobOption: options.createJobOption
      }, newoption)
      // console.log(newoptions)
      await createRethinkJobQueue(msg)
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

  let createRethinkJobQueue = async function (qdata) {
    return new Promise(async(resolve, reject) => {
      try {
        // check port number range
        checkPortNumber(newoptions.connctionOption.port)
        .then(async result => {
          let queueObj = await createJobQueue(newoptions.connctionOption, newoptions.queueOption)
          queueObj.on('error', (err) => { reject(customError(err)) })
          let job = await createJob(queueObj, { data: qdata })
          let savedJobs
          await addJob(queueObj, job)
            .then(result => {
              savedJobs = {'jobId': result[0].id}
            })
            .catch(err => { customError(err) })
          resolve(savedJobs)
        })
        .catch(err => { reject(err) })
        // let dbDriver = await createRethinkdbDash(options.connctionOption)
      } catch (err) {
        // some system fatal error happend - no way to recover !!
        reject(customError(err))
      }
    })
  }

  let createJobQueue = function (dbDriver, queueOption) {
    try {
      rethinkDBInfo = {'jobHost': dbDriver.host + ':' + dbDriver.port, 'jobDB': dbDriver.db, 'jobType': queueOption.name}
      return new Queue(dbDriver, queueOption)
    } catch (err) {
      return (err)
    }
  }

  let createJob = async function (queueObj, QData) {
    try {
      let qObj = await queueObj.createJob({data: QData})
      // set job queue priority options
      if (options.createJobOption.priority !== '') {
        qObj.setPriority(options.createJobOption.priority)
      }
      // set job queue Timeout options
      if (options.createJobOption.timeout !== '') {
        qObj.setTimeout(options.createJobOption.timeout)
      }
      // set job queue RetryMax options
      if (options.createJobOption.retrymax !== '') {
        qObj.setRetryMax(options.createJobOption.retrymax)
      }
      // set job queue RetryDelay options
      if (options.createJobOption.retrydelay !== '') {
        qObj.setRetryDelay(options.createJobOption.retrydelay)
      }
      return qObj
    } catch (err) {
      return (err)
    }
  }

  let addJob = async function (queueObj, job) {
    return new Promise(async (resolve, reject) => {
      try {
        await queueObj.addJob(job)
                      .then(result => resolve(result))
                      .catch(err => reject(err))
        // return added
      } catch (err) {
        reject(err)
      }
    })
  }
}

let customError = function (err, errorCode) {
  let errRes = {}
  errRes['error'] = {
    'message': err.message || gErrMessages['ERR_SERVICE_UNAVAIALBLE']
  }
  errRes['status'] = errorCode || 404
  return errRes
}

let checkPortNumber = function (port) {
  return new Promise((resolve, reject) => {
    if (port > 65535) {
      reject({error: {message: gErrMessages['ERR_INVALID_PORT'], code: 'ERR_INVALID_PORT'}})
    } else {
      resolve(true)
    }
  })
}

let gErrMessages = {
  'ERR_INVALID_PORT': 'port number should be in the range [1, 65535]',
  'ERR_SERVICE_UNAVAIALBLE': 'Service not avaialble'
}
