const Queue = require('rethinkdb-job-queue')
// const RethinkDBDash = require('rethinkdbdash')

//139.59.35.45     //172.16.230.196
const defaultConnectionOptions = {
  host: '139.59.35.45',
  port: 28016,
  db: 'jobQueue'
}

const defaultQueueOption = {
  name: 'SendEmail'
}

module.exports = function job (options) {
  let Seneca = this
  options = this.util.deepextend({
    queueOption: defaultQueueOption,
    connctionOption: defaultConnectionOptions
  }, options)

  this.add('role:job,cmd:create', async function (msg, response) {
    // Seneca.error(response)
    try {
      // let {err, result} = await createRethinkJobQueue(msg)
      await createRethinkJobQueue(msg)
        .catch(err => {
            response(err)
        })
        .then(result => {
          response(null, result)
        })
    } catch (err) {
      response(err)
    }
  }).listen()

  let createRethinkJobQueue = async function (qdata) {
    return new Promise(async(resolve, reject) => {
      try {
        // check port number range
        await checkPortNumber(options.connctionOption.port)
        .catch(err => { reject(err) })
        .then(async result => {
          let queueObj = await createJobQueue(options.connctionOption, options.queueOption)
          queueObj.on('error', (err) => { reject(err) })
          let job = await createJob(queueObj, { data: qdata })
          let savedJobs
          await addJob(queueObj, job)
            .then(result => {
              savedJobs = {'jobId': result[0].id}
            })
            .catch(err => { reject(err) })
          resolve(savedJobs)
        })
        // let dbDriver = await createRethinkdbDash(options.connctionOption)

      } catch (err) {
        reject(customError(err))
      }
    })
  }

  // let createRethinkdbDash = function (connctionOption) {
  //   try {
  //     return RethinkDBDash(connctionOption)
  //   } catch (err) {
  //     return (err)
  //   }
  // }

  let createJobQueue = function (dbDriver, queueOption) {
    try {
      return new Queue(dbDriver, queueOption)
    } catch (err) {
      return (err)
    }
  }

  let createJob = async function (queueObj, QData) {
    try {
      return await queueObj.createJob({data: QData})
    } catch (err) {
      return (err)
    }
  }

  let addJob = async function (queueObj, job) {
    return new Promise(async (resolve, reject) => {
      try {
        await queueObj.addJob(job)
                      .catch(err => { throw err })
                      .then(result => resolve(result))
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
    'message': err.message || 'Service not avaialble'
  }
  errRes['status'] = errorCode || 404
  return errRes
}

let checkPortNumber = function (port) {
  return new Promise(async (resolve, reject) => {
    if (port > 65535) {
      reject({error: {message: 'port number should be less thne 65536'}})
    }
    resolve(true)
  })
}
