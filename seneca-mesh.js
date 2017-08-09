let seneca = require('seneca')()

let bodyData = {
	"host":"smtp.gmail.com",
	"port":465,
	"secure":true,
	"user":"obsoftcare@gmail.com",
	"password":"Welcome123@",
	"to":"abcd@vmail.officebrain.com",
	"from":"info@vmail.officebrain.com",
	"subject":"this is test mail",
	"body":"this is message body"
}
//
// senecaObj()
// 	.use('mesh',{timeout: 999999})
// 	.act('role:job,cmd:create', bodyData, (err, done) => {
//
// 		console.log('test-mesh err.', err)
// 	if (err) {
// 		console.log('test-mesh err.', err)
// 	}
// 	console.log('test-mesh done.', done)
// })


seneca.ready(function(err) {
	seneca.client()
	seneca.use('mesh', {
		host: 'localhost'
	});
	seneca.act({role: 'job', cmd: 'create', msg: bodyData}, (err, done) => {
		if (err) { throw err; }
		console.log('test-mesh done.', done);
	});
	seneca.close((err) => {
		if (err) { console.log(err); }
		else { console.log('seneca closed.'); }
	});
});

//let SenecaClient = senecaObj.client()

// SenecaClient.act({role: 'email', cmd: 'send'}, function (args, result) {
//   console.log(result)
// })

//senecaObj.use('job').act('role:job,cmd:create,to:abc@vmail.com,from:pqr1@vmail.com', console.log)

//senecaObj.use('mesh').act('role:job,cmd:create',{to:'abc@vmail.com',from:'pqr1@vmail.com'}, console.log)



// // Queue options have defaults and are not required
// const queueOption1 = {
//   name: 'RegistrationEmail', // The queue and table name
//   masterInterval: 310000, // Database review period in milliseconds
//   changeFeed: true, // Enables events from the database table
//   concurrency: 100,
//   removeFinishedJobs: 2592000000, // true, false, or number of milliseconds
// }

// // Connection options have defaults and are not required
// // You can replace these options with a rethinkdbdash driver object
// const connctionOption1 = {
//   host: '139.59.35.45',
//   port: 28016,
//   db: 'jobQueue' // The name of the database in RethinkDB
// }

//senecaObj.use('job',{queueOption:queueOption1}).act('role:job,cmd:create,to:abc@vmail.com,from:pqr1@vmail.com', console.log)
