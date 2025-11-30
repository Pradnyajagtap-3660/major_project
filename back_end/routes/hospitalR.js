

const express = require('express');
const router = express.Router();
const { getHospitals,getlatlon } = require('../controllers/hospitalC');

router.get('/hospitals', getHospitals);
router.get('/hospital-latlon', getlatlon);

module.exports = router;
