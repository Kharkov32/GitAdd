require('dotenv').config({ path: 'variables.env' });
const mongoose = require('mongoose');
    mongoose.connect(process.env.DATABASE);
    mongoose.Promise = global.Promise;
    mongoose.connection.on('error', (err) => {
        console.error(`🚫 → ${err.message}`);
    });
require('../models/Store');
require('../models/User');
require('../models/Review');
require('../models/Product');
require('../models/Promoted');
const Store = mongoose.model('Store');
const User = mongoose.model('User');
const Review = mongoose.model('Review');
const Product = mongoose.model('Product');
const Promoted = mongoose.model('Promoted');

const rotatePromoted = async () => {
    const promotedStores = await Promoted.find();
    let stores = [];
    let wholesalers = [];
    for (const promoted of promotedStores) {
        if (promoted.store.wholesaler) {
            wholesalers.push(promoted);
        } else {
            stores.push(promoted);
        }
    }

    for (const store of stores) {
        if (store.position === stores.length) {
            store.position = 1;
        } else {
            store.position++;
        }
        await store.save();
    }
    for (const wholesaler of wholesalers) {
        if (wholesaler.position === promotedStores.length) {
            wholesaler.position = 10;
        } else {
            wholesaler.position++;
        }
        await wholesaler.save();
    }

};
rotatePromoted()
    .then(()=>{
        mongoose.disconnect();
        console.log('Finished');
    })
    .catch((err) => {
        console.log(err);
    });