const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const promotedSchema = new mongoose.Schema({
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
  position: Number,
  expirary: {
    type: Date,
    required: 'You must supply an expirary date!'
  }
});

function autoPopulate(next) {
  this.populate('author');
  this.populate('store');
  next();
}

promotedSchema.pre('find', autoPopulate);
promotedSchema.pre('findOne', autoPopulate);

module.exports = mongoose.model('Promoted', promotedSchema);
