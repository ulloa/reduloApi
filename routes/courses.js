const express = require('express');
const jwtMw = require('../controllers/jwtMw');
const strictJwt = jwtMw.strictJwt;
const liberalJwt = jwtMw.liberalJwt;
const router = express.Router();
const Courses = require('../models/course');
const Users = require('../models/user');
const btConfig = require('../config/btconfig');
const gateway = btConfig.gateway;

router.get('/', liberalJwt, (req, res, next) => {
  // Get all courses
  Courses.find()
         .then((results) => res.status(200).send({message: 'success', data: results}))
         .catch((err) => res.status(400).send({message:'error in fetching courses'}));
});

router.get('/:id', liberalJwt, (req, res, next) => {
  if (req.params.id.match(/^[0-9a-fA-F]{24}$/) == null) {
    // check if valid id format
    res.status(404).send({message:'error in fetching course'});
  } else {
    Courses.findOne({'_id': req.params.id, 'submitted': true}, (err, myCourse) => {
      if (err) {
	console.log(err);
        return res.status(404).send({message:'error in fetching course'});
      } else {
        if (myCourse != null && myCourse.submitted == true) {
          return res.status(200).send(myCourse);
        } else {
          // course doesn't exist
          return res.status(404).send({message:'class not found'});
        }
      }
    });
  }
});

router.get('/draft/:id', strictJwt, (req, res, next) => {
  if (req.params.id.match(/^[0-9a-fA-F]{24}$/) == null) {
    // check if valid id format
    return res.status(404).send({message:'error in fetching course'});
  } else {
    Courses.findOne({'_id': req.params.id, 'submitted': false}, (err, myCourse) => {
      if (err) {        
	console.log(err);
        return res.status(404).send({message:'error in fetching course'});
      } else {
        if (myCourse != null & myCourse.submitted == false) {
          // check if this user is the teacher of this course.
          // this is also checked client side, to prevent unmatched requests
	  let isTeacher = false;
	  for (let i = 0; i < req.user.teacher.length; i++) {
	    if (myCourse.id == req.user.teacher[i].courseid) {
	      isTeacher = true;
              return res.status(200).send(myCourse);
	      break;
	    }
	  }
          // not the teacher
          return res.status(404).send({message:'error in fetching course'});
        } else {
          // course doesn't exist
          return res.status(404).send({message:'class not found'});
        }
      }
    });
  }
});

router.get('/:id/payment/:tid', strictJwt, (req, res) => {
  // ENSURE LOGGED IN
  if (req.params.id.match(/^[0-9a-fA-F]{24}$/) == null) {
    res.status(404).send({message:'error in fetching courses'});
  } else if (req.params.tid.match(/^[0-9a-fA-F]{24}$/) == null) {
    res.status(404).send({message:'error in fetching courses'});
  } else {
    // REQ.flash is obsolete in this framework
    console.log(req.flash('info'));
    // Yes, it's a valid ObjectId, proceed with `findById` call.
    Courses.findOne({'_id': req.params.id, 'tickets': {$elemMatch: {'_id': req.params.tid}}}, (err, myCourse) => {
      if (err) {
	console.log(err);
        res.status(404).send({message:'error in fetching course'});
      } else {
	for (let i = 0, iLen=myCourse.tickets.length; i<iLen; i++) {
	  if (myCourse.tickets[i]._id == req.params.tid) {
	    let myTicket = myCourse.tickets[i];
	    let ticketIndex = i;
	    let ticketId = myCourse.tickets[i]._id;
	  }
	}
	if (myCourse != null) {
	  // generate client token for payment page
	  if (myCourse.tickets[ticketIndex].qty <= 0) {
            // tickets are sold out
            // flash is obsolete
            res.status(400).send({message: 'ticket is sold out'});
            // req.flash('ticket', 'Ticket is sold out');
            // res.redirect('/courses/' + req.params.id);
	  } else if (myCourse.tickets[ticketIndex].price == 0){
	    Users.findByIdAndUpdate(req.user.id,
				    {$push: { orders: {
				      courseid: req.params.id,
				      title: myCourse.title,
				      image: myCourse.image,
				      ticket: ticketId}}
				    }, {safe: true, upsert: true,
				        new: true
				    }, (err, user) => {
				      if (err) {
				        console.log(err);
				      }
				      let order = user.orders[user.orders.length-1];
				      console.log('attaching');
                                      // attach ticket controller needed to send email
				      attachTicket.lul(req.user, order, myCourse);
				    });
	    myCourse.enrolled += 1;
	    myCourse.tickets[ticketIndex].qty -= 1;
	    myCourse.save(function (err) {
	      if(err) {
		console.error('ERROR!');
	      } else {
		console.log('enrolled');
	      }
	    });
	    req.flash('enrollment', myCourse.title);
	    res.redirect('/profile');
	  } else {
	    gateway.clientToken.generate({}, function (err, response) {
	      let model2 = {
		user: req.user,
		tid: req.params.tid,
		thiscourse: myCourse,
		title: myCourse.title,
		authorization: response.clientToken,
		ticket: myTicket,
		message: req.flash('error')
	      };
	      res.render('payment', model2);
	    });
	  }

	} else {
          res.status(404).send({message:'error in fetching courses'});
	}
      }
    });
  }
});

