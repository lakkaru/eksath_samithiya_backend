const express = require('express');
const router = express.Router();
const controller = require('../controllers/whatsappCloudController');
const expressLib = require('express');

// Verification endpoint (GET) and webhook receiver (POST)
router.get('/webhook', controller.verifyWebhook);

// For POST we need raw body to verify signature. Use express.raw for this route.
router.post('/webhook', expressLib.raw({ type: 'application/json' }), async (req, res, next) => {
  // Attach rawBody for controller to verify signature
  try {
    req.rawBody = req.body.toString('utf8');
    // Now parse JSON body and set req.body for convenience
    req.body = JSON.parse(req.rawBody);
  } catch (err) {
    // if parsing fails, leave as-is
  }
  return controller.receiveWebhook(req, res, next);
});

module.exports = router;
