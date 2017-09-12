var Seneca = require('seneca')
const config = require('config')

let pluginPin = 'role:job,cmd:create'
if (config.has('pluginOptions.pin')) {
  pluginPin = config.get('pluginOptions.pin')
}

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
