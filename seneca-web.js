'use strict'

const Seneca = require('seneca')
const Express = require('express')
const Web = require('seneca-web')
const cors = require('cors')

var Routes = [{
  prefix: '/job',
  pin: 'role:job,cmd:create',
  map: {
		create: {GET: false, POST: true}
	}
}]

var seneca = Seneca()

let expObj = Express()
expObj.use(cors())
// expObj.use(bodyParser.json());
// expObj.use(bodyParser.urlencoded({ extended: false }));

var config = {
  routes: Routes,
  adapter: require('seneca-web-adapter-express'),
  context: expObj,
  options: {parseBody: true}
}

seneca.client()
.use(Web, config)
.use('job')
.ready(() => {
  var server = seneca.export('web/context')()
  server.listen('4000', () => {
    console.log('server started on: 4000')
  })
})
