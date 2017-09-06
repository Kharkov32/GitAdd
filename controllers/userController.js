const mongoose = require('mongoose');
const User = mongoose.model('User');
const Email = mongoose.model('Email');
const promisify = require('es6-promisify');

exports.loginForm = (req, res) => {
  res.render('login', { title: 'Login' });
};

exports.forgotPasswordForm = (req, res) => {
  res.render('forgotPassword', { title: 'To reset your password enter your E-mail below.' });
};

exports.registerForm = (req, res) => {
  res.render('register', { title: 'Register' });
};

exports.registerVendorForm = (req, res) => {
  res.render('registerVendor', { title: 'Register as a Vendor' });
};

exports.validateRegister = async (req, res, next) => {
  req.sanitizeBody('name');
  req.checkBody('name', 'You must supply a name!').notEmpty();
  req.checkBody('email', 'That Email is not valid!').isEmail();
  req.sanitizeBody('email').normalizeEmail({
    remove_dots: false,
    remove_extension: false,
    gmail_remove_subaddress: false
  });
  req.checkBody('password', 'Password Cannot be Blank!').notEmpty();
  req.checkBody('password-confirm', 'Confirmed Password cannot be blank!').notEmpty();
  req.checkBody('password-confirm', 'Oops! Your passwords do not match').equals(req.body.password);

  const errors = req.validationErrors();
  if (errors) {
    req.flash('error', errors.map(err => err.msg));
    res.render('register', { title: 'Register', body: req.body, flashes: req.flash() });
    return;
  }
  const exists = await User.findOne({ email: req.body.email });
  console.log(exists);
  if (!exists) {
    next();
  } else {
    req.flash('error', 'User with that email already exists!');
    res.render('register', { title: 'Register', body: req.body, flashes: req.flash() });
    return;
  }
};

exports.register = async (req, res, next) => {
  const user = new User({ email: req.body.email, name: req.body.name });
  const register = promisify(User.register, User);
  await register(user, req.body.password);
  next();
};
exports.registerVendor = async (req, res, next) => {
  const user = new User({ email: req.body.email, name: req.body.name, vendor: true });
  const register = promisify(User.register, User);
  await register(user, req.body.password);
  next();
};

exports.account = (req, res) => {
  res.render('account', { title: 'Edit Your Account' });
};

exports.updateAccount = async (req, res) => {
  const updates = {
    name: req.body.name,
    email: req.body.email
  };

  const user = await User.findOneAndUpdate(
    { _id: req.user._id },
    { $set: updates },
    { new: true, runValidators: true, context: 'query' }
  );
  req.flash('success', 'Updated the profile!');
  res.redirect('back');
};


exports.validateEmailSubmit = async (req, res, next) => {
  req.checkBody('email', 'That Email is not valid!').isEmail();
  req.sanitizeBody('email').normalizeEmail({
      remove_dots: false,
      remove_extension: false,
      gmail_remove_subaddress: false
  });
  const errors = req.validationErrors();
  if (errors) {
      req.flash('error', errors.map(err => err.msg));
      res.redirect('back');
      return;
  }
  const exists = await Email.findOne({ email: req.body.email });
  if (!exists) {
      next();
  } else {
      req.flash('error', 'Email already subscribed!');
      res.redirect('back');
      return;
  }
};

exports.emailSubmit = async (req, res) => {
  const newEmail = new Email(req.body);
  await newEmail.save();
  req.flash('success', 'Subscribed: ' + req.body.email);
  res.redirect('back');
};
