var load = require('load-script')

load('foo.js', function (err, script) {
  if (err) {
    // print useful message
  }
  else {
    console.log(script.src);// Prints 'foo'.js'
    // use script
    // note that in IE8 and below loading error wouldn't be reported
  }
})
