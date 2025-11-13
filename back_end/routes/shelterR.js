const express = require('express');
const router = express.Router();
const { getShelters } = require('../controllers/shelterC');

router.get('/shelters', getShelters);

module.exports = router;
