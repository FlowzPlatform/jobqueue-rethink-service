const Kafka = require('node-rdkafka')
const config = require('config')

let defaultKafkaProducer = config.get('defaultKafkaProducer')
let pluginCreate = 'role:producer,cmd:produce'
let createKafkaProducer = function (kafkaOptions) {
  try {
    let kafkaProducer = new Kafka.Producer({
      // 'debug' : 'all',
      'metadata.broker.list': 'localhost:9092',
      'dr_cb': true  // delivery report callback
    })

    kafkaProducer.on('ready', function (arg) {
      console.log('producer ready.' + JSON.stringify(arg))
    })
    kafkaProducer.on('delivery-report', function (err, report) {
      if (!err) {
        console.log('delivery-report: ' + JSON.stringify(report))
      }
    })
    kafkaProducer.on('disconnected', function (arg) {
      console.log('producer disconnected. ' + JSON.stringify(arg))
    })
    //starting the producer
    kafkaProducer.connect()
    return kafkaProducer
  } catch (e) {
    // kafkaProducer.disconnect()
    console.log(e)
  }
}

// console.log(defaultConnectionOptions, defaultQueueOption, defaultCreateJobOption)
module.exports = function kafkaProducer (options) {
  let plugin = this
  let kafkaProducer = createKafkaProducer(defaultKafkaProducer)

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

  let produceMessage = function (topicName, message) {
    return new Promise((resolve, reject) => {
      try {
        var key = 'key - ' + topicName + message
        // if partition is set to -1, librdkafka will use the default partitioner
        var partition = -1
        let objBufValue = new Buffer(message)
        kafkaProducer.produce(topicName, partition, objBufValue, key)
        resolve({msg: 'message produce successfully'})
      } catch (err) {
        kafkaProducer.disconnect()
        reject(err)
      }
    })
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
      console.log(msg)
      produceMessage(msg.topic, msg.message)
      .then(result => response(null, result))
      .catch(err => response(err))
    } catch (err) {
      response(err)
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
