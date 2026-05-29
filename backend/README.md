# UptimeForge — Backend

Node.js / Express REST API for the UptimeForge uptime monitoring platform.

---

## Project Structure

```
backend/
├── config/
│   └── db.js                  # MongoDB connection (connectDB)
├── controllers/               # Business logic — one file per domain
│   ├── adminController.js
│   ├── alertController.js
│   ├── authController.js
│   ├── emailConfigController.js
│   ├── expiryController.js
│   ├── integrationController.js
│   ├── metricsController.js
│   ├── notificationController.js
│   ├── paymentController.js
│   ├── pingController.js
│   ├── pingTargetController.js
│   ├── recipientController.js
│   ├── serverController.js
│   ├── userAuthController.js
│   └── whatsappController.js
├── middleware/
│   └── auth.js                # JWT auth middleware (cookie + header)
├── models/                    # Mongoose schemas
│   ├── Alert.js
│   ├── Integration.js
│   ├── Notification.js
│   ├── PaymentRequest.js
│   ├── PendingRegistration.js
│   ├── PingTarget.js
│   ├── Recipient.js
│   ├── Server.js
│   ├── ServerMetric.js
│   ├── Settings.js
│   └── User.js
├── routes/                    # Thin route files — only endpoint → controller mapping
│   ├── admin.js
│   ├── alerts.js
│   ├── auth.js
│   ├── emailConfig.js
│   ├── expiry.js
│   ├── integrations.js
│   ├── metrics.js
│   ├── notifications.js
│   ├── payment.js
│   ├── ping.js
│   ├── pingTargets.js
│   ├── recipients.js
│   ├── servers.js
│   ├── userAuth.js
│   └── whatsapp.js
├── services/                  # Background services & helpers
│   ├── email.js               # Nodemailer email sender
│   ├── expiry.js              # SSL/Domain expiry checker (Redis cached)
│   ├── monitor.js             # HTTP + Ping monitor loop + alert logic
│   └── whatsapp.js            # Multi-provider WhatsApp (Green API / Twilio / AiSensy)
├── .gitignore
├── app.js                     # Express app setup, route mounting, server start
└── package.json
```

---

## API Endpoints

| Prefix | Route file | Description |
|--------|-----------|-------------|
| `/api/auth` | routes/auth.js | Admin login / profile |
| `/api/users` | routes/userAuth.js | User register, login, Google OAuth |
| `/api/servers` | routes/servers.js | Site monitors CRUD |
| `/api/recipients` | routes/recipients.js | Alert recipients (email/WhatsApp) |
| `/api/alerts` | routes/alerts.js | Alert history |
| `/api/integrations` | routes/integrations.js | Webhook / Rocket.Chat integrations |
| `/api/admin` | routes/admin.js | Admin panel — users, payments, settings |
| `/api/payment` | routes/payment.js | Razorpay orders & verification |
| `/api/notifications` | routes/notifications.js | In-app notifications |
| `/api/expiry` | routes/expiry.js | SSL & Domain expiry lookup |
| `/api/whatsapp` | routes/whatsapp.js | WhatsApp config & test |
| `/api/email-config` | routes/emailConfig.js | SMTP config |
| `/api/ping` | routes/ping.js | TCP ping check |
| `/api/ping-targets` | routes/pingTargets.js | Saved ping targets |
| `/api/metrics` | routes/metrics.js | Server resource metrics |

---

## Environment Variables (`.env`)

```env
PORT=5001
MONGO_URI=mongodb://...
JWT_SECRET=your_jwt_secret
FRONTEND_URL=https://your-frontend.com

# WhatsApp
WA_PROVIDER=greenapi          # greenapi | twilio | aisensy
GREEN_API_INSTANCE=...
GREEN_API_TOKEN=...

# Email (SMTP)
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=...

# Redis
REDIS_URL=redis://127.0.0.1:6379

# Google OAuth
GOOGLE_CLIENT_ID=...

# Razorpay
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
```

---

## Running

```bash
# Install dependencies
npm install

# Development
npm run dev        # nodemon app.js

# Production
npm start          # node app.js

# PM2 (EC2)
pm2 start app.js --name uptimeforge
```

---

## Architecture Notes

- **MVC pattern** — Routes are thin (endpoint → controller only). Controllers hold business logic. Services hold reusable utilities (email, WhatsApp, monitoring loop).
- **Auth** — JWT stored in `httpOnly` cookie (`sm_token`). Middleware reads cookie first, falls back to `Authorization: Bearer` header.
- **Redis Cache** — SSL/Domain expiry results cached for 30 minutes to avoid repeated WHOIS API calls.
- **Monitor Loop** — `services/monitor.js` runs a tick every 30s. Each site is checked based on plan interval (Free=5m, Bronze=2m, Silver=1m, Gold=30s).
- **Alert dedup** — `downAlertSent` flag on Server model prevents duplicate DOWN alerts.
- **User isolation** — All models include `userId` field. Every query filters by `req.userId`.
