const express = require('express');
const router = express.Router();
const {requestReset,verify} = require('../controllers/fpC');

router.post("/verify", verify)
router.post("/request-reset", requestReset)

module.exports = router;