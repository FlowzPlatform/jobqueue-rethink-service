var Seneca = require('seneca')
const config = require('config')

let pluginPin = 'role:job,cmd:create'
if (config.has('pluginOptions.pin')) {
  pluginPin = config.get('pluginOptions.pin')
}

//console.log("============================",Seneca1.find(pluginPin),"==========================")

try {
  Seneca({
    internal: { logger: require('seneca-demo-logger') },
    debug: { short_logs: true },
    transport: {
      type: 'tcp'
    }
  })
  .use('job')
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
  console.log("==============", err)
}
//console.log("============================",Seneca.find(pluginPin),"==========================")


//
// var seneca = require('seneca')()
//   .add('a:1', function (msg, reply) { reply() })
//   .add('b:1', function (msg, reply) { reply() })
//
// // Exact match. Prints: action metadata
// console.log(seneca.find('a:1'))
//
// // Exact match. Prints: action metadata
// console.log(seneca.find('b:1'))
//
// // Not found. Prints: null
// console.log(seneca.find('c:1'))
