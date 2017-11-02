let senecaObj = require('seneca')()
const webconfig = require('config')
let pluginPin = 'role:job,cmd:create'
if (webconfig.has('pluginOptions.pin')) {
  pluginPin = webconfig.get('pluginOptions.pin')
}
let pluginFind = 'role:job,cmd:findjob'

let createJob = function (bodyData) {
  return new Promise((resolve, reject) => {
    senecaObj.use('job').act(pluginPin, bodyData, (err, result) => {
      if (err) {
        reject(err)
      } else {
        resolve(result)
      }
    })
  })
}

let findJob = function (bodyData) {
  return new Promise((resolve, reject) => {
    senecaObj.use('job').act(pluginFind, bodyData, (err, result) => {
      if (err) {
        reject(err)
      } else {
        resolve(result)
      }
    })
  })
}

let pluginQueue = 'role:job,cmd:queue'

let getJobQueue = function (options) {
  return new Promise((resolve, reject) => {
    senecaObj.use('job').act(pluginQueue, options, (err, result) => {
      if (err) {
        reject(err)
      } else {
        resolve(result)
      }
    })
  })
}

module.exports.createJob = createJob

module.exports.findJob = findJob

module.exports.getJobQueue = getJobQueue