router.post('/:id/enroll/:tid', strictJwt, (req, res) => {
  if (req.user == null) {
    res.render('errors/404');
  } else if (req.params.id.match(/^[0-9a-fA-F]{24}$/) == null) {
    res.render('errors/404');
  } else if (req.params.tid.match(/^[0-9a-fA-F]{24}$/) == null) {
    res.render('errors/404');
  } else {
    Courses.findOne({'_id': req.params.id, 'tickets': {$elemMatch: {'_id': req.params.tid}}},function (err, myCourse) {
      if (err) {
	console.log(err);
	res.render('errors/404');
      } else {
	for (let i=0, iLen=myCourse.tickets.length; i<iLen; i++) {
	  if (myCourse.tickets[i]._id == req.params.tid) {
	    let myTicket = myCourse.tickets[i];
	    let ticketIndex = i;
	    let ticketId = myCourse.tickets[i]._id;
	    // must check if qty is there.
	  }
	}
      }
      if (myCourse.tickets[ticketIndex].qty <= 0) {
	req.flash('ticket', 'Ticket is sold out');
	res.redirect('/courses/' + req.params.id);
      } else {

	let nonceFromTheClient = req.body.payment_method_nonce;
	// console.log(myCourse.tickets[ticketIndex].price);

	gateway.transaction.sale({
	  amount: myCourse.tickets[ticketIndex].price.toString(),
	  // paymentMethodNonce: 'fake-valid-no-billing-address-nonce',
	  merchantAccountId: myCourse.submerchant,
	  paymentMethodNonce: nonceFromTheClient,
	  serviceFeeAmount: '0.00',
	  customerId: req.user.customer.id.toString(),
	  options: {
	    submitForSettlement: true,
	    holdInEscrow: true,
	    storeInVaultOnSuccess: true
	  }
	}, (err, result) => {
	  /*
	     //use update to not charge immediately
	     gateway.customer.update(req.user.customer.id, {
	     creditCard: {
	     paymentMethodNonce: nonceFromTheClient,
	     options: {
	     makeDefault: true,
	     verifyCard: true
	     }
	     }
	     }, function (err, result) {
	   */
	  if (err != null) {
	    // The card has been declined
	    console.log('Card Error');
	    console.log(err);
	    console.log(result);
	    console.log('retry card');
	    req.flash('error', 'Payment information was invalid, please re-enter');
	    res.redirect('/courses/' + req.params.id + '/payment/' + req.params.tid);
	  } else if (!result.success) {
	    // failed then return to payment
	    // return with message
	    //			console.log('RESULTS:');
	    //			console.log(result);
	    console.log('Result.success == false');
	    console.log(err);
	    console.log(result);
	    console.log('retry card');
	    req.flash('error', 'Payment information was invalid, please re-enter');
	    res.redirect('/courses/' + req.params.id + '/payment/' + req.params.tid);
	  } else {
	    Users.findByIdAndUpdate(req.user.id,
				    {$push: { orders: {
				      courseid: req.params.id,
				      title: myCourse.title,
				      image: myCourse.image,
				      ticket: ticketId}}
				    }, {safe: true, upsert: true,
				        new: true
				    }, (err, user) => {
				      if (err) {
				        console.log(err);
				      }
				      let orderId = user.orders[user.orders.length-1];
				      attachTicket.lul(req.user, orderId, myCourse);
				    });

	    // ticket pdf stream and email
	    myCourse.enrolled += 1;
	    myCourse.tickets[ticketIndex].qty -= 1;
	    myCourse.save(function (err) {
	      if(err) {
		console.error('ERROR!');
	      } else {
		console.log('enrolled');
	      }
	    });
	    //			var model = {
	    //			    user: req.user,
	    //			    enrollment: myCourse.title
	    //			};
	    req.flash('enrollment', myCourse.title);
	    res.redirect('/profile');
	  }
	});
      }
    });	
  }
});

