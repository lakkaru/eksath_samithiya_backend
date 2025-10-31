const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/initialize', authMiddleware(['super-admin', 'vice-secretary']), whatsappController.initialize);
router.get('/status', authMiddleware(['super-admin', 'vice-secretary']), whatsappController.getStatus);
router.post('/disconnect', authMiddleware(['super-admin', 'vice-secretary']), whatsappController.disconnect);

module.exports = router;
