const Queue = require('rethinkdb-job-queue')

//139.59.35.45     //172.16.230.196
const defaultConnectionOptions = {
  host: 'localhost',
  port: 28015,
  db: 'jobQueue'
}

const defaultQueueOption = {
  name: 'SendEmail'
}

module.exports = function job (options) {
  options = this.util.deepextend({
    queueOption: defaultQueueOption,
    connctionOption: defaultConnectionOptions
  }, options)

  this.add('role:job,cmd:create', async function emailSend (msg, response) {
    let {err, result} = await createRethinkJobQueue(msg)
    if (err) {
      response(err)
    } else {
      response(null, result)
    }
  })

  let createRethinkJobQueue = async function (qdata) {
    try {
      let queueObj = await createJobQueue(options.connctionOption, options.queueOption)
      queueObj.on('error', (err) => { throw err })
      let job = await createJob(queueObj, { data: qdata })
      let savedJobs
      await addJob(queueObj, job)
        .then(result => {
          savedJobs = {'jobId': result[0].id}
        })
        .catch(err => { throw err })
      return {err: null, result: savedJobs}
    } catch (err) {
      return {err: customError(err), result: null}
    }
  }

  let createJobQueue = function (connctionOption, queueOption) {
    try {
      return new Queue(connctionOption, queueOption)
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
