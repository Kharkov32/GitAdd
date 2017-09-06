const mongoose = require('mongoose');
const User = mongoose.model('User');
const mail = require('../handlers/mail');

exports.send = async (req, res) => {
  console.log(req.isAuthenticated());

  // const user = await User.findOne({ email: req.body.email });
  // if (!user) {
  //   req.flash('error', 'No account with that email exists!');
  //   return res.redirect('/login');
  // }
  // await mail.send({
  //   user,
  //   filename: 'password-reset',
  //   subject: 'Password Reset',
  //   resetURL
  // });

  req.flash('success', `fired`);
}