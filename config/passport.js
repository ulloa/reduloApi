// config/passport.js

// load all the things we need
const JwtStrategy = require('passport-jwt').Strategy,
      ExtractJwt = require('passport-jwt').ExtractJwt;
const LocalStrategy   = require('passport-local').Strategy;
const crypto = require('crypto');


const stripe = require('stripe')(process.env.STRIPE_TEST);

//const btConfig = require('../config/btconfig');
//const gateway = btConfig.gateway;

//const sendgrid = require('sendgrid')(process.env.SENDGRID_USERNAME, process.env.SNDGRID_PASSWORD);

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// load up the user model
const Users = require('../models/user');

// expose this function to our app using module.exports
module.exports = (passport) => {

  // =========================================================================
  // JWT AUTH ================================================================
  // =========================================================================
  // all of these options should change depending on environment
  let opts = {}
  opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
  opts.secretOrKey = process.env.JWT_SECRET;
  //  opts.issuer = 'redulo.com';
  //  opts.audience = 'redulo.com';
  passport.use('verify-jwt', new JwtStrategy(opts, (jwt_payload, done) => {
    Users.findOne({'local.email': jwt_payload.local.email}, (err, user) => {
      if (err) {
        return done(null, false);
        // error
      }
      if (user) {
        return done(null, user);
        // user found
      } else {
        // no user found, invalid jwt
        return done(null, false);        
        // or you could create a new account
      }
    });
  }));

  passport.use('verify-jwt+populate', new JwtStrategy(opts, (jwt_payload, done) => {
    // populate most common resources, but return only a few. Essentially what is
    // expected for the first couple of months
    Users.findOne({'local.email': jwt_payload.local.email}, { teacher: { $slice: 6 }, orders: { $slice: 6 } })
         .populate({
           path: 'teacher.courseid',
           // Explicitly exclude `_id`, see http://bit.ly/2aEfTdB
           // select: 'name -_id',
           // options: { limit: 1 }
         })
         .exec((err, user) => {
           if (err) {
             return done(null, false);
             // error
           }
           if (user) {
             return done(null, user);
             // user found
           } else {
             // no user found, invalid jwt
             return done(null, false);        
             // or you could create a new account
           }
         });
  }));

  // =========================================================================
  // LOCAL SIGNUP ============================================================
  // =========================================================================
  // we are using named strategies since we have one for login and one for signup
  // by default, if there was no name, it would just be called 'local'

  passport.use('local-signup', new LocalStrategy({
    // by default, local strategy uses username and password, we will override with email
    // irrelevant???
    usernameField : 'email',
    passwordField : 'password',
    passReqToCallback : true // allows us to pass back the entire request to the callback
  }, (req, email, password, done) => {

    // asynchronous
    // turn this into a promise????????
    // User.findOne wont fire unless data is sent back
    process.nextTick(() => {

      // find a user whose email is the same as the forms email
      // we are checking to see if the user trying to login already exists
      Users.findOne({ 'local.email' :  email }, (err, user) => {
        // if there are any errors, return the error
	let testEmail =
	  /^[ ]*([^@\s]+)@((?:[-a-z0-9]+\.)+[a-z]{2,})[ ]*$/i;
	// console.log(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{7,}$/.test(password));
        if (err) {
          return done(err);
	} else if (user) {
	  // check to see if theres already a user with that email
          return done(null, false,
		      {message: "That email is already taken."}
	  );
        } else if (!testEmail.test(email)) {
          return done(null, false, {message: "That wasn't an email."});
	  
	} else if (!(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{7,}$/.test(password)))
	  // 7 characters at least 1 number and 1 letter
	{
          return done(null, false, {message: "Password must be at least 7 characters long and have at least 1 letter and number. Password must be all numbers and letters."});
	} else {

          // if there is no user with that email
          // create the user
          let newUser = new Users();

          // set the user's local credentials
          newUser.local.email = req.body.email;
          newUser.local.password = newUser.generateHash(req.body.password);
	  newUser.local.name = req.body.name;


	  // setting authtoken for comfirming account
	  let seed = crypto.randomBytes(20);
	  let authToken = crypto.createHash('sha1').update(seed + req.body.email).digest('hex');
	  newUser.local.authToken = authToken,
	      newUser.local.isAuthenticated = false;

	  let authenticationURL = 'http://redulo.com/verify_email?token=' + newUser.local.authToken;
          let msg = {
            from: {
              email: 'support@redulo.com',
              name: 'Redulo Support'
            },
            to: {
              email: newUser.local.email,
              name: newUser.local.name
            },
            subject: 'Welcome to Redulo',
            html: '<html><body><h3>Hello ' + newUser.local.name + ',</h3><p>Welcome to Redulo. We are happy to have innovators like you in our classrooms. Make sure you check out the <a href="http://redulo.com/students">perks</a> for signing up for your first class.</p><p>Confirm your email. <a target=_blank href=\"' + authenticationURL + '">Click here.</a></p><p>Have questions or suggestions? Let me know.</p><p>-Sam</p><p>CEO, Redulo</p></body></html>',
            bcc: {
              email: 'support@redulo.com',
              name: 'Redulo Support'
            }
          }

          sgMail.send(msg)
                .then(() => {
                  // save the user, create record in braintree
	          stripe.customers.create({
	            name: newUser.local.name,
	            email: newUser.local.email
	          }, (err, result) => {
	            newUser.customer.id = result.id;
	            newUser.save((err) => {
	              if (err) {
                        return done(null, false, {message: err});
                      }
	              return done(null, newUser, {message: 'successful signup'});
                    });

	          });
                })
                .catch(error => {
                  //Log friendly error
                  console.error(error.toString());
                  //Extract error msg
                  const {message, code, response} = error;
                  //Extract response msg
                  const {headers, body} = response;
                  return done(null, false, {message: 'failed signup'});
                });

        }

      });
    })
  }));
  // =========================================================================
  // LOCAL LOGIN =============================================================
  // =========================================================================
  // we are using named strategies since we have one for login and one for signup
  // by default, if there was no name, it would just be called 'local'

  passport.use('local-login', new LocalStrategy({
    // by default, local strategy uses username and password, we will override with email
    usernameField : 'email',
    passwordField : 'password',
    passReqToCallback : true // allows us to pass back the entire request to the callback
  }, (req, email, password, done) => { // callback with email and password from our form
    // find a user whose email is the same as the forms email
    // we are checking to see if the user trying to login already exists
    Users.findOne({ 'local.email' :  req.body.email }, (err, user) => {
      // if there are any errors, return the error before anything else
      if (err)
        return done(err);

      // if no user is found, return the message
      if (!user)
        return done(null, false, {message: 'No user found.'}); // req.flash is the way to set flashdata using connect-flash

      // if the user is found but the password is wrong
      if (!user.validPassword(req.body.password))
        return done(null, false, {message: 'Oops! Wrong password.'}); // create the loginMessage and save it to session as flashdata

      // all is well, return successful user
      return done(null, user);
    });

  }));    
};
