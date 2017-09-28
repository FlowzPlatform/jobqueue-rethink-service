'use strict'

const Seneca = require('seneca')
const Express = require('express')
// const bodyParser = require('body-parser')
const Web = require('seneca-web')
const cors = require('cors')

const webconfig = require('config')
let pluginPin = 'role:producer,cmd:produce'

let webPort = 5555

let urlPrefix = '/producer'

var Routes = [
  {
    prefix: urlPrefix,
    pin: pluginPin,
    map: {
      produce: {GET: false, POST: true}
    }
  }
]

var seneca = Seneca({
//  internal: { logger: require('seneca-demo-logger') },
//  debug: { short_logs: true }
})

let expObj = Express()
expObj.use(cors())
// expObj.use(bodyParser.json())
// expObj.use(bodyParser.urlencoded({ extended: false }))

var config = {
  routes: Routes,
  adapter: require('seneca-web-adapter-express'),
  context: expObj,
  options: {parseBody: true}
}

seneca.client()
.use(Web, config)
.use('kafkaProducer')
.ready(() => {
  var server = seneca.export('web/context')()
  server.listen(webPort, () => {
    console.log('server started on: ', webPort)
  })
})
