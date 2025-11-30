const express = require('express');
const router = express.Router();
const { getShelters,getlatlon } = require('../controllers/shelterC');

router.get('/shelters', getShelters);
router.get('/shelter-latlon', getlatlon);

module.exports = router;
