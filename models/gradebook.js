'use strict';
const mongoose = require('mongoose');
mongoose.Promise = Promise;
const Schema = mongoose.Schema;

const gradebookSchema = new Schema({
  students: [{
    studentid: String,
    studentName: String,
    _id: false
  }],
  courseid: String,
  teacherid: String
});

const Gradebook = mongoose.model('Gradebook', gradebookSchema, 'Gradebooks');
module.exports = Gradebook;
