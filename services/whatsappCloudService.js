const axios = require('axios');
const crypto = require('crypto');

/**
 * Lightweight helper for sending messages via Meta's WhatsApp Cloud API
 * and verifying incoming webhook signatures.
 *
 * Environment variables required:
 * - WHATSAPP_PHONE_NUMBER_ID
 * - WHATSAPP_ACCESS_TOKEN
 * - WHATSAPP_APP_SECRET (for verifying X-Hub-Signature-256)
 */
class WhatsAppCloudService {
  constructor() {
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.appSecret = process.env.WHATSAPP_APP_SECRET || '';
    this.baseUrl = this.phoneNumberId
      ? `https://graph.facebook.com/v17.0/${this.phoneNumberId}/messages`
      : null;
  }

  isConfigured() {
    return !!(this.phoneNumberId && this.accessToken);
  }

  // Normalize phone number to WhatsApp Cloud API expected international format (no +)
  // Examples: "0767531659" -> "94767531659", "+94767531659" -> "94767531659"
  normalizePhoneNumber(raw) {
    if (!raw) return '';
    let num = String(raw).trim();
    if (num.startsWith('+')) num = num.substring(1);
    // If starts with 0 and appears local (e.g., 07...), replace leading 0 with 94
    if (/^0\d+/.test(num)) {
      num = '94' + num.substring(1);
    }
    return num;
  }

  async sendTextMessage(to, text) {
    if (!this.isConfigured()) {
      throw new Error('WhatsApp Cloud API not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN');
    }

    const toNormalized = this.normalizePhoneNumber(to);

    const payload = {
      messaging_product: 'whatsapp',
      to: toNormalized,
      type: 'text',
      text: { body: text }
    };

    try {
      const res = await axios.post(this.baseUrl, payload, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      return res.data;
    } catch (err) {
      // bubble a helpful error message
      const msg = err.response && err.response.data ? JSON.stringify(err.response.data) : err.message;
      const error = new Error(`WhatsApp Cloud send error: ${msg}`);
      error.original = err;
      throw error;
    }
  }

  // Verify X-Hub-Signature-256 header for incoming webhook payload
  verifySignature(rawBody, signatureHeader) {
    if (!this.appSecret) return false; // cannot verify without secret
    if (!signatureHeader) return false;

    // header format: sha256=hex
    const parts = signatureHeader.split('=');
    if (parts.length !== 2) return false;
    const algo = parts[0];
    const signature = parts[1];
    if (algo !== 'sha256') return false;

    const hmac = crypto.createHmac('sha256', this.appSecret);
    hmac.update(rawBody, 'utf8');
    const expected = hmac.digest('hex');
    // use timing-safe compare
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
  }
}

const whatsappCloudService = new WhatsAppCloudService();
module.exports = whatsappCloudService;
