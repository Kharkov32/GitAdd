const mongoose = require('mongoose');
const User = mongoose.model('User');
const mail = require('../handlers/mail');

exports.send = async (req, res) => {
  if (!req.isAuthenticated())
    return res.status(204).send(); // if not auth return an okay with no content

  // req.body should be an object
  const options = {
    user: req.user,
    filename: req.body.filename,
    subject: req.body.subject, //
    data: req.body.data // object with properties to bind to .pug template file
  };
  await mail.send(options);
  res.status(200).send(options);
}