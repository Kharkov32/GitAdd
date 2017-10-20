const fs = require('fs');
const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const Promoted = mongoose.model('Promoted');
const User = mongoose.model('User');
const multer = require('multer');
const request = require('request');
const jimp = require('jimp');
const uuid = require('uuid');
const AWS = require('aws-sdk');
AWS.config.loadFromPath('./aws.config.json');
const s3 = new AWS.S3({ region: 'us-east-1' });
const capitalize = require('../helpers').capitalize;
const mail = require('../handlers/mail');

const statesArray = [
    "Alabama",
    "Alaska",
    "American Samoa",
    "Arizona",
    "Arkansas",
    "California",
    "Colorado",
    "Connecticut",
    "Delaware",
    "District Of Columbia",
    "Federated States Of Micronesia",
    "Florida",
    "Georgia",
    "Guam",
    "Hawaii",
    "Idaho",
    "Illinois",
    "Indiana",
    "Iowa",
    "Kansas",
    "Kentucky",
    "Louisiana",
    "Maine",
    "Marshall Islands",
    "Maryland",
    "Massachusetts",
    "Michigan",
    "Minnesota",
    "Mississippi",
    "Missouri",
    "Montana",
    "Nebraska",
    "Nevada",
    "New Hampshire",
    "New Jersey",
    "New Mexico",
    "New York",
    "North Carolina",
    "North Dakota",
    "Northern Mariana Islands",
    "Ohio",
    "Oklahoma",
    "Oregon",
    "Palau",
    "Pennsylvania",
    "Puerto Rico",
    "Rhode Island",
    "South Carolina",
    "South Dakota",
    "Tennessee",
    "Texas",
    "Utah",
    "Vermont",
    "Virgin Islands",
    "Virginia",
    "Washington",
    "West Virginia",
    "Wisconsin",
    "Wyoming"
];

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter(req, file, next) {
    const isPhoto = file.mimetype.startsWith('image/');
    if (isPhoto) {
      next(null, true);
    } else {
      next({ message: 'That filetype isn\'t allowed!' }, false);
    }
  }
};

exports.homePage = async (req, res) => {
  const promotedTop = Promoted
    .find({ position: { $gt: 1, $lt: 7 } })
    .limit(5)
    .sort({ position: 'asc' });

  const promotedBanner = Promoted.findOne({ position: 1 });

  const promotedBottom = Promoted
    .find({ position: { $gt: 9, $lt: 14 } })
    .limit(5)
    .sort({ position: 'asc' });

  const [top, banner, bottom] = await Promise.all([promotedTop, promotedBanner, promotedBottom]);
  res.render('index', { title: 'Featured Stores', top, banner, bottom });
};

exports.addStore = async (req, res) => {
  res.render('editStore', { title: 'Add Store', statesArray });
};

exports.upload = multer(multerOptions).any('photos');

exports.resize = async (req, res, next) => {
  // check if there is no new file to resize
  if (!req.files) {
    next();
    return;
  }
  for (const image of req.files) {
    const extension = image.mimetype.split('/')[1];
    const imageName = `${uuid.v4()}.${extension}`;
    if (image.fieldname === 'photo') {
      req.body.photo = imageName;
    } else {
      req.body.banner = imageName;
    }
    const file = await jimp.read(image.buffer);
    await file.quality(60);
    // Upload to s3
    await file.getBuffer('image/png', function (err, out) {
      const params = {
        Bucket: 'cbdoilmaps-public-images',
        Key: 'stores/' + imageName,
        Body: out,
        ContentType: 'image/png',
        CacheControl: 'max-age=172800',
        ACL: 'public-read'
      };
      const putObjectPromise = s3.putObject(params).promise();
      putObjectPromise
        .catch(function (err) {
          console.log(err);
          req.flash('error', 'Failed to upload image!');
          res.redirect('back');
        });
    });
  }
  next();
};

exports.deletePhotos = async (req, res, next) => {
  for (const image of req.files) {
    const store = await Store.findById(req.params.id);
    console.log(store[image.fieldname]);
    const params = {
      Bucket: 'cbdoilmaps-public-images',
      Key: 'stores/' + store[image.fieldname]
    };
    const deleteObjectPromise = s3.deleteObject(params).promise();
    deleteObjectPromise
      .catch(function (err) {
        console.log(err);
        req.flash('error', 'Failed to upload image!');
        res.redirect('back');
      });
  }
  next();
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

  await mail.send({
    user: req.user,
    filename: 'store-created',
    subject: 'You have created a new Store!',
    store
  });

  res.redirect(`/store/${store.slug}`);
};

// promoted
exports.createPromoted = async (req, res) => {
  req.body.store = req.params.store;
  req.body.author = req.params.author;
  const position = await Promoted.find();
  req.body.position = position.length + 1;
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
      // return '65.49.22.66';
      // Ohio:
      // return '208.80.152.201';
      // Pennsylvania:
      return '147.31.182.137';
    }
  };

  let ip = await getIP();
  let data = await getData(ip);
  data = JSON.parse(data);

  const page = req.params.page || 1;
  const limit = 6;
  const skip = (page * limit) - limit;

  const storesPromise = Store
    .find({ state: data.regionName, wholesaler: false })
    .skip(skip)
    .limit(limit)
    .sort({ created: 'desc' });

  const countPromise = Store.count({ state: data.regionName, wholesaler: false });

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
    .find({ wholesaler: true })
    .skip(skip)
    .limit(limit)
    .sort({ created: 'desc' });

  const countPromise = Store.count({ wholesaler: true });

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
  confirmOwner(store, req.user);
  res.render('editStore', { title: `Edit ${store.name}`, store, statesArray });
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

  await mail.send({
    user: req.user,
    filename: 'store-updated',
    subject: `You have updated the Store ${store.name}!`,
    store
  });

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

exports.getStoresByState = async (req, res) => {
  req.params.state = capitalize(req.params.state); 
  // capitalize the state so it always matches the fields in the DB
  
  const promoted = await Promoted.findOne({ position: 1 });
  const stores = await Store
    .find({ state: req.params.state, wholesaler: false })
    .sort({ created: 'desc' });

  res.render('storesByState', { title: `Stores in ${req.params.state}`, promoted, stores });
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
        $maxDistance: 500000 // 500km
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
