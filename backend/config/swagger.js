const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'UptimeForge API',
            version: '1.0.0',
            description: 'UptimeForge Backend API — Uptime Monitoring Platform',
            contact: { name: 'Narendra Singh', email: 'chauhan.narendrasingh.01@gmail.com' },
        },
        servers: [
            { url: 'https://uptimeapi.narendrasingh.site', description: 'Production' },
            { url: 'http://localhost:5001', description: 'Local Dev' },
        ],
        components: {
            securitySchemes: {
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'sm_token',
                    description: 'HttpOnly cookie set on login',
                },
            },
        },
        security: [{ cookieAuth: [] }],
        tags: [
            { name: 'Auth', description: 'Admin login/logout' },
            { name: 'User Auth', description: 'User register, login, profile' },
            { name: 'Staff', description: 'Staff management & auth' },
            { name: 'Servers', description: 'Site monitoring' },
            { name: 'Ping Targets', description: 'Ping / TCP monitoring' },
            { name: 'Alerts', description: 'Incident alerts' },
            { name: 'Recipients', description: 'Notification recipients' },
            { name: 'Payments', description: 'Plans & payments' },
            { name: 'Admin', description: 'Admin panel APIs' },
            { name: 'Settings', description: 'Platform settings' },
            { name: 'Integrations', description: 'Slack, Webhook, etc.' },
            { name: 'WhatsApp', description: 'WhatsApp config & alerts' },
            { name: 'Email Config', description: 'SMTP configuration' },
            { name: 'Expiry', description: 'SSL & Domain expiry' },
            { name: 'Metrics', description: 'Server resource metrics' },
            { name: 'Notifications', description: 'In-app notifications' },
        ],
    },
    apis: ['./routes/*.js'],
};

module.exports = swaggerJsdoc(options);
