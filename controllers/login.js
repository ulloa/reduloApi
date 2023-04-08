const passport = require('passport');
const jwt = require('jsonwebtoken');

module.exports = (req, res) => {
  return new Promise((resolve, reject) => {
    passport.authenticate('local-login', {
      session: false
    }, (err, user, info) => {
      // console.log(err, user, info);
      if (err || !user) {
        reject(info);
        return;
      }
      // generate a signed json web token with the contents of user object and return it in the response
      // user.toJSON() is to get a plain json, not mongoose json
      jwt.sign(user.toJSON(), process.env.JWT_SECRET, (err, token) => {
        if (err) {
          reject('Something is not right');
          return;
        }
        resolve(token);
        return;
      });
    })(req, res);
  });
};
