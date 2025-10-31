# WhatsApp Bot - Eksath Samithiya

## Overview
This WhatsApp bot allows members to query their account information via simple text commands sent to WhatsApp.

## Features
Members can send short codes to get:
- **BALANCE** - Total outstanding amount (membership dues + fines + previous balance)
- **ABSENT** - Current year meeting attendance summary
- **FAMILY** - List of dependents and siblings count

## Setup

### 1. Install Dependencies
```bash
npm install whatsapp-web.js qrcode-terminal
```

### 2. Start Server
```bash
npm start
```

### 3. Initialize Bot (Admin Only)
Make a POST request to:
```
POST http://localhost:3001/whatsapp/initialize
Authorization: Bearer <admin-token>
```

You need to be authenticated as `super-admin` or `vice-secretary`.

### 4. Scan QR Code
- When you initialize the bot, a QR code will appear in the terminal
- Open WhatsApp on your phone
- Go to Settings > Linked Devices > Link a Device
- Scan the QR code from the terminal

### 5. Bot is Ready
Once authenticated, the bot will show "WhatsApp bot ready!" in the console.

## Member Usage

Members must have their WhatsApp number registered in the system (in the `whatsApp` field of their member document).

### Commands (Sinhala or English):
- `BALANCE` or `ශේෂය` - View outstanding balance
- `ABSENT` or `නොපැමිණීම` - View meeting absences
- `FAMILY` or `පවුල` - View family/dependents
- `HELP` or `උදව්` - View help message

### Example:
Member sends: `BALANCE`

Bot replies with:
```
මුදල් තොරතුරු - John Doe

අංකය: 123

සාමාජිකත්ව හිඟ: Rs. 3000.00
දඩ හිඟ: Rs. 500.00
පෙර හිඟ: Rs. 1000.00

මුළු හිඟ: Rs. 4500.00
```

## Admin Endpoints

### Initialize Bot
```
POST /whatsapp/initialize
```

### Check Status
```
GET /whatsapp/status
```

### Disconnect Bot
```
POST /whatsapp/disconnect
```

All endpoints require authentication with `super-admin` or `vice-secretary` role.

## Session Persistence
The bot uses `LocalAuth` strategy which saves the session in `.wwebjs_auth/` directory. Once authenticated, the bot will automatically reconnect on server restart without needing to scan QR again (unless session expires or is deleted).

## Notes
- The bot ignores group messages - it only responds to direct messages
- Members must have their WhatsApp number registered in the system
- The `.wwebjs_auth/` directory is in `.gitignore` to avoid committing session data
- QR code appears in terminal during first-time setup

## Troubleshooting
- If QR doesn't appear, check terminal output for errors
- If bot doesn't respond, verify member's WhatsApp number is registered
- To reset: stop server, delete `.wwebjs_auth/` folder, restart and scan QR again
