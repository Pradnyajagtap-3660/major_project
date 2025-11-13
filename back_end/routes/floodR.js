const express = require('express');
const router = express.Router();
const { getFloodRisk } = require('../controllers/floodC');

router.get('/flood-risk', getFloodRisk);

module.exports = router;
