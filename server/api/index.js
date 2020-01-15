const router = require('express').Router();
module.exports = router;

router.use('/users', require('./users'));
router.use('/categories', require('./categories'));
router.use('/account', require('./account'));
router.use('/products', require('./products'));

router.use((req, res, next) => {
  const error = new Error('Not Found');
  error.status = 404;
  next(error);
});
