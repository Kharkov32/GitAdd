const fs = require('fs');
const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const State = mongoose.model('State');
const Promoted = mongoose.model('Promoted');
const User = mongoose.model('User');
const multer = require('multer');
const request = require('request');
const jimp = require('jimp');
const uuid = require('uuid');
const AWS = require('aws-sdk');
AWS.config.loadFromPath('./aws.config.json');
const s3 = new AWS.S3({region: 'us-east-1'});

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter(req, file, next) {
    const isPhoto = file.mimetype.startsWith('image/');
    if(isPhoto) {
      next(null, true);
    } else {
      next({ message: 'That filetype isn\'t allowed!' }, false);
    }
  }
};

exports.homePage = async (req, res) => {
  const promoted = await Promoted.findOne({position: 1});

  const stores = await Store
    .find()
    .limit(6)
    .sort({ created: 'desc' });
  
  res.render('index', { title: 'Featured Stores', promoted, stores });
};

exports.addStore = async (req, res) => {
  const states = await State.find();
  res.render('editStore', { title: 'Add Store', states });
};

exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
  // check if there is no new file to resize
  if (!req.file) {
    next();
    return;
  }
  const extension = req.file.mimetype.split('/')[1];
  req.body.photo = `${uuid.v4()}.${extension}`;
  // Resize and write
  const file = await jimp.read(req.file.buffer);
  await file.resize(800, jimp.AUTO);
  // Upload to s3
  await file.getBuffer('image/png', function(err, image) {
    const params = {
      Bucket: 'cbdoilmaps-public-images',
      Key: 'stores/' + req.body.photo,
      Body: image,
      ContentType: 'image/png',
      CacheControl: 'max-age=172800',
      ACL: 'public-read'
    };
    const putObjectPromise = s3.putObject(params).promise();
    putObjectPromise
      .then(function(data) {
        next();
      })
      .catch(function(err) {
        console.log(err);
        req.flash('error', 'Failed to upload image!');
        res.redirect('back');
      });
  });
};

exports.createStore = async (req, res) => {
  req.body.author = req.user._id;
  if (req.body.wholesaler === 'value') {
    req.body.wholesaler = true;
  } else {
    req.body.wholesaler = false;
  }
  const store = await (new Store(req.body)).save();
  req.flash('success', `Successfully Created ${store.name}.`);
  res.redirect(`/store/${store.slug}`);
};

// promoted
exports.createPromoted = async (req, res) => {
  req.body.store = req.params.store;
  req.body.author = req.params.author;
  req.body.position = 1;
  let now = new Date();
  now.setHours(now.getHours() + 1);
  req.body.expirary = now;
  const promoted = await (new Promoted(req.body)).save();
  req.flash('success', 'Promoted store!');
  res.redirect('/');
};

exports.removePromoted = async (req, res) => {
  req.body.store = req.params.store;
  req.body.author = req.params.author;

  const demoted = await (Promoted.findOneAndRemove({ store: req.body.store, author: req.body.author }));
  req.flash('success', 'Demoted store!');
  res.redirect('/');
};

exports.getStores = async (req, res) => {
  let getData = (ip) => {
      return new Promise(function (resolve, reject) {
          request("http://ip-api.com/json/" + ip, function (error, res, body) {
              if (!error && res.statusCode == 200) {
                  resolve(body);
              } else {
                  reject(error);
              }
          });
      });
  };
  let getIP = async () => {
      if (process.env.NODE_ENV === 'production') {
          return req.headers['x-forwarded-for'];
      } else {
          // Cali:
          return '65.49.22.66';
          // Ohio:
          // return '208.80.152.201';
      }
  };

  let ip = await getIP();
  let data = await getData(ip);
  data = JSON.parse(data);

  const page = req.params.page || 1;
  const limit = 6;
  const skip = (page * limit) - limit;

  const storesPromise = Store
    .find({state: data.regionName, wholesaler: false})
    .skip(skip)
    .limit(limit)
    .sort({ created: 'desc' });

  const countPromise = Store.count();

  const [stores, count] = await Promise.all([storesPromise, countPromise]);
  const pages = Math.ceil(count / limit);
  if (!stores.length && skip) {
    req.flash('info', `You asked for page ${page}. But that doesn't exist. So I put you on page ${pages}`);
    res.redirect(`/stores/page/${pages}`);
    return;
  }
  if (stores.length === 0) {
      req.flash('info', `No stores found in ${data.regionName}! Try searching a nearby state.`);
      res.redirect(`/`);
      return;
  }

  res.render('stores', { title: `Stores in ${data.regionName}`, stores, page, pages, count });
};

