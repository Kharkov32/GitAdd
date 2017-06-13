const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');
const productController = require('../controllers/productController');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const reviewController = require('../controllers/reviewController');
const { catchErrors } = require('../handlers/errorHandlers');

// Generic Routes
router.get('/', catchErrors(storeController.homePage));
router.get('/stores', catchErrors(storeController.getStores));
router.get('/stores/page/:page', catchErrors(storeController.getStores));
router.get('/map', storeController.mapPage);
router.get('/top', catchErrors(storeController.getTopStores));

// Store
router.get('/add', 
  authController.isLoggedIn,
  authController.isVendor,
  storeController.addStore
);
router.post('/add',
  authController.isLoggedIn,
  authController.isVendor,
  storeController.upload,
  catchErrors(storeController.resize),
  catchErrors(storeController.createStore)
);
router.post('/add/:id',
  authController.isLoggedIn,
  storeController.upload,
  catchErrors(storeController.resize),
  catchErrors(storeController.updateStore)
);
router.get('/stores/:id/edit', catchErrors(storeController.editStore));
router.get('/store/:slug', catchErrors(storeController.getStoreBySlug));
router.post('/reviews/:id',
  authController.isLoggedIn,
  authController.isNotVendor,
  catchErrors(reviewController.addReview)
);

// Store Products
router.post('/stores/:id/products/add',
  authController.isLoggedIn,
  authController.isVendor,
  catchErrors(productController.addProduct)
);
router.get('/tags', catchErrors(storeController.getStoresByTag));
router.get('/tags/:tag', catchErrors(storeController.getStoresByTag));

// User
router.get('/register', userController.registerForm);
router.post('/register',
  userController.validateRegister,
  userController.register,
  authController.login
);
// Vendor
router.post('/register/vendor',
  userController.validateRegister,
  userController.registerVendor,
  authController.login
);
// Generic User
router.get('/login', userController.loginForm);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.get('/account', authController.isLoggedIn, userController.account);
router.post('/account', catchErrors(userController.updateAccount));
router.post('/account/forgot', catchErrors(authController.forgot));
router.get('/account/reset/:token', catchErrors(authController.reset));
router.post('/account/reset/:token',
  authController.confirmedPasswords,
  catchErrors(authController.update)
);
router.get('/hearts', authController.isLoggedIn, catchErrors(storeController.getHearts));

/*
  API
*/

router.get('/api/search', catchErrors(storeController.searchStores));
router.get('/api/stores/near', catchErrors(storeController.mapStores));
router.post('/api/stores/:id/heart', catchErrors(storeController.heartStore));
// promoted
router.post('/api/store/promote/:id', catchErrors(storeController.createPromoted));

module.exports = router;
