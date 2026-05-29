const mongoose = require('mongoose');

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('[DB] MongoDB connected');
    } catch (e) {
        console.error('[DB] Connection failed:', e.message);
        process.exit(1);
    }
}

module.exports = { connectDB };
