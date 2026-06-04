# UptimeForge — Features Documentation

**Last Updated:** June 2026  
**Version:** Production  
**Domains:**  
- Dashboard: `servermonitor.narendrasingh.site`  
- Landing: `uptimeforge.narendrasingh.site`  
- API: `uptimeapi.narendrasingh.site`

---

## ✅ IMPLEMENTED & WORKING

### 🔐 Authentication
| Feature | Status | Notes |
|---------|--------|-------|
| User Register (Email + OTP) | ✅ Working | Email OTP verify |
| User Login | ✅ Working | httpOnly Cookie |
| Google OAuth Login/Register | ✅ Working | GSI button |
| Admin Login | ✅ Working | `/admin-login` |
| Staff Login | ✅ Working | `/staff-login` |
| Forgot Password | ✅ Working | Email reset link |
| Logout (all roles) | ✅ Working | Admin→/admin-login, User→/login |
| No re-registration free trial | ✅ Working | Blocked for deleted accounts |

---

### 📊 Monitoring
| Feature | Status | Notes |
|---------|--------|-------|
| HTTP/HTTPS site monitoring | ✅ Working | Every 30s–5min (plan based) |
| Auto start/stop on plan | ✅ Working | Stops when plan expires |
| Check interval (plan based) | ✅ Working | Gold=30s, Silver=1min, Bronze=2min, Trial=5min |
| UP/DOWN status | ✅ Working | |
| Response time tracking | ✅ Working | |
| History bar (48 checks) | ✅ Working | Visual bar on monitoring page |
| Uptime % calculation | ✅ Working | Based on historyBar |
| Auto re-check | ✅ Working | setInterval every 30s |
| Monitoring stops on expiry | ✅ Working | All plans |

---

### 🔔 Alerts
| Feature | Status | Notes |
|---------|--------|-------|
| Email alerts (down/up) | ✅ Working | SMTP via Gmail |
| WhatsApp alerts | ✅ Working | Green API |
| Multi-recipient alerts | ✅ Working | Multiple contacts per site |
| Alert history | ✅ Working | Incidents page |
| Alerts stop on plan expire | ✅ Working | |
| Alert on site recovery | ✅ Working | |

---

### 🔒 SSL & Domain Monitoring
| Feature | Status | Notes |
|---------|--------|-------|
| SSL expiry check | ✅ Working | Every 6 hours |
| Domain expiry check | ✅ Working | Every 6 hours |
| SSL expiry alert | ✅ Working | Email + WhatsApp |
| Domain expiry alert | ✅ Working | Email + WhatsApp |
| SSL/Domain stops on plan expire | ✅ Working | |
| Free trial excluded | ✅ Working | Only paid plans |

---

### 🏓 Ping Monitor
| Feature | Status | Notes |
|---------|--------|-------|
| TCP Ping monitoring | ✅ Working | IP:Port checks |
| Ping alerts | ✅ Working | |
| Ping stops on plan expire | ✅ Working | |

---

### 💳 Plans & Billing
| Feature | Status | Notes |
|---------|--------|-------|
| Free Trial (5 days, ₹2 verification) | ✅ Working | One-time only |
| Bronze/Silver/Gold plans | ✅ Working | |
| Monthly billing | ✅ Working | |
| Annual billing | ✅ Working | Discount configured |
| 3-Month plan | ✅ Working | |
| 6-Month plan | ✅ Working | |
| Razorpay UPI payment | ✅ Working | |
| Admin manual plan assign | ✅ Working | |
| Plan expiry → grace (30 days) | ✅ Working | Read-only mode |
| Grace → Suspended (30+ days) | ✅ Working | API blocked |
| Refund via Razorpay | ✅ Working | Admin initiated |
| Refund status check | ✅ Working | Live from Razorpay |
| Invoice download | ✅ Working | PDF style receipt |

---

### 📧 Email System
| Feature | Status | Notes |
|---------|--------|-------|
| OTP registration email | ✅ Working | |
| Password reset email | ✅ Working | 1 hour expiry |
| Down/Recovery alerts | ✅ Working | |
| Refund notification | ✅ Working | |
| Account deletion email | ✅ Working | 1 hour verify link |
| Plan expiry reminder (7 days before) | ✅ Working | Daily 9 AM cron |

---

### 🔗 Integrations
| Feature | Status | Notes |
|---------|--------|-------|
| Webhook | ✅ Working | Custom URL |
| Slack | ✅ Working | |
| Discord | ✅ Working | |
| Rocket.Chat | ✅ Working | |
| Integrations stop on plan expire | ✅ Working | |
| Feature access control (admin toggle) | ✅ Working | Per integration type |

---

### 👥 User Management
| Feature | Status | Notes |
|---------|--------|-------|
| User registration | ✅ Working | |
| User profile update | ✅ Working | Name |
| Password change | ✅ Working | |
| Account deletion (email verify) | ✅ Working | Data archived |
| Referral system | ✅ Working | 10 bonus days |
| Referral code one-time use | ✅ Working | |

---

### 🛠️ Admin Panel
| Feature | Status | Notes |
|---------|--------|-------|
| Users list with filters | ✅ Working | |
| Active Subscriptions count | ✅ Working | |
| Expired Plans tab | ✅ Working | |
| Assign plan to user | ✅ Working | |
| Edit user (modal) | ✅ Working | |
| Block/Unblock user | ✅ Working | |
| Delete user | ✅ Working | Archived |
| Payments table | ✅ Working | |
| Approve/Reject payment | ✅ Working | |
| Refund payment | ✅ Working | |
| Plan Settings | ✅ Working | Prices, intervals |
| Annual Plans settings | ✅ Working | |
| Feature Access control | ✅ Working | Per plan type |
| Staff Management | ✅ Working | RBAC |
| Support Tickets | ✅ Working | |
| Deleted Users archive | ✅ Working | |
| Admin My Profile | ✅ Working | Username/email/password |
| Overview stats | ✅ Working | Revenue, users, plans |
| Plan Distribution chart | ✅ Working | |
| Trials expiring in 2 days | ✅ Working | |
| Plans expiring in 7 days | ✅ Working | |

