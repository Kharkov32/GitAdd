const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const stateSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: 'Please enter a state name!'
  }
});

// Define our indexes
stateSchema.index({
  name: 'text'
});

module.exports = mongoose.model('State', stateSchema);
