const express = require("express");
const { geocode } = require("../controllers/geocodeC");

const router = express.Router();

router.get("/geocode", geocode);

module.exports = router;
