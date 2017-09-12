![Seneca]
> A [Seneca.js][] RethinkDB job queue plugin

# seneca-rethink-job-queue

A plugin that allows you to create rethinkdb-job-queue.


If you're using this module, and need help, you can:
- Post a [github issue][],

If you are new to Seneca in general, please take a look at [senecajs.org][]. We have everything from
tutorials to sample apps to help get you up and running quickly.

## Install
To install, simply use npm. Remember you will need to install [Seneca.js][] if you haven't already.

```
npm install seneca-rethink-job-queue
```

## Usage in the same process

```js
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
	"to":"abcd@vmail.officebrain.com",
	"from":"info@vmail.officebrain.com",
	"subject":"Register successfully",
	"body": "you are registered successfully on our site"
}

senecaObj.use('job').act('role:job,cmd:create',bodyData, console.log)

```

## Usage in seneca-mesh
start server as
node server.js
### client

```js
let seneca = require('seneca')

let pluginPin = 'role:job,cmd:create'

let bodyData = {
	"to":"abcd@vmail.officebrain.com",
	"from":"info@vmail.officebrain.com",
	"subject":"this is test mail",
	"body":"this is message body"
}

seneca()
	.use('mesh')
	.ready(function () {
		let _senecaObj = this
		_senecaObj.act(pluginPin, {msg: bodyData}, (err, done) => {
			try {
				if (err) {
					console.log('Error:', err)
					//throw err;
				}
				console.log('Response:', done)
			} catch (e) {
				console.log('Error:', e)
			}
			_senecaObj.close((err) => {
					if (err) {
						console.log('Close Error:', e)
					} else {
						console.log('seneca closed.')
					}
				})
		})
	})
```

### Create Job as Rest API
Start rest api service as
node seneca-web.js

### make rest-api call like
http://localhost:4546/job/create
post data like as below
{
	"to":"abcd@vmail.officebrain.com",
	"from":"info@vmail.officebrain.com",
	"subject":"this is test mail",
	"body":"this is message body"
}
