const mongoose = require('mongoose');
const Product = mongoose.model('Product');
const Store = mongoose.model('Store');

const confirmOwner =  async (storeID, user) => {
	const store = await Store.findOne({ _id: storeID });
  if (!store.author.equals(user)) {
    throw Error('You must own a store in order to edit it!');
  }
};

exports.addProduct = async (req, res) => {
  req.body.author = req.user._id;
  req.body.store = req.params.id;
  await confirmOwner(req.body.store, req.body.author);
  const newProduct = new Product(req.body);
  await newProduct.save();
  req.flash('success', 'Product Saved!');
  res.redirect('back');
};