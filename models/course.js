'use strict';
const mongoose = require('mongoose');
mongoose.Promise = Promise;
const Schema = mongoose.Schema;

const courseSchema = new Schema({
  title: String,
  image: String,
  subject: String,
  subsubject: String,
  submerchant: String,
  tagline: String,
  workload: Number,
  date: [Date],
  time: [Date],
  description: String,
  price: Number,
  location: String,
  address: String,
  bio: String,
  contact: String,
  enrolled: Number,
  minimum: Number,
  approved: Boolean,
  teacher: String,
  chat: String,
  plan: String,
  submitted: Boolean,
  tickets: [{
    name: String,
    qty: Number,
    price: Number
  }],	
  goals: [{
    id: String,
    name: String,
    _id: false
  }],
});

//Format the price of the product to show a dollar sign, and two decimal places
courseSchema.methods.prettyPrice = function () {
  return (this && this.price) ? '$' + this.price.toFixed(2) : '$';
};

const Course = mongoose.model('Course', courseSchema, 'Courses');
module.exports = Course;
