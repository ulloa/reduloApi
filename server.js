const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const port = 9000;
const passport = require('passport');
require('./config/passport')(passport); // pass passport for configuration  
const app = express();
const routeHandler = require('./routes/index');

const server = {
  connectToDB: (environment) => {
    mongoose.Promise = Promise;
    if (environment == 'local') {
      return mongoose.connect('mongodb://localhost/redulo', {useNewUrlParser: true, useFindAndModify: false, useUnifiedTopology: true} );
    } else {
      return new Promise((resolve, reject) => reject());
    }
  },
  run: (environment) => {
    console.log('starting');
    server.connectToDB(environment)
          .then(() => {
            console.log('connected to db');
            app.use(passport.initialize());
            app.use((req, res, next) => {
              res.header("Access-Control-Allow-Origin", req.headers.origin);
              res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, Accept, Authorization");
              next();
            });
            app.use(morgan('dev'));
            //            app.use(express.urlencoded({extended: false, limit: '1kb'}));
            app.use(express.json({limit: '10kb'}));
            app.use((err, req, res, next) => {
              if (err instanceof SyntaxError ) {
                res.status(400).send({message:'Invalid json'});
              }
            });
            routeHandler(app);
            app.use('*', (req, res) => res.status(400).send({message:'not valid'}));
            return app.listen(port, () => {
              console.log(`Listening on port ${port}`);
            });
          })
          .catch(err => {
            console.log('never connected to db');
          });
  }
}

module.exports = server;
