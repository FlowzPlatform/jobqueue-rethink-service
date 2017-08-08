let senecaObj = require('seneca')()

// Queue options have defaults and are not required
const queueOption1 = {
  name: 'RegistrationEmail', // The queue and table name
  masterInterval: 310000, // Database review period in milliseconds
  changeFeed: true, // Enables events from the database table
  concurrency: 100,
  removeFinishedJobs: 2592000000 // true, false, or number of milliseconds
}

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

senecaObj.use('job').act({role:'job',cmd:'create'},bodyData, console.log)

// // Connection options have defaults and are not required
// // You can replace these options with a rethinkdbdash driver object
// const connctionOption1 = {
//   host: '139.59.35.45',
//   port: 28016,
//   db: 'jobQueue' // The name of the database in RethinkDB
// }
// senecaObj.use('job',{queueOption:queueOption1, connctionOption: connctionOption1}).act('role:job,cmd:create,to:abc@vmail.com,from:pqr1@vmail.com', console.log)
