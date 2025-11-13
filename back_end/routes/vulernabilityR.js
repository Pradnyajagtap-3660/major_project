const express = require('express');
const router = express.Router();
const { getVulnerableZones } = require('../controllers/vulernabilityC');

router.get('/vulernable_zone', getVulnerableZones);

module.exports = router;
