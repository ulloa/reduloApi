const express = require('express');
const jwtMw = require('../controllers/jwtMw');
const strictJwt = jwtMw.strictJwt;
const strictJwtPop = jwtMw.strictJwtPop;
const liberalJwt = jwtMw.liberalJwt;
const router = express.Router();
const signup = require('../controllers/signup');
const login = require('../controllers/login');

// return back jwt to client
router.get('/self', strictJwtPop, (req, res) => {
  res.status(200).send({message: 'success', data: req.user});
});

router.post('/signup', (req, res) => {
  // if passport checks out then, sign logic
  signup(req, res)
    .then((userToken) => res.status(200).send({token: userToken, message: 'successful signup'}))
    .catch(err => res.status(400).send({message: err}));
});

// return back jwt to client
router.post('/login', (req, res) => {
  // if passport checks out then, sign logic
  login(req, res)
    .then((userToken) => res.status(200).send({token: userToken, message: 'successful login'}))
    .catch(err => res.status(400).send({message: err}));
});

// tell client to delete jwt 
router.post('/logout', (req, res) => {
  // maybe record logout, but nothing more
  res.status(200).send({message: 'successful logout'});
});

module.exports = router;
