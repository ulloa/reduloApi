'use strict';
// tickets
const pdfkit = require('pdfkit');
const base64 = require('base64-stream');
const httpRequest = require('request').defaults({ encoding: null });

const QRCode = require('qrcode');
const moment = require('moment-timezone');

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const attachTicket = function () {
  return {
    lul: function(myUser, myOrder, myCourse) {
      let from_email = new helper.Email('sam@redulo.com', 'Redulo');
      let to_email = new helper.Email(myUser.local.email, myUser.local.name);
      let subject = 'Your Redulo Ticket';
      let content = new helper.Content('text/html', '<html><body><h3>Hello ' + myUser.local.name + ',</h3><p>Congrats on your purchase. Your order was #' + myOrder._id + '. We are happy to have innovators like you in our classrooms.</p><p>Have questions or suggestions? Let me know.</p><p>-Sam</p><p>Founder, Redulo</p></body></html>');
      let mail = new helper.Mail(from_email, subject, to_email, content);

      let copy = new helper.Email('sam@redulo.com', 'Sam');
      mail.personalizations[0].addCc(copy);
      

      let doc = new pdfkit({
	layout: 'portrait',
	margins: {
	  left: 160,
	  right: 160,
	  top: 8,
	  bottom: 8
	}
      });

      let lato = 'public/fonts/Lato/Lato-Regular.ttf';
      let latoBold = 'public/fonts/Lato/Lato-Bold.ttf';	    
      let ticketStream = doc.pipe(base64.encode());

      /*
	 doc.rect(147, 400, 318, 362) 
	 .fill('#e5d900')
       */

      doc.rect(148, 30, 316, 732) 
	 .lineWidth(2) 
	 .strokeColor('black')
	 .stroke();

      doc.rect(148, 415, 158, 65) 
	 .lineWidth(2) 
	 .strokeColor('black')
	 .stroke();

      doc.rect(306, 415, 158, 65) 
	 .lineWidth(2) 
	 .strokeColor('black')
	 .stroke();

      doc.rect(148, 480, 316, 45) 
	 .lineWidth(2) 
	 .strokeColor('black')
	 .stroke();


      doc.fontSize(20)
	 .font(latoBold)
	 .fillColor('black')
	 .text(myUser.local.name,
	       doc.page.margins.left, 55,
	       {align: 'center', height: 20, ellipsis: true});

      doc.image('./public/images/pictures/Healthy_habits1.png', (doc.page.width - 300)/2, 85, {width: 300});
      
      doc.fontSize(23)
	 .font(latoBold)
	 .fillColor('black')
	 .text(myOrder.title,
	       doc.page.margins.left, 285,
	       {align: 'center', height: 60, ellipsis: true});


      
      doc.fontSize(16)
	 .font(lato)
	 .fillColor('black')
	 .text(myCourse.location,
	       doc.page.margins.left, 350,
	       {align: 'center', height: 60, ellipsis: true});
      
      doc.fontSize(16)
	 .font(lato)
	 .fillColor('black')
	 .text(myCourse.address,
	       doc.page.margins.left, 372,
	       {align: 'center', height: 60, ellipsis: true});

      doc.fontSize(16)
	 .font(lato)
	 .fillColor('black')
	 .text('Date',
	       doc.page.margins.left, 430,
	       {align: 'left'});

      doc.fontSize(16)
	 .font(lato)
	 .fillColor('black')
	 .text(moment(myCourse.date[0]).format('MMM Do') + ' - ' +
	       moment(myCourse.date[myCourse.date.length - 1]).format('MMM Do'),
	       doc.page.margins.left, 450,
	       {align: 'left'});

      doc.fontSize(16)
	 .font(lato)
	 .fillColor('black')
	 .text('Time',
	       doc.page.margins.left, 430,
	       {align: 'right'});

      doc.fontSize(16)
	 .font(lato)
	 .fillColor('black')
	 .text(moment.tz(myCourse.time[0], "America/Los_Angeles").format('LT') + ' - ' +
	       moment.tz(myCourse.time[1], "America/Los_Angeles").format('LT'),
	       doc.page.margins.left, 450,
	       {align: 'right'});

      let myTickets = myCourse.tickets;
      let ticketId = myOrder.ticket;
      let ticketFind = (tickets) => { // special function
	return tickets._id == ticketId; // string and number comparison
      };
      // 	    console.log(myTickets);
      //	    console.log(ticketId);
      //	    console.log(myTickets.find(ticketFind));
      
      doc.fontSize(16)
	 .font(lato)
	 .fillColor('black')
	 .text(myTickets.find(ticketFind).name + ' Ticket',
	       doc.page.margins.left, 495,
	       {align: 'center', height: 60, ellipsis: true});


      doc.image('public/images/brand/logo/redulo.logo.300px.png', (doc.page.width - 75)/2, 670, {width: 75, align:'center'});

      doc.fontSize(12)
	 .font(lato)
	 .fillColor('black')
	 .text('Ticket#: ' + myOrder._id,
	       doc.page.margins.left, 725,
	       {align: 'center'});

      httpRequest.get('https://s3-us-west-1.amazonaws.com/rweb/' + myCourse.image, (err, res, body) => {
	if (!err && res.statusCode == 200) {
	  let data = 'data:' + res.headers['content-type'] + ';base64,' + new Buffer(body).toString('base64');
	  doc.image(data, (doc.page.width - 300)/2, 85, {width: 300});
	}
	let orderId = myOrder._id.toString();
	QRCode.toDataURL(orderId, {margin:0, color: {dark: '#000',light: '#0000'}}, (err, url) => {
	  doc.image(url, (doc.page.width - 100)/2, 545, {width: 100, align:'center'});
	  doc.end();
	});
      });
      
      let finalString = '';
      ticketStream.on('data', (chunk) => {
	finalString += chunk;
      });

      ticketStream.on('end', () => {
	// the stream is at its end, so push the resulting base64 string to the response
	let attachment = new helper.Attachment();

	attachment.setContent(finalString);
	attachment.setType('application/pdf');
	let ticketName = myOrder._id + '-ticket.pdf';
	attachment.setFilename(ticketName);
	attachment.setDisposition('attachment');
	mail.addAttachment(attachment);

	// console.log(mail);

	let request = sg.emptyRequest({
	  method: 'POST',
	  path: '/v3/mail/send',
	  body: mail.toJSON()
	});

	sg.API(request, (error, response) => {
	  console.log('Mail Sent Status:', response.statusCode);
	  console.log(response.body);
	  console.log(response.headers);
	});

	//                  console.log(finalString);
      });
    }
  };
};

module.exports = attachTicket();
