

const express = require('express');
const router = express.Router();
const { getHospitals } = require('../controllers/hospitalC');

router.get('/hospitals', getHospitals);

module.exports = router;
