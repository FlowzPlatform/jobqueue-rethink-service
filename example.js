let rjob = require('./index')

// for create rethinkdb job create

let bodyData = {
	"to":"abcd@yourdomain.com",
	"from":"info@yourdomain.com",
	"subject":"Register successfully",
	"body": "you are registered successfully on our site"
}

rjob.createJob(bodyData)
.then(result => console.log(result))
.catch(err => console.log(err))

// for find job data

let findData = {
	"findVal": {
		"data": {"subject":"Register successfully"}
	}
}

rjob.findJob(findData)
.then(result => console.log(result))
.catch(err => console.log(err))
