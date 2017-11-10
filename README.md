# Rethink-Jobqueue-Service

Rethink Jobqueue service provides rest-api to create rethinkdb job queue. its use seneca-web and seneca
plugin. We can create job queue with full options like (connction, queue options, and job options).

Rethink-Jobqueue-Service provides rest-api for register worker process. so we can register job type based each worker process.

Rethink-Jobqueue-Service provides Symmetric Worker. Using Symmetric worker we can process our job
dynamically. We have to just register our job type. we can register and un-register job type using rest-api. Symmetric worker dynamically process each job based on job type and register job process.

## Prerequisites
Make sure you have installed all of the following prerequisites on your development machine:
* Git - [Download & Install Git](https://git-scm.com/downloads). OSX and Linux machines typically have this already installed.

* Node.js - [Download & Install Node.js](https://nodejs.org/en/download/) and the npm package manager. If you encounter any problems, you can also use this [GitHub Gist](https://gist.github.com/isaacs/579814) to install Node.js.

* RethinkDB - [Download & Install RethinkDB](https://rethinkdb.com/docs/install/), and make sure it's running.


### Cloning The GitHub Repository
The recommended way to get application is to use git to directly clone the Rethink Job queue Service repository:

```bash
$ git clone git@github.com:FlowzPlatform/rethink-jobqueue-service.git
```

This will clone the latest version of the Rethink Job queue Service repository to the local folder.

### Downloading The Repository Zip File
Another way to use the Rethink Job queue Service is to download a zip copy from the [master branch on GitHub](https://github.com/FlowzPlatform/rethink-jobqueue-service/archive/master.zip). You can also do this using the `wget` command:

```bash
$ wget https://github.com/FlowzPlatform/rethink-jobqueue-service/archive/master.zip -O rethink-jobqueue-service-master.zip; unzip rethink-jobqueue-service-master.zip; rm rethink-jobqueue-service-master.zip
```

### Running Your Application

	First go to server folder. and configure config file based on environment.
	We can configure default rethink database connection, default job queue options, and job options. we can also configure service port.

	after configuration Run below command
	```
	$ npm install
	```
	its installed dependent npm packages like
		seneca, seneca-web, seneca-mesh, rethinkdb-job-queue, rethinkdb, socket-io, and express

	now you can run below command

	```
	$ node job-web.js
	$ node worker-web.js
	$ node worker-need.js
	$ node symmetricWorker.js
	```

	Your Job creation api run on port 5000 with the development environment configuration, so in your browser navigate to http://localhost:5000

	Your Job process registartion api run on port 3000 with the development environment configuration, so in your browser navigate to http://localhost:3000

	And your Symmetric Worker run on port 9001.

	That's it! Your application should be running. To proceed with your development, check the other sections in this documentation.


### [1] Create Job

	Create job api : http://localhost:5000/job/create

#### Notes :
			job data will be pass through POST method and content-type should be application/json

	you can create job using different options

	[1.1] First option
				Only job data pass

		```
		{
			"to":"abcd@yourdomain.com",
			"from":"info@yourdomain.com",
			"subject":"this is test mail",
			"body":"this is message body"
		}
		```
	[1.2] second option
		With rethinkdb connction, job type and job data options

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
			"to":"abcd@yourdomain.com",
			"from":"info@yourdomain.com",
			"subject":"this is test mail",
			"body":"this is message body"
		}
		```

	[1.3] third option - multiple job
			With rethinkdb connction, job type and job data with each job options

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

### [2] Find Job

	Find job api : http://localhost:5000/job/find

#### Notes :
			find data will be pass through POST method and content-type should be application/json

	you can find job using different options

	[2.1] First option
				Only job data pass

			```
			"find": {
				"status":"waiting"
				}
			```
	[2.2] Second option
				With rethinkdb connction, job type and find data

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

### [3] Register job-type process

		register job type process api : http://localhost:3000/upload-worker-process

		#### Notes :
				data will be pass through POST method and content-type should be multipart/form-data

		#### Dependencies :
				In job process code you have to set resolve and reject as response for next job process in job queue

			```
			jobtype = RegistrationEmail
			jobprocess =  {
				  const nodemailer = require('nodemailer')
				  let transporter = nodemailer.createTransport({
				    service: 'SMTP',
				    host: 'smtp.gmail.com',
				    port: 465,
				    secure: true,
				    auth: {
				      user: 'your@gmail.com',
				      pass: 'your-password'
				    }
				  })

				  // setup email data with unicode symbols
				  let mailOptions = {
				    from: job.data.from, // sender address
				    to: job.data.to, // list of receivers
				    cc: job.data.cc, // list of receivers
				    subject: job.data.subject, // Subject line
				    text: job.data.body, // plain text body
				    html: job.data.body // html body
				  }
				  // send mail with defined transport object
				  transporter.sendMail(mailOptions, (error, info) => {
				    console.log(info)
				    if (error) {
				      reject(error)
				    }
				    resolve('Message ' +info.messageId +' sent: '+ info.response)
				  })
				}
			```

### [4] Register job-type to Symmetric Worker

		register job type api : http://localhost:9001/register-jobtype/RegistrationEmail

		#### Notes :
				job-type name will be pass through PUT method

### [5] Unregister job-type from Symmetric Worker

		register job type api : http://localhost:9001/register-jobtype/RegistrationEmail

		#### Notes :
				job-type name will be pass through delete method

### [6] How Symmetric Worker works

		Symmetric Worker reads Job summary based on job type option.

		job summary as below:
		```
		{ waiting: 1,
		  active: 0,
		  completed: 0,
		  cancelled: 0,
		  failed: 0,
		  terminated: 0,
		  total: 1 }
		```
		Based on job waiting count, its calculate waiting ratio.
		if wating ratio greater then our threshold, its emit the need worker event.
		so execute-worker will execute job process.

### [7] Extra Options

		[7.1] create job-queue using seneca-mesh

		using seneca-mesh we can create job. so on server side we do not need to create any rest-api request. using seneca act we can generate job.

		here is example of using seneca-mesh create job queue.

		```
		$ node server.js
		```
		below code write in job-mesh.js file and run it.

		```
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

		after creation of job-mesh.js file run below command

		```
		$ node job-mesh.js
		```

### License
		Under the MIT license. See LICENSE file for more details.
