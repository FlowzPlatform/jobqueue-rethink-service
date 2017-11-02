let jobprocess = function (job, next) {
  const nodemailer = require('nodemailer')
  let transporter = nodemailer.createTransport({
    service: 'SMTP',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: 'test@gmail.com',
      pass: 'test11111'
    }
  })

  // setup email data with unicode symbols
  let mailOptions = {
    from: job.data.from, // sender address
    to: job.data.to, // list of receivers
    subject: job.data.subject, // Subject line
    text: job.data.body, // plain text body
    html: job.data.body // html body
  }
  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
    console.log(info)
    if (error) {
      return console.log(error)
    }
    console.log('Message %s sent: %s', info.messageId, info.response)
  })
}

jobprocess({data:{
			"to":"ewewew@yourdomain.com",
			"from":"sas@yourdomain.com",
			"subject":"this is test mail",
			"body":"this is message body"
		}},{})
