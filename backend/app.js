require('dotenv').config();

const express          = require('express');
const http             = require('http');
const cors             = require('cors');
const cookieParser     = require('cookie-parser');
const helmet           = require('helmet');
const mongoSanitize    = require('express-mongo-sanitize');
const rateLimit        = require('express-rate-limit');

const { connectDB } = require('./config/db');
const wa      = require('./services/whatsapp');
const monitor = require('./services/monitor');
const { startExpiryReminder } = require('./services/expiryReminder');
const { startCleanup }        = require('./services/cleanup');

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

// Security headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow static file loads
    contentSecurityPolicy: false, // CSP handled by frontend
}));

app.use(cors({
    origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error('CORS: not allowed'));
    },
    credentials: true,
}));
app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// Strip $ and . from body/params — prevents NoSQL injection
// req.query is a getter in newer Express; sanitize it manually to avoid TypeError
app.use((req, res, next) => {
    if (req.body)   req.body   = mongoSanitize.sanitize(req.body);
    if (req.params) req.params = mongoSanitize.sanitize(req.params);
    next();
});

// Global rate limit — 300 requests per minute per IP
app.use(rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please slow down.' },
    skip: (req) => req.path.startsWith('/api/agent/'), // agent metrics exempt
}));
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
app.use('/api/agent',         require('./routes/agent'));
app.use('/api/ping',          require('./routes/ping'));
app.use('/api/ping-targets',  require('./routes/pingTargets'));
app.use('/api/icmp-targets',  require('./routes/icmpTargets'));
app.use('/api/dns',           require('./routes/dns'));
app.use('/api/dns-targets',   require('./routes/dnsTargets'));
app.use('/api/udp',           require('./routes/udp'));
app.use('/api/udp-targets',   require('./routes/udpTargets'));
app.use('/api/api-monitor',   require('./routes/apiMonitor'));
app.use('/api/api-targets',   require('./routes/apiTargets'));
app.use('/api/integrations',  require('./routes/integrations'));
app.use('/api/telegram',      require('./routes/telegram'));
app.use('/api/staff',         require('./routes/staff'));
app.use('/api/reports',       require('./routes/reports'));

// Swagger Docs — protected by HTTP Basic Auth in production
const swaggerUi   = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const swaggerGuard = (req, res, next) => {
    if (process.env.NODE_ENV !== 'production') return next();
    const b64 = (req.headers.authorization || '').replace('Basic ', '');
    const [u, p] = Buffer.from(b64, 'base64').toString().split(':');
    if (u === process.env.SWAGGER_USER && p === process.env.SWAGGER_PASS) return next();
    res.set('WWW-Authenticate', 'Basic realm="UptimeForge API Docs"');
    res.status(401).send('Unauthorized');
};
app.use('/api-docs', swaggerGuard, swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'UptimeForge API Docs',
    customCss: '.swagger-ui .topbar { background: #1e1b4b; } .swagger-ui .topbar-wrapper img { display:none; } .swagger-ui .topbar-wrapper::before { content:"UptimeForge API"; color:#a78bfa; font-size:20px; font-weight:800; }',
    swaggerOptions: { persistAuthorization: true },
}));

const PORT = process.env.PORT || 5001;

connectDB().then(() => {
    wa.init();
    monitor.start();
    startExpiryReminder();
    startCleanup();
    httpServer.listen(PORT, () => console.log(`http://localhost:${PORT}/api-docs`));
});
