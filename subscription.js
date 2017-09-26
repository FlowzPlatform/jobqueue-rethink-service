const Queue = require('rethinkdb-job-queue')
const config = require('config')

let pluginSubscriptionCreate = 'role:subscription,cmd:created'

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
  let plugin = this

  this.add(pluginSubscriptionCreate, async function (msg, response) {
    try {
      createSubscriptionQueue(plugin, msg)
      let result = {'msg': 'add to subscription queue'}
      response(null, result)
    } catch (err) {
      response(err)
    }
  })
  // create
  let createSubscriptionQueue = function (plugin, jobData) {
    return new Promise((resolve, reject) => {
      let newOptions1 = {
        connction : defaultOption.connction,
        queue : defaultOption.queue,
        options : defaultOption.options,
        subscription : defaultOption.subscription
      } //

      let sOptions = {
        "queue" : {
          "name": "subscription",

        },
        "option" : {
          "priority": "normal",

        },
        "subscription": {
          "enable": false
        }
      }

      newOptions1 = plugin.util.deepextend({
        queue: sOptions.queue,
        subscription: sOptions.subscription
      }, newOptions1)
      let senecaObj = require('seneca')()
      senecaObj.use('job',sOptions).act('role:job,cmd:create', jobData, function (err,result) {
        if(!err) {
          console.log('======subscription job created===')
        }
      })
      resolve("done")
    })
  }
}
