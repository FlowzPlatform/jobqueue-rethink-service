const express = require('express')
const fileUpload = require('express-fileupload')
let rethink = require('rethinkdb')
const config = require('config')
const _ = require('underscore')
let defaultConnection = config.get('defaultConnection')
let registerWorker = config.get('registerWorker')
let rdbConn
connectRethinkDB(defaultConnection).then(result => {
  rdbConn = result
  checkTableExistsOrNot(rdbConn, registerWorker.table).then(res => console.log(res))
})
const app = express()

// default options
app.use(fileUpload())

app.get('/download/:jobtype', async function (req, res) {
  let result = await getDataJobType(registerWorker.table, rdbConn, req.params.jobtype)
  if (result.id === undefined) {
    return res.status(400).send('No worker registered.')
  }
   // Set disposition and send it.

  res.setHeader('Content-disposition', 'attachment; filename='+result.fileInfo.name);
  res.setHeader('Content-type', result.fileInfo.mimetype);
  //res.download(file);
  res.write(result.fileInfo.data, 'binary');
  res.end();
  // res.send(req.params.jobtype)
})

app.get('/job-module/:jobtype', async function (req, res) {
  let result = await getDataJobType(registerWorker.table, rdbConn, req.params.jobtype)
  if (result.id === undefined) {
    return res.status(400).send('No worker registered.')
  }
   // Set disposition and send it.
  // res.download(file);
  // res.write(result.jobProcess)
  // res.end();
  res.send(result.jobProcess)
})

app.post('/upload', async function (req, res) {
  if (!req.files) {
    return res.status(400).send('No files were uploaded.')
  }

  // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
  let sampleFile = req.files.sampleFile
  // console.log(req.files.sampleFile, req.body)
  let workerData = {
    jobType: req.body.jobtype,
    fileInfo: {
      name: sampleFile.name,
      data: sampleFile.data,
      encoding: sampleFile.encoding,
      mimetype: sampleFile.mimetype
    }
  }

  saveToRethinkDB(registerWorker.table, rdbConn, workerData)
  .then(result => {
    res.send('Worker Process registered!')
  })
  .catch(err => {
    return res.status(500).send(err)
  })

  // Use the mv() method to place the file somewhere on your server
  // sampleFile.mv(__dirname + '/myfiles/' + sampleFile.name, function (err) {
  //   if (err) {
  //     return res.status(500).send(err)
  //   }
  //   res.send('File uploaded!')
  // })
})

app.post('/upload-worker-process', async function (req, res) {
  // if (!req.files) {
  //   return res.status(400).send('No files were uploaded.')
  // }

  // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
  // let sampleFile = req.files.sampleFile
  // console.log(req.files.sampleFile, req.body)
  console.log(req.fields)
  let workerData = {
    jobType: req.body.jobtype,
    jobProcess: req.body.jobprocess
  }

  saveToRethinkDB(registerWorker.table, rdbConn, workerData)
  .then(result => {
    res.send('Worker Process registered!')
  })
  .catch(err => {
    return res.status(500).send(err)
  })
})

app.listen(registerWorker.port)

function saveToRethinkDB (table, connection, data) {
  return new Promise(async(resolve, reject) => {
    let result = await getDataJobType(table, connection, data.jobType)
    let messageData = data
    let saveData
    if (result.id === undefined) {
      saveData = rethink.table(table).insert(messageData)
    } else {
      saveData = rethink.table(table).filter({id: result.id}).update(messageData)
    }
    saveData.run(connection, function (err, result) {
      if (err) {
        reject(err)
      } else {
        console.log('data inserted')
        resolve(result)
      }
    })
  })
}

function getDataJobType (table, connection, jobTyped) {
  return new Promise(async (resolve, reject) => {
    await rethink.table(table)
      .filter(rethink.row('jobType').eq(jobTyped))
      .run(connection, function (err, cursor) {
        if (err) {
          resolve(null)
        } else {
          cursor.toArray(function (err, result) {
            if (err) {
              reject(err)
            } else {
              if (result.length > 0) {
                resolve(result[0])
              } else {
                resolve(result)
              }
            }
          })
        }
      })
  })
}

function connectRethinkDB (cxnOptions) {
  return new Promise((resolve, reject) => {
    rethink.connect({ host: cxnOptions.host, port: cxnOptions.port, db: cxnOptions.db }, function (err, conn) {
      if (err) {
        reject(err)
      } else {
        resolve(conn)
      }
    })
  })
}

function checkTableExistsOrNot (connection, table) {
  return new Promise((resolve, reject) => {
    rethink.tableList().run(connection).then(function (tableNames) {
      if (_.includes(tableNames, table)) {
        resolve('table already exists')
      } else {
        rethink.tableCreate(table).run(connection)
        resolve('table created')
      }
    })
  })
}
