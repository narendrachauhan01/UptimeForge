# UptimeWatch

A full-stack SaaS uptime monitoring platform with multi-user accounts, WhatsApp & Email alerts, SSL/Domain expiry tracking, Razorpay payments, and a powerful Admin Panel.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 (Vite), Recharts, React Router v6 |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas (Mongoose) |
| Auth | JWT, bcryptjs, Google OAuth (GSI) |
| Payments | Razorpay (UPI/manual UTR verification) |
| WhatsApp | whatsapp-web.js (Puppeteer + Chrome) |
| Email | Nodemailer (Gmail SMTP) |
| Process Manager | PM2 |

---

## Project Structure

```
server-monitor/
├── backend/
│   ├── middleware/
│   │   └── auth.js                 # JWT auth middleware (admin + user)
│   ├── models/
│   │   ├── User.js                 # User schema (plan, trial, google/facebook ID)
│   │   ├── Server.js               # Monitored site schema
│   │   ├── Recipient.js            # Alert recipient schema
│   │   ├── Notification.js         # In-app notification schema
│   │   ├── PaymentRequest.js       # Payment/UTR request schema
│   │   ├── PendingRegistration.js  # OTP-pending registrations
│   │   └── Settings.js             # Global settings (plans, trial days)
│   ├── routes/
│   │   ├── auth.js                 # Admin login, forgot/reset password, profile
│   │   ├── userAuth.js             # User register (OTP), login, Google OAuth
│   │   ├── admin.js                # Admin: users, payments approve/reject
│   │   ├── servers.js              # Sites CRUD + check-now
│   │   ├── recipients.js           # Recipients CRUD
│   │   ├── alerts.js               # Alert history
│   │   ├── notifications.js        # In-app notifications
│   │   ├── payment.js              # Razorpay orders + UTR submission
│   │   └── whatsapp.js             # WhatsApp status
│   ├── services/
│   │   ├── monitor.js              # Core monitoring loop (every 60s)
│   │   ├── whatsapp.js             # WhatsApp bot (LocalAuth)
│   │   └── email.js                # SMTP email service
│   ├── server.js                   # Express entry point
│   └── .env                        # Environment variables (not committed)
│
├── frontend/
│   ├── index.html                  # Vite entry, Google GSI script
│   ├── vite.config.js
│   └── src/
│       ├── pages/
│       │   ├── Landing.jsx         # Public landing page
│       │   ├── Login.jsx           # User + Admin login, Google Sign-In
│       │   ├── Register.jsx        # Multi-step registration with OTP
│       │   ├── Dashboard.jsx       # Site cards (grid/list view toggle)
│       │   ├── Charts.jsx          # Performance analytics
│       │   ├── Servers.jsx         # Add/edit/delete monitored sites
│       │   ├── Recipients.jsx      # Alert recipients management
│       │   ├── Alerts.jsx          # Alert history
│       │   ├── DomainSSL.jsx       # SSL & domain expiry tracking
│       │   ├── Account.jsx         # Plan info, change password
│       │   ├── AdminPanel.jsx      # Full admin panel (users, payments, settings)
│       │   ├── PaymentPage.jsx     # Razorpay payment + UTR submission
│       │   ├── Pricing.jsx         # Public pricing page
│       │   ├── TermsOfService.jsx  # Terms of service
│       │   └── VerifyAccount.jsx   # Account verification
│       ├── components/
│       │   ├── UWLogo.jsx          # Brand logo
│       │   ├── Toast.jsx           # Toast notifications
│       │   └── NotificationPanel.jsx # Bell notification drawer
│       ├── App.jsx                 # Router, sidebar, auth flow
│       ├── api.js                  # Axios API calls
│       └── App.css                 # Global styles
│
└── README.md
```

---

## Features

### User Features
- **Registration** — OTP email verification, Google Sign-In, plan selection at signup
- **Dashboard** — Grid & List view toggle, site status (Online/Offline), response time, SSL/Domain days
- **Site Monitoring** — HTTP check every 60 seconds; 200/301/302 = UP
- **WhatsApp Alerts** — Instant DOWN & RECOVERED alerts via WhatsApp
- **Email Alerts** — HTML email alerts for DOWN, RECOVERED, SSL/Domain expiry
- **SSL Expiry** — Auto-checked via TLS; alerts at 30 / 15 / 7 days
- **Domain Expiry** — Auto-checked via WHOIS API; alerts at 30 / 15 / 7 days
- **Performance Charts** — Response time graphs, uptime %, alert history
- **Notifications** — In-app bell icon with unread count
- **Account Page** — Plan status, trial days left, change password

