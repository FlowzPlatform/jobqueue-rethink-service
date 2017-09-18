### seneca-rethink-jobqueue

A plugin that allows you to create rethinkdb-jobqueue.


If you're using this module, and need help, you can:
- Post a [github issue][],

If you are new to Seneca in general, please take a look at [senecajs.org][]. We have everything from
tutorials to sample apps to help get you up and running quickly.

## Install
To install, simply use npm. Remember you will need to install [Seneca.js][] if you haven't already.

```
npm install seneca-rethink-jobqueue
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
	"to":"abcd@yourdomain.com",
	"from":"info@yourdomain.com",
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
	"to":"abcd@yourdomain.com",
	"from":"info@yourdomain.com",
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

### Create Job using Rest API
Start rest api service as
```
node seneca-web.js
```
#### make rest-api call using PostMen

http://localhost:5000/job/create

post data like as below

```
{
	"to":"abcd@yourdomain.com",
	"from":"info@yourdomain.com",
	"subject":"this is test mail",
	"body":"this is message body"
}
```
#### parameter options

post data like as below

```
{
  "connctionOption" : {
    "host": "localhost",
    "port": 28015,
    "db": "jobqueue"
  },
  "queueOption" : {
    "name": "registartion"
  },
	"to":"abcd@yourdomain.com",
	"from":"info@yourdomain.com",
	"subject":"this is test mail",
	"body":"this is message body"
}
```

#### multiple job created

post data like as below

```
{
	"connction" : {
		"host":"localhost",
	    "port": 28015,
	    "db": "jobqueue"
	  },
	  "queue" : {
	    "name": "registartion"
	  },
	  "options" : {
	    "priority": "normal",
	    "timeout": 499999,
	    "retrymax": 1,
	    "retrydelay": 500000
	  },

	"jobs" : [
		{
			"subject":"this is test mail-1",
			"options" : {
			    "priority": "high",
			    "timeout": 700000,
			    "retrymax": 5,
			    "retrydelay": 100000
			  }
		},
		{
			"subject":"this is test mail-2",
			"options" : {
				"priority": "highest",
			    "timeout": 700000,
			    "retrymax": 4,
			    "retrydelay": 100000,
			    "name" :"Password-Update-Mail"
			}
		},
		{
			"subject":"this is test mail-3",
			"options" : {
			    "priority": "medium",
			    "timeout": 700000,
			    "retrymax": 3,
			    "retrydelay": 100000
			  }
		}
	]
}
```

### find job using REST API

http://localhost:5000/job/find

post data like as below

```
"find": {
	"status":"waiting"
	}
```
#### more parameter options

post data like as below

```
{
  "connction" : {
    "host": "localhost",
    "port": 28015,
    "db": "jobqueue"
  },
  "queue" : {
    "name": "registartion"
  },
  "find": {
  	"data":{"subject":"this is test mail"}
  }
}
```
