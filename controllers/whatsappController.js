const whatsappService = require('../services/whatsappService');

exports.initialize = async (req, res) => {
  try {
    whatsappService.initialize();
    res.status(200).json({
      success: true,
      message: 'WhatsApp bot initialization started',
      status: whatsappService.getStatus()
    });
  } catch (error) {
    console.error('Error initializing WhatsApp bot:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize WhatsApp bot',
      error: error.message
    });
  }
};

exports.getStatus = async (req, res) => {
  try {
    const status = whatsappService.getStatus();
    res.status(200).json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get status',
      error: error.message
    });
  }
};

exports.disconnect = async (req, res) => {
  try {
    await whatsappService.destroy();
    res.status(200).json({
      success: true,
      message: 'WhatsApp bot disconnected successfully'
    });
  } catch (error) {
    console.error('Error disconnecting bot:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect bot',
      error: error.message
    });
  }
};
