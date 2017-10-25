const { spawn } = require('child_process')
const node = spawn('node', ['emailWorker.js'])

node.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`)
})

node.stderr.on('data', (data) => {
  console.log(`stderr: ${data}`)
})

node.on('close', (code) => {
  console.log(`child process exited with code ${code}`)
})