### Plans
| Plan | Sites | Price |
|------|-------|-------|
| Free Trial | 2 sites | ₹2 one-time verification |
| Bronze | 5 sites | ₹499/month |
| Silver | 15 sites | ₹999/month |
| Gold | 30 sites | ₹1499/month |

### Admin Features
- **Admin Panel** — Full dashboard with tabbed interface
- **Overview** — User stats, revenue summary, pending payments, expiring plans/trials
- **Users Tab** — Search, filter by plan, edit plan/block, extend trial, assign plan, export CSV
- **Payments Tab** — Approve/reject UTR payment requests, status badges
- **Plan Settings** — Configure trial days, plan prices, site limits, feature bullets
- **My Profile** — Update admin username, email, password
- **Infra** — Server resource monitoring (CPU, RAM, disk)

### Auth & Security
- JWT tokens (30-day expiry for users, 7-day for admin)
- 15-minute session auto-logout on inactivity
- OTP-based email verification on registration
- Google OAuth Sign-In (one-click account creation + login)
- bcrypt password hashing

---

## Setup

### Prerequisites

- Node.js v18+
- Google Chrome (`/usr/bin/google-chrome`) — for WhatsApp
- PM2 (`npm install -g pm2`)
- MongoDB Atlas account
- Razorpay account (for payments)

### Install Dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

### Backend `.env`

Create `backend/.env` (see `.env.example`):

```env
PORT=5001
FRONTEND_URL=https://yourdomain.com

# Admin credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YourSecurePassword
ADMIN_EMAIL=your@email.com
JWT_SECRET=your_strong_jwt_secret

# MongoDB
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxx.mongodb.net/monitor_server_prd

# Razorpay
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret

# SMTP Email (Gmail)
MAIL_USER=your@gmail.com
MAIL_PASS=your_app_password
MAIL_FROM=UptimeWatch <your@gmail.com>

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com

# Agent API Key (infra monitoring)
AGENT_API_KEY=your_secure_agent_key
```

### Frontend `.env`

Create `frontend/.env`:

```env
VITE_API_URL=https://yourdomain.com
VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
```

### Gmail App Password

1. Google Account → **Security** → Enable 2-Step Verification
2. **App Passwords** → Select app: `Mail` → Device: `Other` → `UptimeWatch`
3. Copy the 16-digit password → paste in `MAIL_PASS`

### Google OAuth Setup

1. [console.cloud.google.com](https://console.cloud.google.com) → New Project
2. **APIs & Services → Credentials → Create OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Authorized JavaScript origins: `https://yourdomain.com`
5. Copy Client ID → paste in both `.env` files

---

## Run with PM2

```bash
# Build frontend
cd frontend && npm run build

# Start backend
cd backend
pm2 start server.js --name "uptimewatch-backend"

# Serve frontend (or use Nginx)
pm2 start "npx serve dist -p 3001" --name "uptimewatch-frontend"

# Save & enable autostart
pm2 save
pm2 startup
```

---

## WhatsApp Setup

1. Open `https://yourdomain.com/whatsapp` (admin only)
2. Scan the QR code with WhatsApp → Linked Devices → Link a Device
3. Session saves automatically — no re-scan after restart

---

## PM2 Commands

```bash
pm2 list                              # View all processes
pm2 logs uptimewatch-backend          # Backend logs
pm2 restart uptimewatch-backend       # Restart backend
pm2 restart uptimewatch-frontend      # Restart frontend
pm2 monit                             # Live monitor
```

---

## URLs

| Page | URL |
|------|-----|
| Landing | `/` |
| Login | `/login` |
| Register | `/register` |
| Dashboard | `/dashboard` |
| Admin Panel | `/admin` |
| Pricing | `/pricing` |
| Terms | `/terms` |
| Backend API | `:5001/api` |

---

## Alert Examples

**Site Down (WhatsApp):**
```
🚨 Site Down Alert!
Site: myshop.com
URL: https://myshop.com
Time: 26/5/2026, 6:30:00 pm
Site is currently DOWN ❌
Please check immediately!
```

**SSL Expiry Warning:**
```
⚠️ SSL Certificate Alert!
Site: myshop.com
Expires: Wed Aug 04 2026
Days Left: 15 days
Please renew before it expires!
```

---

## Built & Managed by

**Narendra Singh** — DevOps Engineer
