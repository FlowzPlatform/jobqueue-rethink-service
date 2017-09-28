var Seneca = require('seneca')
const config = require('config')

let pluginPin = 'role:producer,cmd:produce'

try {
  Seneca({
    internal: { logger: require('seneca-demo-logger') },
    debug: { short_logs: true },
    transport: {
      type: 'tcp'
    }
  })
  .use('kafkaProducer')
  .use('mesh', {
    // bases: ['127.0.0.1'],
    // port: 39100,
    auto: true,
    base: true,
    isbase: true,
    listen: [
      {pin: pluginPin, timeout: 99999}
    ],
    discover: {
      registry: {
        active: true
      },
      multicast: {
        active: true
      }
    }
  })
} catch (err) {
  console.log(err)
}
