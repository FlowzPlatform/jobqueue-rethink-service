const Queue = require('rethinkdb-job-queue')
const config = require('config')

let pluginCreate = 'role:subscription,cmd:created'

let dbConfig = config.get('defaultConnection')
let qConfig = config.get('defaultQueue')

const qCreateOption = config.get('defaultCreateJob')

const defaultOption = {
  connction: dbConfig,
  queue: qConfig,
  options: qCreateOption
}
// console.log(defaultConnectionOptions, defaultQueueOption, defaultCreateJobOption)
module.exports = function job (options) {
  let rethinkDBInfo, newoptions
  let plugin = this

  let validateRequestBody = function (msg) {
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
      createSubscriptionQueue(msg)
    } catch (err) {
      response(err)
    }
  })

  // create
  let createSubscriptionQueue = function (senecaObj, data) {
    return new Promise((resolve, reject) => {
      let jobData = data
      jobData.connction = defaultOption.connction
      jobData.queue = defaultOption.queue
      jobData.options = defaultOption.options
      jobData.queue.name = 'subscription'
      senecaObj.use('job').act('role:job,cmd:create', jobData, function () {

      })
    })
  }

}
