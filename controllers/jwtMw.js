const passport = require('passport');
module.exports = {
  strictJwt: (req, res, next) => {
    passport.authenticate('verify-jwt', { session: false }, (err, user, info) => { 
      if (err || !user) {
        return res.status(401).send({message: 'bad credentials'}).end();
      }
      req.user = user;
      next();
    })(req, res, next);
  },
  strictJwtPop: (req, res, next) => {
    passport.authenticate('verify-jwt+populate', { session: false }, (err, user, info) => { 
      if (err || !user) {
        return res.status(401).send({message: 'bad credentials'}).end();
      }
      req.user = user;
      next();
    })(req, res, next);

  },
  liberalJwt: (req, res, next) => {
    passport.authenticate('verify-jwt', { session: false }, (err, user, info) => { 
      if (err) {
        return res.status(401).send({message: 'error'}).end();
      }
      if (user) {
        req.user = user;
      }
      next();
    })(req, res, next);
  }
};
