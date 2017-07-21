const mongoose = require('mongoose');
const Product = mongoose.model('Product');
const Store = mongoose.model('Store');
const multer = require('multer');
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

const confirmOwner =  async (storeID, user) => {
	const store = await Store.findOne({ _id: storeID });
  if (!store.author.equals(user)) {
    throw Error('You must own a store in order to edit it!');
  }
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
            Key: 'products/' + req.body.photo,
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

exports.addProduct = async (req, res) => {
  req.body.author = req.user._id;
  req.body.store = req.params.id;
  await confirmOwner(req.body.store, req.body.author);
  const newProduct = new Product(req.body);
  await newProduct.save();
  req.flash('success', 'Product Saved!');
  res.redirect('back');
};

exports.editProduct = async (req, res) => {
    req.body.author = req.user._id;
    req.body.store = req.params.id;
    req.body.product = req.params.productid;
    await confirmOwner(req.body.store, req.body.author);

    // Update product
    console.log(req.body);
    const product = await Product.findOneAndUpdate({ _id: req.body.product }, req.body, {
        new: true, // returns the new product
        runValidators: true
    }).exec();

    req.flash('success', `Product: ${product.name} has been updated!`);
    res.redirect('back');
};