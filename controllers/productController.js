const mongoose = require('mongoose');
const Product = mongoose.model('Product');

exports.addProduct = async (req, res) => {
  req.body.author = req.user._id;
  req.body.store = req.params.id;
  const newProduct = new Product(req.body);
  await newProduct.save();
  req.flash('success', 'Product Saved!');
  res.redirect('back');
};