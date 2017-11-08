'use strict'

const seneca = require('seneca')({log: 'silent'})
var app = require('express')()
const Web = require('seneca-web')
const cors = require('cors')
const webconfig = require('config')
const pino = require('pino')

const pluginCreate = webconfig.get('plugins.createPattern')
const pluginFind = webconfig.get('plugins.findPattern')
const pluginUpdate = webconfig.get('plugins.updatePattern')
const PINO = webconfig.get('pino')
const webPort = webconfig.get('web-option.port')
const urlPrefix = webconfig.get('web-option.urlPrefix')

var Routes = [
  {
    prefix: urlPrefix,
    pin: pluginCreate,
    map: {
      create: {GET: false, POST: true}
    }
  },
  {
    prefix: urlPrefix,
    pin: pluginUpdate,
    map: {
      update: {GET: false, POST: true}
    }
  },

  {
    prefix: urlPrefix,
    pin: pluginFind,
    map: {
      find: {GET: false, POST: true}
    }
  }
]

app.use(cors())

var config = {
  routes: Routes,
  adapter: require('seneca-web-adapter-express'),
  context: app,
  options: {parseBody: true}
}

seneca.client()
.use(Web, config)
.use('job')
.ready(() => {
  var server = seneca.export('web/context')()
  server.listen(webPort, () => {
    pino(PINO).info('server started on:', webPort)
  })
})
