const mongoose = require('mongoose');
const User = mongoose.model('User');
const Store = mongoose.model('Store');
const Product = mongoose.model('Product');
const Review = mongoose.model('Review');

const AWS = require('aws-sdk');
AWS.config.loadFromPath('./aws.config.json');
const s3 = new AWS.S3({region: 'us-east-1'});

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
  const store = await Store.findOne({ _id: req.params.store });
  const params = {
      Bucket: 'cbdoilmaps-public-images',
      Key: 'stores/' + store.photo
  };
  const deleteObjectPromise = s3.deleteObject(params).promise();
  deleteObjectPromise
      .then(function(data) {
          store.reviews.forEach(async (review) => {
              await Review.findOneAndRemove({ _id: review._id });
          });
          store.products.forEach(async (product) => {
              await Product.findOneAndRemove({ _id: product._id });
              const params = {
                  Bucket: 'cbdoilmaps-public-images',
                  Key: 'products/' + product.photo
              };
              const deleteObjectPromise = s3.deleteObject(params).promise();
              deleteObjectPromise
                  .catch(function(err) {
                      console.log(err);
                      console.log(product.photo);
                  });
          });
          store.remove();
          req.flash('success', 'Deleted Store!');
          res.redirect('back');
      })
      .catch(function(err) {
          console.log(err);
          console.log(store.photo);
          res.redirect('back');
      });
};

exports.reviewsBySlug = async (req, res) => {
  const slug = req.params.slug;
  const store = await Store.findOne({ slug });
  res.render('adminReviews', { 'title': `Reviews for ${store.name}`, store });
};

exports.deleteReviewById = async (req, res) => {
  const review = await Review.findOneAndRemove({ _id: req.params.review });
  req.flash('success', 'Deleted Review!');
  res.redirect('back');
};

exports.productsBySlug = async (req, res) => {
    const slug = req.params.slug;
    const store = await Store.findOne({ slug });
    res.render('adminProducts', { 'title': `Products for ${store.name}`, store });
};

exports.deleteProductById = async (req, res) => {
    const product = await Product.findOneAndRemove({ _id: req.params.product });

    const params = {
        Bucket: 'cbdoilmaps-public-images',
        Key: 'products/' + product.photo
    };
    const deleteObjectPromise = s3.deleteObject(params).promise();
    deleteObjectPromise
        .then(function(data) {
            req.flash('success', 'Deleted Product!');
            res.redirect('back');
        })
        .catch(function(err) {
            console.log(err);
            console.log(product.photo);
            res.redirect('back');
        });
};

exports.altsBySlug = async (req, res) => {
    const slug = req.params.slug;
    const store = await Store.findOne({ slug });
    res.render('adminAlts', { 'title': `Alt Tags for ${store.name}`, store });
};

exports.editAltsBySlug = async (req, res) => {
    console.log(req.body);

    const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body).exec();

    req.flash('success', 'Updated the store!');
    res.redirect('back');
};