---

### 👔 Staff System
| Feature | Status | Notes |
|---------|--------|-------|
| Staff accounts | ✅ Working | |
| Role-based permissions | ✅ Working | Read/Write per section |
| Staff dashboard | ✅ Working | |
| Staff logout → /staff-login | ✅ Working | |

---

### 🖥️ Server Resources (Infra)
| Feature | Status | Notes |
|---------|--------|-------|
| CPU/RAM/Disk monitoring | ✅ Working | Agent required |
| SSH sessions history | ✅ Working | |
| Server online/offline detect | ✅ Working | 60s threshold |
| Metrics upsert (no history bloat) | ✅ Working | |
| Offline = stale data hide | ✅ Working | |

---

### 📈 Performance Analytics
| Feature | Status | Notes |
|---------|--------|-------|
| Response time chart | ✅ Working | |
| Uptime % per site | ✅ Working | |
| Alert trends (7 days) | ✅ Working | |
| Site status pie chart | ✅ Working | |
| CSV export | ✅ Working | |
| Light/Dark mode | ✅ Working | Performance page only |
| Check interval display | ✅ Working | Backend se fetch |

---

### 🔒 Security
| Feature | Status | Notes |
|---------|--------|-------|
| JWT httpOnly cookies | ✅ Working | No localStorage |
| Zero localStorage | ✅ Working | Only cookies |
| Rate limiting (login) | ✅ Working | 30 attempts/15min |
| CORS restricted | ✅ Working | Only allowed domains |
| Razorpay webhook signature | ✅ Working | Mandatory verify |
| Ping endpoint protected | ✅ Working | Auth required |
| RBAC (staff permissions) | ✅ Working | |

---

## ❌ NOT IMPLEMENTED (Future Features)

| Feature | Priority | Effort | Description |
|---------|----------|--------|-------------|
| **Public Status Page** | 🔴 High | 3-4 days | Shareable status page for customers |
| **Maintenance Window** | 🔴 High | 1-2 days | Pause monitoring during planned downtime |
| **Response Time Alert** | 🟡 Medium | 1 day | Alert when response > threshold (e.g., 2000ms) |
| **Keyword Monitoring** | 🟡 Medium | 2 days | Check if specific word exists in response |
| **Weekly/Monthly Report Email** | 🟡 Medium | 1 day | Auto summary email to users |
| **Bulk Monitor Import (CSV)** | 🟡 Medium | 1-2 days | Add multiple sites from CSV |
| **2FA (Two Factor Auth)** | 🟡 Medium | 2-3 days | TOTP for admin/user login |
| **Custom HTTP Headers** | 🟢 Low | 1 day | Add headers to monitoring requests |
| **Multiple Check Locations** | 🟢 Low | 1 week+ | Monitor from different countries |
| **Mobile App** | 🟢 Low | 2-3 weeks | Push notifications |
| **SLA Reports** | 🟢 Low | 2-3 days | PDF uptime SLA report |
| **Zapier/Make Integration** | 🟢 Low | 2-3 days | Connect with 1000+ apps |
| **API Key for users** | 🟢 Low | 1-2 days | Let users access API |
| **Monitor Tags/Groups** | 🟢 Low | 1 day | Organize monitors |
| **HTTP Method (POST/PUT)** | 🟢 Low | 1 day | Currently only GET |

---

## ⚙️ TECH STACK

| Component | Technology |
|-----------|-----------|
| Frontend | React (Vite) |
| Backend | Node.js + Express |
| Database | MongoDB Atlas (`uptimeforge_prd`) |
| Auth | JWT httpOnly Cookies |
| Email | Nodemailer (Gmail SMTP) |
| Payments | Razorpay |
| WhatsApp | Green API |
| Hosting | AWS EC2 |
| Process Manager | PM2 |
| Reverse Proxy | Nginx + Cloudflare |
| SSL | Let's Encrypt |

---

## 📁 PROJECT STRUCTURE

```
UptimeForge/
├── backend/              → Node.js API
│   ├── controllers/      → Business logic
│   ├── models/           → MongoDB schemas
│   ├── routes/           → API endpoints
│   ├── services/         → monitor, email, whatsapp, expiryReminder
│   └── middleware/       → auth, staffAuth
├── uptimeforge-dashboard/ → React dashboard app
└── uptimeforge-landing/  → React landing page
```

---

## 🌐 API ENDPOINTS SUMMARY

| Category | Base Path | Auth |
|----------|-----------|------|
| Admin Auth | `/api/auth/` | Admin cookie |
| User Auth | `/api/users/` | User cookie |
| Servers | `/api/servers/` | User cookie |
| Alerts | `/api/alerts/` | User cookie |
| Payments | `/api/payment/` | User/Admin |
| Admin Panel | `/api/admin/` | Admin cookie |
| Staff | `/api/staff/` | Admin/Staff |
| Integrations | `/api/integrations/` | User cookie |
| Metrics | `/api/metrics/` | Admin/Agent key |
| Ping | `/api/ping/` | User cookie |
| Notifications | `/api/notifications/` | User cookie |

