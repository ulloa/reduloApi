'use strict';
const mongoose = require('mongoose');
mongoose.Promise = Promise;
const Schema = mongoose.Schema;
const bcrypt   = require('bcrypt');

const userSchema = new Schema({
  
  local            : {
    name         : String,
    email        : String,
    password     : String,
    authToken    : String,
    resetPassToken   : String,
    resetPassExpires : Date,
    isAuthenticated  : Boolean
  },
  facebook         : {
    id           : String,
    token        : String,
    email        : String,
    name         : String,
    authToken    : String,
    isAuthenticated: Boolean
  },
  twitter          : {
    id           : String,
    token        : String,
    displayName  : String,
    username     : String
  },
  google           : {
    id           : String,
    token        : String,
    email        : String,
    name         : String,
    authToken    : String,
    isAuthenticated: Boolean
  },
  bio              : {
    headline     : String,
    biography    : String,
    picture      : String,
    phone        : String,
    email        : String
  },
  customer         : {
    id           : String
  },
  submerchant      : {
    id           : String,
    generic      : Boolean
  },
  orders           : [{
    courseid     : { type: Schema.Types.ObjectId, ref: 'Course' },
    timeStamp    : { type: Date, default: Date.now },
    ticket       : String,
    title        : String,
    image        : String,
    cert         : String
  }],
  teacher          : [{
    courseid     : { type: Schema.Types.ObjectId, ref: 'Course' },
    title        : String,  //not necessary, but simplifies code
    image        : String,   //not necessary, but simplifies code
    _id          : false     // otherwise i'll get an extra waste
  }],
  // received reviews
  reviews: [{ 
    timeStamp: { type: Date, default: Date.now }, 
    user: String,
    rating: Number,
    text: String,
    courseid: String,
    _id: false    
  }]
}, {timestamps   : true});

userSchema.methods.generateHash = function(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};
// checking if password is valid
userSchema.methods.validPassword = function(password) {
  return bcrypt.compareSync(password, this.local.password);
};

const User = mongoose.model('User', userSchema, 'Users');
module.exports = User;

