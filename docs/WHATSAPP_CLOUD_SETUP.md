# WhatsApp Cloud API - Detailed Setup Guide

## 1. Meta Developer Portal Setup

### Step 1: Create an App
1. Go to [Meta for Developers](https://developers.facebook.com/).
2. Click **My Apps** > **Create App**.
3. Select **Other** > **Next**.
4. Select **Business** > **Next**.
5. Enter an App Name (e.g., "Eksath Organization Bot") and App Contact Email.
6. Click **Create App**.

### Step 2: Add WhatsApp Product
1. On the "Add products to your app" screen, scroll down to **WhatsApp** and click **Set up**.
2. Select your Meta Business Account (or create one) > **Continue**.

### Step 3: Add Phone Number (Verification)
> [!NOTE]
> This is where you connect your real Organization Phone Number.

1. In the left sidebar, go to **WhatsApp** > **API Setup**.
2. You will see a "Step 5: Add a phone number" section (or look for the **Add Phone Number** button in the **Configuration** tab).
3. Click **Add Phone Number**.
4. **Profile Information**: Enter display name (e.g., "Eksath Samithiya"), Category (e.g., "Non-profit"), and Description.
5. **Add Phone Number**:
   - Enter the organization's mobile number.
   - Choose Verification Method: **Text Message (SMS)** or **Phone Call**.
   - Click **Next**.
6. **Verify**: Enter the code you receive on that phone number.
7. Once verified, this number will be listed in the **From** dropdown in the API Setup page and will have a **Phone Number ID**.
   - **Copy this Phone Number ID** for your `.env` file (`WHATSAPP_PHONE_NUMBER_ID`).

---

## 2. API Credentials Setup

### Step 1: Phone Number ID
(Already copied in the previous step).

### Step 2: Access Token (Production)
The "Temporary Access Token" shown in the dashboard expires in 24 hours. **Do not use it for the live server.**

**To get a Permanent Token:**
1. Go to [Business Settings](https://business.facebook.com/settings).
2. Select your Business Account.
3. Go to **Users** > **System Users**.
4. Click **Add** > Name: "WhatsApp Bot" > Role: **Admin** > **Create System User**.
5. Click **Add Assets** > **Apps** > Select your App > Enable **Manage App** (Full control) > **Save Changes**.
6. Click **Generate New Token**.
   - Select your App.
   - **Token Expiration**: Select **Never** (or Permanent).
   - **Permissions**: Select `whatsapp_business_messaging` and `whatsapp_business_management`.
   - Click **Generate Token**.
7. **Copy this Access Token** for your `.env` file (`WHATSAPP_ACCESS_TOKEN`).

### Step 3: App Secret
1. Go back to Meta App Dashboard.
2. Go to **App Settings** > **Basic**.
3. Click **Show** next to "App Secret".
4. **Copy this Secret** for your `.env` file (`WHATSAPP_APP_SECRET`).

---

## 3. Local Server Setup (Ngrok)

Since you are running on localhost, Meta needs a public URL to send webhook events to. We use `ngrok` for this.

### Issue: `ngrok` command not found
It seems ngrok is not installed or not in your system PATH.

**Option A: Install via npm (Easiest)**
1. Run this command in your terminal:
   ```bash
   npm install -g ngrok
   ```
2. Then try running:
   ```bash
   ngrok http 5000
   ```

**Option B: Download Executable**
1. Download ngrok from [ngrok.com](https://ngrok.com/download).
2. Unzip it.
3. Open a terminal in the folder where `ngrok.exe` is located.
4. Run:
   ```powershell
   .\ngrok.exe http 5000
   ```

### After Starting Ngrok
1. You will see a URL like `https://a1b2-c3d4.ngrok-free.app`.
2. Copy this URL.
3. Go to Meta App Dashboard > **WhatsApp** > **Configuration**.
4. Click **Edit** under **Webhook**.
5. **Callback URL**: Paste the ngrok URL and append `/whatsapp-cloud/webhook`
   - Example: `https://a1b2-c3d4.ngrok-free.app/whatsapp-cloud/webhook`
6. **Verify Token**: Enter the token you put in your `.env` file (e.g. `my_secure_random_token_123`).
7. Click **Verify and Save**.

---

## 4. Testing the Bot

Since your app is in **Development Mode**, you cannot receive messages from just anyone yet.

### Step 1: Add Test Number
1. Go to Meta App Dashboard > **WhatsApp** > **API Setup**.
2. Scroll to the **"To"** field section (usually near the top or bottom).
3. Click **Manage Phone Number list** (or look for where you can add numbers).
4. Add your **Personal WhatsApp Number** (the one you want to test with).
5. You will receive a verification code on your personal phone. Enter it to confirm.

### Step 2: Send Message
1. Save your **Organization Phone Number** (the broadband one) in your personal phone's contacts.
2. Open WhatsApp on your phone.
3. Start a chat with the Organization number.
4. Send a command like: `HELP` or `BALANCE`.

### Step 3: Verify Response
- If you see a reply, it works!
- If not, check your terminal where `npm start` is running to see if the webhook was received (you should see the log).
- Ensure your personal number is registered in the database if the command requires member data.

---

## 5. Production Deployment (VPS/Nginx/PM2)

Since you already have Nginx and PM2 set up, follow these steps to deploy the WhatsApp changes:

### 1. Update Code on VPS
1.  **Commit and Push** your local changes (including `eksathServer.js` fixes and `package.json`).
    ```bash
    git add .
    git commit -m "Add WhatsApp Cloud API support"
    git push origin main
    ```
2.  **SSH into your VPS**.
3.  Navigate to your project folder.
4.  **Pull changes**:
    ```bash
    git pull origin main
    npm install
    ```

### 2. Update Production Environment
1.  Open your `.env` file on the VPS:
    ```bash
    nano .env
    ```
2.  Add the same 4 WhatsApp variables you added locally (`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, etc.).
    *   *Tip:* Use the **Permanent Token** you generated.

### 3. Restart PM2 Application
1.  Restart the backend process to load the new code and environment variables:
    ```bash
    pm2 restart <your-backend-app-name>
    ```
    *(e.g., `pm2 restart eksath-backend`)*

### 4. Verify Nginx
If your Nginx config currently forwards **all** requests to your backend port (e.g., `proxy_pass http://localhost:5000;`), you don't need to change anything.
*   *Check:* Ensure `https://your-domain.com/whatsapp-cloud/webhook` is accessible.

### 5. Update Meta Webhook
1.  Go to the **Meta App Dashboard**.
2.  Go to **WhatsApp > Configuration**.
3.  **Edit Webhook**:
    *   Change the URL from the `ngrok` address to your **Production Domain**:
        `https://your-domain.com/whatsapp-cloud/webhook`
    *   Keep the same Verify Token.
4.  Click **Verify and Save**.

Your bot is now live! 🚀


