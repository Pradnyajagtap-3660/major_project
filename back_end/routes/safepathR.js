const express = require('express');
const router = express.Router();
const { getsafePath } = require('../controllers/safePathC');

router.post('/safe-route', getsafePath);

module.exports = router;