const express = require('express');
const router = express.Router();
// Using the hybrid controller with OSRM + flood risk analysis
const { getsafePath } = require('../controllers/safePathC_hybrid');

router.post('/safe-route', getsafePath);

module.exports = router;