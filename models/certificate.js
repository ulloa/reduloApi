'use strict';
const mongoose = require('mongoose');
mongoose.Promise = Promise;
const Schema = mongoose.Schema;

const certificateSchema = new Schema({
  user            : String,
  course          : String,
  download        : String
});

const Certificate =  mongoose.model('Certificate', certificateSchema, 'Certificates');
module.exports = Certificate;
