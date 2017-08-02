var seneca = require('seneca')

seneca({tag:'job'})

	.use('job')
  //.use('mesh', {isbase: true, pin: 'role:job,cmd:create', timeout: 999999})
  .use('mesh', {
    isbase: true,
		timeout: 999999,
		listen: [
			{pin: 'role:job,cmd:create', model: 'observe'}
		]
	})
  .ready(function(){
    console.log("job ready")
  })

//
//
// const Queue = require('rethinkdb-job-queue')
// const _ = require('underscore')
//
// const defaultConnectionOptions =  {
//   host: '139.59.35.45',
//   port: 28016,
//   db: 'jobQueue'
// }
//
// const defaultQueueOption = {
//   name: 'SendEmail'
// }
//
//
// let options = {
//   queueOption: defaultQueueOption,
//   data: {},
//   connctionOption: defaultConnectionOptions
// }
//
//
// seneca.add('role:job,cmd:create', (args, reply) => {
//   createRethinkJobQueue(args.data,reply)
// }).use('mesh', {
//   // this is a base node
//   isbase: true,
//   //port: 39002,
//   //host: '127.0.0.1',
//   // this service will respond to the format:hex pattern
//   pin: 'role:job,cmd:create', timeout: 999999
// }).ready(function () {
//   console.log('base', this.id)
// })
//
// let createRethinkJobQueue = async function (qdata,reply) {
//   try {
//     const rethinkJobqObj = new Queue(options.connctionOption, options.queueOption)
//     const job = await rethinkJobqObj.createJob({ data:qdata })
//     let savedJobs = await rethinkJobqObj.addJob(job)
//     reply(null, {data:"savedJobs"})
//   } catch (err) {
//     reply(err, {})
//   }
// }
