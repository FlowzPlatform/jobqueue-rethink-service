let rjob = require('./index')

let senecaObj = require('seneca')()
const webconfig = require('config')
let pluginPin = 'role:producer,cmd:produce'

let produceMessage = function (bodyData) {
  return new Promise((resolve, reject) => {
    senecaObj.use('kafkaProducer').act(pluginPin, bodyData, (err, result) => {
      if (err) {
        reject(err)
      } else {
        resolve(result)
      }
    })
  })
}
let msg = {
	"topic": 'test',
	"message": "Register successfully"
}

produceMessage(msg)
.then(result => console.log(result))
.catch(err => console.log(err))
