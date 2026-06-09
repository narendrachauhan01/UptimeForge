require('dotenv').config();

const express     = require('express');
const http        = require('http');
const cors        = require('cors');
const cookieParser = require('cookie-parser');

const { connectDB } = require('./config/db');
const wa      = require('./services/whatsapp');
const monitor = require('./services/monitor');
const { startExpiryReminder } = require('./services/expiryReminder');

const app        = express();
const httpServer = http.createServer(app);

const allowedOrigins = [
    process.env.DASHBOARD_URL,
    process.env.LANDING_URL,
    ...(process.env.NODE_ENV !== 'production' ? [
        'http://localhost:3000', 'http://localhost:3001',
        'http://localhost:5173', 'http://localhost:5174',
    ] : []),
].filter(Boolean);

app.use(cors({
    origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error('CORS: not allowed'));
    },
    credentials: true,
}));
app.set('trust proxy', 1);
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', require('express').static(require('path').join(__dirname, 'uploads')));

app.use('/api/servers',       require('./routes/servers'));
app.use('/api/recipients',    require('./routes/recipients'));
app.use('/api/alerts',        require('./routes/alerts'));
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/users',         require('./routes/userAuth'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/payment',       require('./routes/payment'));
app.use('/api/admin',         require('./routes/admin'));
app.use('/api/whatsapp',      require('./routes/whatsapp'));
app.use('/api/expiry',        require('./routes/expiry'));
app.use('/api/email-config',  require('./routes/emailConfig'));
app.use('/api/metrics',       require('./routes/metrics'));
app.use('/api/ping',          require('./routes/ping'));
app.use('/api/ping-targets',  require('./routes/pingTargets'));
app.use('/api/integrations',  require('./routes/integrations'));
app.use('/api/telegram',      require('./routes/telegram'));
app.use('/api/staff',         require('./routes/staff'));
app.use('/api/reports',       require('./routes/reports'));
// Swagger Docs
const swaggerUi   = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'UptimeForge API Docs',
    customCss: '.swagger-ui .topbar { background: #1e1b4b; } .swagger-ui .topbar-wrapper img { display:none; } .swagger-ui .topbar-wrapper::before { content:"UptimeForge API"; color:#a78bfa; font-size:20px; font-weight:800; }',
    swaggerOptions: { persistAuthorization: true },
}));

const PORT = process.env.PORT || 5001;

connectDB().then(() => {
    wa.init();
    monitor.start();
    startExpiryReminder();
    httpServer.listen(PORT, () => console.log(`http://localhost:${PORT}/api-docs`));
});
