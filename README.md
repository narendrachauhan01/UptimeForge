# UptimeForge

A full-stack SaaS uptime monitoring platform with multi-user accounts, WhatsApp & Email alerts, SSL/Domain expiry tracking, Ping Monitor, Razorpay payments, Staff RBAC, Referral system, and a powerful Admin Panel.

**Live URLs:**
- 🌐 Landing: [uptimeforge.narendrasingh.site](https://uptimeforge.narendrasingh.site)
- 📊 Dashboard: [servermonitor.narendrasingh.site](https://servermonitor.narendrasingh.site)
- 🔧 API: [uptimeapi.narendrasingh.site](https://uptimeapi.narendrasingh.site)
- 📖 API Docs: [uptimeapi.narendrasingh.site/api-docs](https://uptimeapi.narendrasingh.site/api-docs)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Landing | React 18 (Vite), Inline CSS |
| Dashboard | React 18 (Vite), Recharts, React Router v6 |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas (Mongoose) |
| Cache | Redis (SSL/Domain 30min TTL) |
| Auth | JWT (httpOnly cookies), bcryptjs, Google OAuth |
| Payments | Razorpay (UPI / Cards / Netbanking) |
| WhatsApp | Green API / Twilio / AiSensy |
| Email | Nodemailer (Gmail SMTP App Password) |
| Rate Limiting | express-rate-limit |
| Process Manager | PM2 |
| Web Server | Nginx (reverse proxy + static serve) |
| SSL | Let's Encrypt (Certbot) |

---

## Project Structure

```
server-monitor/
├── backend/                        ← Node.js API server
│   ├── config/
│   │   ├── db.js                   # MongoDB connection
│   │   └── swagger.js              # Swagger/OpenAPI spec
│   ├── middleware/
│   │   ├── auth.js                 # JWT auth (admin + user + staff)
│   │   └── staffAuth.js            # Staff permission middleware
│   ├── models/
│   │   ├── User.js                 # User schema (plan, billing, referral, accountStatus)
│   │   ├── StaffUser.js            # Staff users with role-based permissions
│   │   ├── Server.js               # Monitored site schema
│   │   ├── PingTarget.js           # Ping/TCP monitor schema
│   │   ├── Recipient.js            # Alert recipient schema
│   │   ├── Alert.js                # Incident alerts (site + ping)
│   │   ├── Notification.js         # In-app notifications
│   │   ├── PaymentRequest.js       # Payment records
│   │   ├── PendingRegistration.js  # OTP-pending registrations
│   │   ├── Settings.js             # Global settings (plans, limits, annual plans)
│   │   ├── SupportTicket.js        # Support ticket schema
│   │   ├── DeletedUser.js          # Deleted user archive
│   │   └── TeamMember.js           # Team member invitations
│   ├── routes/
│   │   ├── auth.js                 # Admin login, rate limiting
│   │   ├── userAuth.js             # User register (OTP), login, Google OAuth, referral
│   │   ├── admin.js                # Admin APIs with RBAC
│   │   ├── staff.js                # Staff management + auth
│   │   ├── servers.js              # Sites CRUD + check-now
│   │   ├── pingTargets.js          # Ping targets CRUD (with plan limits)
│   │   ├── recipients.js           # Alert recipients
│   │   ├── alerts.js               # Incidents (site + ping)
│   │   ├── notifications.js        # In-app notifications
│   │   ├── payment.js              # Razorpay orders + verify + annual billing
│   │   ├── integrations.js         # Webhook, Slack, Rocket.Chat
│   │   ├── whatsapp.js             # WhatsApp config
│   │   ├── emailConfig.js          # SMTP configuration
│   │   ├── expiry.js               # SSL/Domain expiry check
│   │   ├── metrics.js              # Server resource metrics
│   │   ├── ping.js                 # Live ping test
│   │   └── team.js                 # Team member invitations
│   ├── services/
│   │   ├── monitor.js              # Core monitoring loop (site + ping + expiry)
│   │   ├── whatsapp.js             # WhatsApp service (Green API / Twilio / AiSensy)
│   │   └── email.js                # SMTP email + HTML templates
│   ├── app.js                      # Express entry point
│   └── .env                        # Environment variables (not committed)
│
├── uptimeforge-dashboard/          ← React dashboard app
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── pages/
│       │   ├── Landing.jsx         # (kept for fallback routing)
│       │   ├── Login.jsx           # User login (Google OAuth)
│       │   ├── AdminLogin.jsx      # Dedicated admin login
│       │   ├── StaffLogin.jsx      # Staff login with Staff/Admin tabs
│       │   ├── Register.jsx        # OTP registration with referral support
│       │   ├── Dashboard.jsx       # Site monitoring grid
│       │   ├── Servers.jsx         # Add/edit/delete monitored sites
│       │   ├── PingMonitor.jsx     # TCP/Ping monitoring
│       │   ├── Alerts.jsx          # Incidents page (site + ping)
│       │   ├── Charts.jsx          # Performance analytics
│       │   ├── DomainSSL.jsx       # SSL & domain expiry
│       │   ├── Account.jsx         # Account details, billing, invoices, referral
│       │   ├── AccountSuspended.jsx # Suspended account page
│       │   ├── ConfirmDelete.jsx   # Account deletion confirmation
│       │   ├── AdminPanel.jsx      # Full admin panel
│       │   ├── AdminLogin.jsx      # Admin login page
│       │   ├── StaffDashboard.jsx  # Staff panel with RBAC
│       │   ├── StaffManagement.jsx # Create/manage staff users
│       │   ├── PaymentPage.jsx     # Plan selection + Razorpay payment
│       │   ├── PlanSettings.jsx    # Admin: configure plans
│       │   ├── AnnualPlans.jsx     # Admin: annual pricing
│       │   ├── FeatureAccess.jsx   # Admin: feature access control
│       │   ├── IntegrationBackend.jsx # Admin: WhatsApp/Email config
│       │   ├── Integrations.jsx    # User: integrations (Webhook, Rocket.Chat)
│       │   ├── RedisCache.jsx      # Admin: clear SSL cache
│       │   ├── DeletedUsers.jsx    # Admin: deleted user archive
│       │   ├── SupportTickets.jsx  # Admin: support tickets
│       │   ├── ContactSupport.jsx  # User: submit support ticket
│       │   └── ...more pages
│       ├── components/
│       │   ├── UWLogo.jsx
│       │   ├── Toast.jsx
│       │   ├── ConfirmDialog.jsx   # Custom confirm modal (no browser confirm)
│       │   └── NotificationPanel.jsx
│       ├── App.jsx                 # Router, auth flow, 3-state account status
│       ├── api.js                  # Axios API calls
│       └── App.css                 # Global styles
│
├── uptimeforge-landing/            ← Separate landing/marketing site
│   ├── index.html
│   ├── vite.config.js
│   ├── .env                        # VITE_API_URL, VITE_DASHBOARD_URL
│   └── src/
│       ├── App.jsx                 # Full landing page (inline CSS, no deps)
│       └── components/
│           └── UWLogo.jsx
│
└── README.md
```

---

## Features

### User Features
- **Registration** — OTP email verification, Google Sign-In, referral code support
- **Dashboard** — Site status (UP/DOWN), response time, uptime %, SSL/Domain days
- **Site Monitoring** — HTTP checks every 30s–5min based on plan
- **Ping Monitor** — TCP connectivity monitoring with plan-based limits
- **Incidents** — Unified alert history (sites + ping targets) with 📡 badge
- **WhatsApp Alerts** — Instant DOWN & RECOVERED via WhatsApp (Green API/Twilio/AiSensy)
- **Email Alerts** — HTML email for DOWN, RECOVERED, SSL/Domain expiry, ping alerts
- **SSL & Domain Expiry** — Alerts at 30/15/7 days before expiry
- **Performance Charts** — Response time graphs, uptime history
- **Integrations** — Webhook, Rocket.Chat (with Read/Write access control)
- **Account Page** — Billing, invoices with PDF download, security, referral program
- **Referral System** — Share code → friend gets 10 bonus days → you get 10 bonus days
- **Account Deletion** — Email verification flow, data archived before delete
- **3-State Account Status** — Active → Grace Period (read-only) → Suspended

### Plans
| Plan | Sites | Ping Targets | Check Interval | Price |
|------|-------|-------------|----------------|-------|
| Free Trial | 2 | 2 | 5 min | ₹2 one-time |
| Bronze | 5 | 5 | 2 min | ₹499/mo |
| Silver | 15 | 15 | 1 min | ₹999/mo |
| Gold | 30 | 30 | 30 sec | ₹1499/mo |

- Annual billing with configurable discount (default 20%)
- Custom 3-month and 6-month plans via admin
- Re-registered (previously deleted) accounts: no free trial

### Admin Features
- **Overview** — Clickable stat cards (filter Users tab instantly)
- **Users** — Free Trial / Monthly / Annual sections, duration filter dropdown
- **Payments** — Approve/reject, refund via Razorpay, invoice generation
- **Plan Settings** — Prices, limits, ping limits, site limits, ping intervals
- **Annual Plans** — Custom per-plan annual pricing, global discount %
- **Feature Access** — Control Free Trial & Bronze feature access per integration
- **Staff Management** — Create staff with Read/Write permissions per section
- **Deleted Users** — Archive with sites, payments, ping targets history
- **Support Tickets** — View, reply, status management

### Staff Panel (RBAC)
- Separate login at `/staff-login`
- Role-based access: Read or Write per section
- Sections: Dashboard, Users, Payments, Plan Settings, Annual Plans, Feature Access, Integration Backend, Redis Cache, Deleted Users, Support Tickets
- Read-only mode: hides Save/Edit/Delete buttons automatically
- Sidebar matches admin panel structure

### Security
- JWT in httpOnly cookies (no localStorage tokens)
- Rate limiting: Admin/Staff login 10 req/15min, User login 30 req/15min
- `trust proxy` enabled for accurate rate limiting behind Nginx
- OTP-based email verification on registration
- Google OAuth Sign-In
- Account deletion requires email verification link (1-hour expiry)
- CORS: only `DASHBOARD_URL` and `LANDING_URL` allowed
- No free trial for re-registered (previously deleted) accounts

---

## Architecture

```
uptimeforge.narendrasingh.site    → Landing site (uptimeforge-landing/dist)
servermonitor.narendrasingh.site  → Dashboard app (uptimeforge-dashboard/dist)
uptimeapi.narendrasingh.site      → Backend API (Node.js port 5001 via PM2)
```

---

## Setup

### Prerequisites
- Node.js v18+
- PM2 (`npm install -g pm2`)
- MongoDB Atlas account
- Razorpay account
- Gmail account with App Password

### Install Dependencies

```bash
# Backend
cd backend && npm install

# Dashboard
cd uptimeforge-dashboard && npm install

# Landing
cd uptimeforge-landing && npm install
```

### Backend `.env`

```env
PORT=5001
DASHBOARD_URL=https://servermonitor.narendrasingh.site
LANDING_URL=https://uptimeforge.narendrasingh.site

ADMIN_USERNAME=admin
ADMIN_PASSWORD=YourSecurePassword
ADMIN_EMAIL=your@email.com
JWT_SECRET=your_strong_jwt_secret

MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxx.mongodb.net/dbname

RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret

MAIL_USER=your@gmail.com
MAIL_PASS=your_16digit_app_password
MAIL_FROM=UptimeForge <your@gmail.com>

GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret

GREEN_API_INSTANCE=your_instance_id
GREEN_API_TOKEN=your_token

AGENT_API_KEY=your_secure_agent_key
```

### Dashboard `.env`

```env
VITE_API_URL=https://uptimeapi.narendrasingh.site
VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
```

### Landing `.env`

```env
VITE_API_URL=https://uptimeapi.narendrasingh.site
VITE_DASHBOARD_URL=https://servermonitor.narendrasingh.site
```

### Build & Deploy

```bash
# Build dashboard
cd uptimeforge-dashboard
VITE_API_URL=https://uptimeapi.narendrasingh.site npm run build

# Build landing
cd uptimeforge-landing
npm run build

# Start backend with PM2
cd backend
pm2 start app.js --name uptimeforge
pm2 save && pm2 startup
```

### Nginx Setup

```nginx
# Landing page
server {
    server_name uptimeforge.narendrasingh.site;
    root /home/ubuntu/UptimeForge/uptimeforge-landing/dist;
    location / { try_files $uri /index.html; }
}

# Dashboard
server {
    server_name servermonitor.narendrasingh.site;
    root /home/ubuntu/UptimeForge/uptimeforge-dashboard/dist;
    location ~* \.(js|css|woff2)$ { expires 1y; }
    location / { try_files $uri /index.html; }
}

# API
server {
    server_name uptimeapi.narendrasingh.site;
    location / { proxy_pass http://localhost:5001; }
}
```

---

## Key URLs

| Page | URL |
|------|-----|
| Landing | `uptimeforge.narendrasingh.site` |
| Login | `servermonitor.narendrasingh.site/login` |
| Register | `servermonitor.narendrasingh.site/register` |
| Dashboard | `servermonitor.narendrasingh.site/monitoring` |
| Admin Panel | `servermonitor.narendrasingh.site/admin` |
| Admin Login | `servermonitor.narendrasingh.site/admin-login` |
| Staff Login | `servermonitor.narendrasingh.site/staff-login` |
| API Docs | `uptimeapi.narendrasingh.site/api-docs` |

---

## PM2 Commands

```bash
pm2 list                        # View processes
pm2 logs uptimeforge            # Backend logs
pm2 restart uptimeforge         # Restart backend
pm2 monit                       # Live monitor
```

---

## Built & Managed by

**Narendra Singh** — DevOps Engineer  
[chauhan.narendrasingh.01@gmail.com](mailto:chauhan.narendrasingh.01@gmail.com)
