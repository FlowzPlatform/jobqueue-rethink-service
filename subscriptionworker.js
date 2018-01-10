const Queue = require('rethinkdb-job-queue')
const config = require('config')
let rethink = require('rethinkdb')

let dbConfig = config.get('defaultConnection')
let qConfig = config.get('defaultQueue')
let subsConfig = config.get('defaultSubscription')

if(process.env.rdb_host!== undefined && process.env.rdb_host!== '') {
    dbConfig.host = process.env.rdb_host
}

if(process.env.rdb_port!== undefined && process.env.rdb_port!== '') {
    dbConfig.port = process.env.rdb_port
}

const qCreateOption = config.get('defaultCreateJob')

const defaultOption = {
  connction: dbConfig,
  queue: qConfig,
  options: qCreateOption,
  subscription: subsConfig
}
// console.log(defaultOption)
let sOptions = {
  queue : {
    "name": "subscription"
  },
  option : {
    "priority": "normal"
  },
  subscription: {
    "enable": false
  }
}
var _ = require('underscore');
let newOptions1 = _.extend(defaultOption,sOptions)

//console.log(newOptions1)

let createJobQueue = function (dbDriver, queueOption) {
  try {
    return new Queue(dbDriver, queueOption)
  } catch (err) {
    return (err)
  }
}

let qObj = createJobQueue(newOptions1.connction, newOptions1.queue)

//console.log(qObj);

var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(9001);
app.use(express.static('public'))
app.use('/public', express.static('public'))

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/public/index.html');
});

let jobQueueFlag = true

io.on('connection', function (socket) {
  globSocket = socket
  if (jobQueueFlag) {
    getJobQueue(socket)
    jobQueueFlag = false
  }
})


async function getJobQueue (socket) {
  let rethinkDbConnectionObj = await connectRethinkDB (newOptions1.connction)
  qObj.process(async (job, next) => {
    console.log("=============================================================================================")
    io.sockets.in('alljobs').emit("mesage", {"crated":"Job"});

    let subscribeData = await findSubscriptionData(rethinkDbConnectionObj,newOptions1.connction.db,'subscribeData',{})

    // console.log(job.data.job[0].data.subject)
    // globSocket.emit('news', { hello: job.data.name })
    filterObject (socket, subscribeData, job.data)
    // socket.emit('news', { hello: job.data.job[0].data.subject });
    return next(null, 'notified subscribe user')
  })
}

function filterObject (socket, subscribeData, job) {
  subscribeData.forEach(function (sub, index) {
    console.log(sub)
    //console.log(job)
    let findFlag = true
    for (let idx in sub.conditions) {
      console.log("========",job.hasOwnProperty(idx),"=======", idx, ">",(job[idx]?job[idx]:"Not"))
      //,"<=========",job[idx].toString().toLowerCase().indexOf(sub.conditions[idx]) > -1
      if (!(job.hasOwnProperty(idx) && job[idx]==sub.conditions[idx] )) {
        findFlag = false
      }
    }
    console.log("==========findFlag=",findFlag)
    if (findFlag) {
      console.log("Emit to ", sub.path, {'newJobCreated': job.job[0].data.subject})
      ToEmit(sub.path, {'newJobCreated': job.job[0].data.subject})
      //io.so.emit(sub.path, {'newJobCreated': job.job[0].data.subject})
      //io.sockets.in(sub.path).emit('message',{'newJobCreated': job.job[0].data.subject})
      //socket.emit('alljobs', { hello: 'Job Created' })
      //io.to(sub.path).emit({'newJobCreated': job.job[0].data.subject})
    }
  })
}

function ToEmit(path, data) {
  io.on('connection', function (socket) {
    socket.emit(path, data)
  })
}

function connectRethinkDB (cxnOptions) {
  return new Promise((resolve, reject) => {
    rethink.connect({ host: cxnOptions.host, port: cxnOptions.port, db: cxnOptions.db }, function (err, conn) {
      if (err) {
        // connectRethinkDB(cxnOptions)
      } else {
        resolve(conn)
      }
    })
  })
}

function findSubscriptionData (rconnObj, rdb, rtable, findVal) {
  return new Promise((resolve, reject) => {
    rethink.db(rdb).table(rtable).run(rconnObj, function (err, cursor) {
      if (err) {
        reject(err)
      } else {
        cursor.toArray(function(err, result) {
            if (err) throw err;
            resolve(result);
        });
        // resolve(JSON.stringify(result, null, 2))
      }
    })
  })
}
