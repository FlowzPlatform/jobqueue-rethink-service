const Queue = require('rethinkdb-job-queue')
const config = require('config')

let pluginSubscriptionCreate = 'role:subscription,cmd:created'
let pluginCreate = 'role:job,cmd:create'
let pluginFind = 'role:job,cmd:findjob'
let pluginQueue = 'role:job,cmd:queue'
if (config.has('pluginOptions.pin')) {
  pluginCreate = config.get('pluginOptions.pin')
}

let dbConfig = config.get('defaultConnection')
let qConfig = config.get('defaultQueue')
let subsConfig = config.get('defaultSubscription')

const qCreateOption = config.get('defaultCreateJob')

const defaultOption = {
  connction: dbConfig,
  queue: qConfig,
  options: qCreateOption,
  subscription: subsConfig
}
// console.log(defaultConnectionOptions, defaultQueueOption, defaultCreateJobOption)
module.exports = function job (options) {
  let rethinkDBInfo, newoptions
  let plugin = this
  let priority = ['lowest', 'low', 'normal', 'medium', 'high', 'highest']
  let mergeOptions = function (fOptions, mOption) {
    try {
      return plugin.util.deepextend({
        queue: fOptions.queue,
        connction: fOptions.connction,
        options: fOptions.options,
        subscription: fOptions.subscription
      }, mOption)
    } catch (err) {
      return fOptions
    }
  }

  options = mergeOptions(defaultOption, options)
  // console.log('======after merge========', options)
  let validateRequestBody = function (msg) {
    if (msg.request$ !== undefined) {
      var contype = msg.request$.headers['content-type']
      if (!contype || contype.indexOf('application/json') !== 0) {
        let err = {error: {message: gErrMessages['ERR_CONTENT_TYPE'], code: 'ERR_CONTENT_TYPE'}}
        return [err, null]
      }

      if (msg.args !== undefined && msg.args.body !== undefined && msg.args.body !== '') {
        try {
          let paserBody = JSON.parse(msg.args.body)
          return [null, paserBody]
        } catch (err) {
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

  this.add(pluginCreate, async function (msg, response) {
    try {
      // validate parameter
      let validParamErr
      [validParamErr, msg] = validateRequestBody(msg)
      if (validParamErr) {
        response(validParamErr)
        return false
      }

      // if any option pass as parameter it will create jobs
      let newoption = {
        queue: msg.queue,
        connction: msg.connction,
        options: msg.options
      }
      // Merge Options
      newoptions = mergeOptions(options, newoption)
      //console.log("=====================job Options=======",newoptions)
      await createRethinkJobQueue(msg)
        .then(result => {
          // add to subscription queue when its enable
          if (options.subscription.enable === true) {
            jData = Object.assign({}, result, rethinkDBInfo)
            addToScubscriptionQueue(plugin, jData)
          }
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

  let addToScubscriptionQueue = function (plugin, JobData) {
    // plugin.use('subscription').act(pluginSubscriptionCreate, JobData, function (err, Result) {
    //   if (err) {
    //     return false
    //   } else {
    //     return true
    //   }
    // })
  }

  this.add(pluginQueue, async function (msg, response) {
    try {
      // validate parameter
      let validParamErr
      [validParamErr, msg] = validateRequestBody(msg)
      if (validParamErr) {
        response(validParamErr)
        return false
      }
      // if any option pass as parameter it will create jobs
      let newoption = {
        queue: msg.queue,
        connction: msg.connction,
        options: msg.options
      }
      // Merge Options
      newoptions = mergeOptions(options, newoption)
      // console.log("===========queue=obj==================")
      let queueObj = await createJobQueue(newoptions.connction, newoptions.queue)
      queueObj.on('error', (err) => {
        // err object is system error
        response(customError(err))
      })
      response({q:queueObj})
    } catch (err) {
      response(err)
    }
  })

  this.add(pluginFind, async function (msg, response) {
    try {
      // validate parameter
      let validParamErr
      [validParamErr, msg] = validateRequestBody(msg)
      if (validParamErr) {
        response(validParamErr)
        return false
      }

      // if any option pass as parameter it will create jobs
      let newoption = {
        queue: msg.queue,
        connction: msg.connction,
        options: msg.options
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
        checkPortNumber(newoptions.connction.port)
        .then(async result => {
          let queueObj = await createJobQueue(newoptions.connction, newoptions.queue)
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
        // let dbDriver = await createRethinkdbDash(options.connction)
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
        checkPortNumber(newoptions.connction.port)
        .then(async result => {
          let queueObj = await createJobQueue(newoptions.connction, newoptions.queue)
          queueObj.on('error', (err) => {
            // err object is system error
            reject(customError(err))
          })
          let job = await createJob(queueObj, qdata)
          let savedJobs
          await addJob(queueObj, job)
            .then(result => {
              savedJobs = result // {'jobId': result[0].id}
            })
            .catch(err => { customError(err) })
          resolve(savedJobs)
        })
        .catch(err => {
          // this is return custom error
          reject(err)
        })
        // let dbDriver = await createRethinkdbDash(options.connction)
      } catch (err) {
        // some system fatal error happend - no way to recover !!
        reject(customError(err))
      }
    })
  }


  let createJobQueue = function (dbDriver, queueOption) {
    try {
      rethinkDBInfo = {'jobHost': dbDriver.host, 'port': dbDriver.port, 'jobDB': dbDriver.db, 'jobType': queueOption.name}
      return new Queue(dbDriver, queueOption)
    } catch (err) {
      return (err)
    }
  }

  let createJob = async function (queueObj, QData) {
    try {
      delete QData.queue
      delete QData.connction
      // delete QData.options
      let jobs = []
      if (QData.jobs !== undefined && Array.isArray(QData.jobs)) {
        for (let i = 0; i < QData.jobs.length; i++) {
          let jobObj = await singleCreateJobObj(queueObj, QData.jobs[i])
          //console.log("=====new jobs======",jobObj)
          jobs.push(jobObj)
        }
      } else {
        jobs = await singleCreateJobObj(queueObj, QData)
      }
      return jobs
    } catch (err) {
      return (err)
    }
  }

  let singleCreateJobObj = function (queueObj, jData) {
    return new Promise(async (resolve, reject) => {
      // if any option pass as parameter it will create jobs
      let newCreateJoboption = {
        options: jData.options
      }
      //console.log("===============",newCreateJoboption,"========",newoptions.options)
      // Merge Options
      try {
        newCreateJoboption = plugin.util.deepextend({
          options: newoptions.options
        }, newCreateJoboption)
      } catch (err) {}
      //console.log("=======new options========",newCreateJoboption)

      let qObj = await queueObj.createJob({data: jData})
      // set job queue priority options

      if (newCreateJoboption.options.priority !== 'undefined'
          && newCreateJoboption.options.priority !== ''
          && priority.includes(newCreateJoboption.options.priority)) {
        qObj.setPriority(newCreateJoboption.options.priority)
      }
      // set job queue Timeout options
      if (newCreateJoboption.options.timeout !== 'undefined' &&
          newCreateJoboption.options.timeout !== '' &&
          typeof (newCreateJoboption.options.timeout) === 'number') {
        qObj.setTimeout(newCreateJoboption.options.timeout)
      }
      // set job queue RetryMax options
      if (newCreateJoboption.options.retrymax !== 'undefined' &&
        newCreateJoboption.options.retrymax !== '' &&
        typeof (newCreateJoboption.options.retrymax) === 'number') {
        qObj.setRetryMax(newCreateJoboption.options.retrymax)
      }
      // set job queue RetryDelay options
      if (newCreateJoboption.options.retrydelay !== 'undefined' &&
          newCreateJoboption.options.retrydelay !== '' &&
          typeof newCreateJoboption.options.retrydelay === 'number') {
        qObj.setRetryDelay(newCreateJoboption.options.retrydelay)
      }
      // set job queue RetryDelay options
      if (newCreateJoboption.options.name !== 'undefined' &&
          newCreateJoboption.options.name !== '' &&
          typeof newCreateJoboption.options.name === 'string') {
        qObj.setName(newCreateJoboption.options.name)
      }
      resolve(qObj)
    })

  }

  let addJob = async function (queueObj, job) {
    return new Promise(async (resolve, reject) => {
      try {
        //console.log("=====add jobs======",job)
        await queueObj.addJob(job)
                      .then(result => {
                        // console.log('=========================', result)
                        result = {job: result.map(function (a) { delete a.q; return a })}
                        resolve(result)
                      })
                      .catch(err => {
                        reject(err)
                      }
                    )
        // return added
      } catch (err) {
        //console.log("========addjob==catch========",err)
        reject(err)
      }
    })
  }

  // find job from rethinkDB
  let findJob = async function (queueObj, val) {
    return new Promise(async (resolve, reject) => {
      try {
        queueObj.findJob(val, true).then((jobs) => {
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
    'message': gErrMessages[errorKey] || gErrMessages['ERR_SERVICE_UNAVAIALBLE'],
    'system_message': err.msg || ''
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
  'ERR_REQLDRIVERERROR': 'RethinkDB service unavaialble',
  'ERR_PRAMATER_MISSING': 'job data missing, Please provide body as paramater',
  'ERR_CONTENT_TYPE': 'Content-Type should be application/json',
  'ERR_INVALID_PRAMATER': 'Please provide valid paramater'
}
