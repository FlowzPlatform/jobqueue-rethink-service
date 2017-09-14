const Queue = require('rethinkdb-job-queue')
const config = require('config')

let pluginCreate = 'role:job,cmd:create'
let pluginFind = 'role:job,cmd:findjob'
if (config.has('pluginOptions.pin')) {
  pluginCreate = config.get('pluginOptions.pin')
}

let dbConfig = config.get('defaultConnection')
let qConfig = config.get('defaultQueue')

const qCreateOption = config.get('defaultCreateJob')

const defaultOption = {
  connctionOption: dbConfig,
  queueOption: qConfig,
  createJobOption: qCreateOption
}
// console.log(defaultConnectionOptions, defaultQueueOption, defaultCreateJobOption)
module.exports = function job (options) {
  let rethinkDBInfo, newoptions
  let plugin = this

  let mergeOptions = function (fOptions, mOption) {
    return plugin.util.deepextend({
      queueOption: fOptions.queueOption,
      connctionOption: fOptions.connctionOption,
      createJobOption: fOptions.createJobOption
    }, mOption)
  }

  options = mergeOptions(defaultOption, options)

  this.add(pluginCreate, async function (msg, response) {
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
      // Merge Options
      newoptions = mergeOptions(options, newoption)

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

  this.add(pluginFind, async function (msg, response) {
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
      // Merge Options
      newoptions = mergeOptions(options, newoption)

      await findRethinkJob(msg)
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

  let findRethinkJob = async function (qdata) {
    return new Promise(async(resolve, reject) => {
      try {
        // check port number range
        checkPortNumber(newoptions.connctionOption.port)
        .then(async result => {
          let queueObj = await createJobQueue(newoptions.connctionOption, newoptions.queueOption)
          queueObj.on('error', (err) => {
            // err object is system error
            reject(customError(err))
          })

          await findJob(queueObj, qdata.findVal)
            .then(result => {
              resolve(result)
            })
            .catch(err => { customError(err) })
        })
        .catch(err => {
          // this is return custom error
          reject(err)
        })
        // let dbDriver = await createRethinkdbDash(options.connctionOption)
      } catch (err) {
        // some system fatal error happend - no way to recover !!
        reject(customError(err))
      }
    })
  }

  let createRethinkJobQueue = async function (qdata) {
    return new Promise(async(resolve, reject) => {
      try {
        // check port number range
        checkPortNumber(newoptions.connctionOption.port)
        .then(async result => {
          let queueObj = await createJobQueue(newoptions.connctionOption, newoptions.queueOption)
          queueObj.on('error', (err) => {
            // err object is system error
            reject(customError(err))
          })
          let job = await createJob(queueObj, qdata)
          let savedJobs
          await addJob(queueObj, job)
            .then(result => {
              savedJobs = {'jobId': result[0].id}
            })
            .catch(err => { customError(err) })
          resolve(savedJobs)
        })
        .catch(err => {
          // this is return custom error
          reject(err)
        })
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
                      .catch(err => {
                        reject(err)
                      }
                    )
        // return added
      } catch (err) {
        reject(err)
      }
    })
  }

  // find job from rethinkDB
  let findJob = async function (queueObj, val) {
    return new Promise(async (resolve, reject) => {
      try {
        queueObj.findJob(val,true).then((jobs) => {
          // jobs will either be an empty array
          // or an array of Job objects
          resolve(jobs)
        }).catch(err => reject(err))
      } catch (err) {
        reject(err)
      }
    })
  }
}

let customError = function (err, errorCode) {
  let errorKey = 'ERR_SERVICE_UNAVAIALBLE'
  if (err['ReqlDriverError'] !== '') {
    errorKey = 'ERR_REQLDRIVERERROR'
  }
  let errRes = {}
  errRes['error'] = {
    'message': gErrMessages[errorKey] || gErrMessages['ERR_SERVICE_UNAVAIALBLE']
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
  'ERR_SERVICE_UNAVAIALBLE': 'Service not avaialble',
  'ERR_REQLDRIVERERROR': 'RethinkDB service unavaialble'
}
