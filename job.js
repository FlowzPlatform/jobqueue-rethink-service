const Queue = require('rethinkdb-job-queue')
const _ = require('underscore')

//139.59.35.45     //172.16.230.196
const defaultConnectionOptions =  {
  host: '139.59.35.45',
  port: 28016,
  db: 'jobQueue'
}

const defaultQueueOption = {
  name: 'SendEmail'
}

module.exports = function job (options) {
  options = this.util.deepextend({
    queueOption: defaultQueueOption,
    data: {},
    connctionOption: defaultConnectionOptions
  }, options)

  this.add('role:job,cmd:create', async function emailSend (msg, response) {
    let err, result = await createRethinkJobQueue(msg.data)
    response(err, result)
  })
  //.use('mesh', {isbase: true, pin: 'role:job,cmd:create', timeout: 999999})
  //.listen({port: 5000, pin: 'role:job,cmd:create'})

  let createRethinkJobQueue = async function (qdata) {
    try {
      const rethinkJobqObj = new Queue(options.connctionOption, options.queueOption)
      const job = await rethinkJobqObj.createJob({ data:qdata })
      let savedJobs = await rethinkJobqObj.addJob(job)
      console.log(savedJobs[0].id)
      savedJobs = {'jobId':savedJobs[0].id}
      return null, savedJobs
    } catch (err) {
      return err, {}
    }
  }
}