exports.getWholesale = async (req, res) => {
    const page = req.params.page || 1;
    const limit = 6;
    const skip = (page * limit) - limit;

    const storesPromise = Store
        .find({wholesaler: true})
        .skip(skip)
        .limit(limit)
        .sort({ created: 'desc' });

    const countPromise = Store.count({wholesaler: true});

    const [stores, count] = await Promise.all([storesPromise, countPromise]);
    const pages = Math.ceil(count / limit);
    if (!stores.length && skip) {
        req.flash('info', `You asked for page ${page}. But that doesn't exist. So I put you on page ${pages}`);
        res.redirect(`/wholesalers/page/${pages}`);
        return;
    }

    res.render('stores', { title: 'Wholesalers', stores, page, pages, count });
};

const confirmOwner = (store, user) => {
  if (!store.author.equals(user._id)) {
    throw Error('You must own a store in order to edit it!');
  }
};

exports.editStore = async (req, res) => {
  const store = await Store.findOne({ _id: req.params.id });
  const states = await State.find();
  confirmOwner(store, req.user);
  res.render('editStore', { title: `Edit ${store.name}`, store, states });
};

exports.updateStore = async (req, res) => {
  req.body.location.type = 'Point';
  if (req.body.wholesaler === 'value') {
      req.body.wholesaler = true;
  } else {
      req.body.wholesaler = false;
  }
  const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
    new: true, // returns the new store instead of the old one
    runValidators: true
  }).exec();
  req.flash('success', `Successfully updated <strong>${store.name}</strong>. <a href="/store/${store.slug}">View Store →</a>`);
  res.redirect(`/stores/${store._id}/edit`);
};

exports.getStoreBySlug = async (req, res, next) => {
  const store = await Store.findOne({ slug: req.params.slug }).populate('author');
  if (!store) return next();
  res.render('store', { store, title: store.name });
};

exports.searchStores = async (req, res) => {
  const stores = await Store
  .find({
    $text: {
      $search: req.query.q
    }
  }, {
    score: { $meta: 'textScore' }
  })
  .sort({
    score: { $meta: 'textScore' }
  })
  .limit(5);
  res.json(stores);
};

exports.searchStates = async (req, res) => {
    const states = await State
        .find({
            $text: {
                $search: req.query.q
            }
        }, {
            score: { $meta: 'textScore' }
        })
        .sort({
            score: { $meta: 'textScore' }
        })
        .limit(5);
    res.json(states);
};

exports.getStoresByState = async (req, res) => {
    const promoted = await Promoted.findOne({position: 1});

    const stores = await Store
        .find({state: req.params.state})
        .sort({ created: 'desc' });

    res.render('index', { title: `Stores in ${req.params.state}`, promoted, stores });
};

exports.mapStores = async (req, res) => {
  const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
  const q = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates
        },
        $maxDistance: 10000 // 10km
      }
    }
  };

  const stores = await Store.find(q).select('slug name description location photo').limit(10);
  res.json(stores);
};

exports.mapPage = (req, res) => {
  res.render('map', { title: 'Map' });
};

exports.heartStore = async (req, res) => {
  const hearts = req.user.hearts.map(obj => obj.toString());

  const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
  const user = await User
    .findByIdAndUpdate(req.user._id,
      { [operator]: { hearts: req.params.id } },
      { new: true }
    );
  res.json(user);
};

exports.getHearts = async (req, res) => {
  const stores = await Store.find({
    _id: { $in: req.user.hearts }
  });
  res.render('stores', { title: 'Hearted Stores', stores });
};
