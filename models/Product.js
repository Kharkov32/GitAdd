const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const productSchema = new mongoose.Schema({
  created: {
    type: Date,
    default: Date.now
  },
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: 'You must supply an author!'
  },
  store: {
    type: mongoose.Schema.ObjectId,
    ref: 'Store',
    required: 'You must supply a store!'
  },
  name: {
    type: String,
    required: 'Your product must have a name!'
  },
  description: {
    type: String,
    required: 'Your product must have a description!'
  },
  link: String, // URI that will point to external site
  photo: String
});

module.exports = mongoose.model('Product', productSchema);