router.post('/create', strictJwt, (req, res) => {
  let date = [
    new Date().setHours(0, 0, 0)
  ];
  let time = [
    new Date().setHours(0, 0, 0),
    new Date().setHours(1, 0, 0)
  ];
  let description = '<h2>Write the description for your class here.</h2>'
	          + '<p>Edit here</p>';    
  let price = 0;
  let teacher = req.user.id;
  let submerchant = req.user.submerchant.id;
  let submitted = false;
  let goals = [{id: 'goal1'}];
  let tickets = [{name: 'Regular', qty: 5}];
  let address = '';
  
  let newCourse = new Courses({
    date: date,
    time: time,
    description: description,
    price: price,
    teacher: teacher,
    submitted: submitted,
    tickets: tickets,
    goals: goals,
    address: address,
    enrolled: 0,
    minimum: 1,
    submerchant: submerchant,
  });
  newCourse.save((err, myCourse) => {
    if(err) {
      console.log('save error', err);
      res.status(404).send({message:'error in creating course'});
    } else {
      Users.findByIdAndUpdate(
	req.user.id,
	{$push: { teacher: {
	  courseid: myCourse.id
	}}},
	{safe: true, upsert: true, new: true},
	(err, user) => {
	  if (err) {
	    console.log(err);
            res.status(404).send({message:'error in creating course'});
	  } else {
            res.status(200).send({message:'success, continue editing course', data: myCourse.id});
	  }
	});
    }
  });      
});

router.post('/edit', strictJwt, (req, res) => {
  let courseData = {
    _id: req.body.mongo,
    title: req.body.title && req.body.title.trim(),
    image: req.body.image != 'none' ? req.body.image && req.body.image.trim() : '',
    subject: req.body.subject,
    subsubject: req.body.subsubject,
    tagline: req.body.tagline,
    workload: req.body.workload,
    date: req.body.date,
    time: req.body.time,
    description: req.body.description, // most important
    price: req.body.price,
    location: req.body.location,
    address: req.body.address,
    bio: req.body.bio,
    contact: req.body.contact,
    plan: req.body.plan,
    approved: true,
    minimum: 4, // default, need to add
    enrolled: 0,
    teacher: req.user.id,
    submitted: req.body.submitted,
    goals: req.body.goals,
    tickets: req.body.tickets,
  }
  
  let newCourse = new Course(courseData);

  Courses.findByIdAndUpdate(req.body.mongo, {$set: newCourse}, (err, myCourse) => {
    if(err) {
      console.log('save error', err);
      res.status(400).send({message:'failed to save edit'});
    } else {
      res.status(200).send({message:'successful edit'});
    }
  });
});

module.exports = router;
