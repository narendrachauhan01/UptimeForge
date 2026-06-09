const Alert  = require('../models/Alert');
const Server = require('../models/Server');

const PAGE_SIZE = 20;

// GET /api/alerts
exports.getAlerts = async (req, res) => {
    try {
        // Base filter — scope to this user's servers + ping alerts
        let baseFilter = {};
        if (!req.isAdmin) {
            const serverIds = (await Server.find({ userId: req.userId }, '_id')).map(s => s._id);
            baseFilter = { $or: [
                { server: { $in: serverIds } },
                { userId: req.userId, source: 'ping' },
            ]};
        }
        // Always last 30 days
        baseFilter.createdAt = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };

        // Query filter — adds type / month / search on top of base
        const queryFilter = { ...baseFilter };

        if (req.query.type && req.query.type !== 'all') {
            queryFilter.type = req.query.type;
        }

        if (req.query.month && req.query.month !== 'all') {
            const [year, mon] = req.query.month.split('-').map(Number);
            queryFilter.createdAt = { $gte: new Date(year, mon - 1, 1), $lt: new Date(year, mon, 1) };
        }

        if (req.query.search) {
            const q = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            queryFilter.$and = [{ $or: [{ serverName: q }, { serverUrl: q }] }];
        }

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const skip = (page - 1) * PAGE_SIZE;

        const [alerts, total, downCount, recoveredCount, totalCount, monthAgg] = await Promise.all([
            Alert.find(queryFilter).sort('-createdAt').skip(skip).limit(PAGE_SIZE),
            Alert.countDocuments(queryFilter),
            Alert.countDocuments({ ...baseFilter, type: 'down' }),
            Alert.countDocuments({ ...baseFilter, type: 'recovered' }),
            Alert.countDocuments(baseFilter),
            Alert.aggregate([
                { $match: baseFilter },
                { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } } } },
                { $sort: { _id: -1 } },
            ]),
        ]);

        res.json({
            alerts,
            total,
            page,
            pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
            summary: {
                total: totalCount,
                down: downCount,
                recovered: recoveredCount,
                months: monthAgg.map(m => m._id),
            },
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
