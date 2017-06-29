const mongoose = require('mongoose');
const User = mongoose.model('User');
const Store = mongoose.model('Store');
const Product = mongoose.model('Product');
const Review = mongoose.model('Review');

// confirm delete middleware
const confirmRemove = async (storeID, user) => {
	const store = await Store.findOne({ _id: storeID });
  if (!store.author.equals(user)) {
    throw Error('You must own a store in order to edit it!');
  }
};

exports.searchPage = async (req, res) => {
  const page = req.params.page || 1;
  const limit = 6;
  const skip = (page * limit) - limit;

  const storesPromise = Store
    .find()
    .skip(skip)
    .limit(limit)
    .sort({ created: 'desc' });

  const countPromise = Store.count();

  const [stores, count] = await Promise.all([storesPromise, countPromise]);
  const pages = Math.ceil(count / limit);
  if (!stores.length && skip) {
    req.flash('info', `You asked for page ${page}. But that doesn't exist. So I put you on page ${pages}`);
    res.redirect(`/admin/stores/page/${pages}`);
    return;
  }
  res.render('admin', { 'title': 'Admin Stores Page', stores, page, pages, count });
};

exports.deleteStoreById = async (req, res) => {
  const store = await Store.findOneAndRemove({ _id: req.params.store });
  req.flash('success', 'Deleted Store!');
  res.redirect('back');
};

exports.reviewsBySlug = async (req, res) => {
  const slug = req.params.slug
  const store = await Store.findOne({ slug });
  res.render('adminReviews', { 'title': `Reviews for ${store.name}`, store });
};

exports.deleteReviewById = async (req, res) => {
  const review = await Review.findOneAndRemove({ _id: req.params.review });
  req.flash('success', 'Deleted Review!');
  res.redirect('back');
};