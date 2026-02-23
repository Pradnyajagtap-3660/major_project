const express = require('express');
const router = express.Router();
const { chatbot } = require('../controllers/chatbotC');

router.post('/chatbot', chatbot);

module.exports = router;
