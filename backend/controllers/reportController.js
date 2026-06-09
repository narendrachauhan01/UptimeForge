const Report   = require('../models/Report');
const User     = require('../models/User');
const { buildReportData, generateHTML } = require('../services/reportGenerator');

const MAX_REPORTS = 2;

// GET /api/reports
exports.list = async (req, res) => {
    try {
        const userId = req.user._id;
        const reports = await Report.find({ userId }).sort('-createdAt').lean();
        const user = await User.findById(userId).select('reportSchedule').lean();
        res.json({ reports, schedule: user?.reportSchedule || 'none' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// POST /api/reports/generate
exports.generate = async (req, res) => {
    try {
        const userId = req.user._id;
        const type   = req.body.type; // 'weekly' | 'monthly'
        if (!['weekly', 'monthly'].includes(type)) return res.status(400).json({ error: 'Invalid type' });

        const data = await buildReportData(userId, type);

        // Save report
        const report = await Report.create({
            userId,
            type,
            title:       data.title,
            periodStart: data.periodStart,
            periodEnd:   data.periodEnd,
            data,
        });

        // Keep only last MAX_REPORTS per type — delete oldest
        const all = await Report.find({ userId, type }).sort('-createdAt').lean();
        if (all.length > MAX_REPORTS) {
            const toDelete = all.slice(MAX_REPORTS).map(r => r._id);
            await Report.deleteMany({ _id: { $in: toDelete } });
        }

        res.json({ report });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /api/reports/:id/view  — returns HTML page
exports.view = async (req, res) => {
    try {
        const report = await Report.findById(req.params.id).lean();
        if (!report) return res.status(404).send('Report not found');
        const html = generateHTML(report.data);
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// DELETE /api/reports/:id
exports.remove = async (req, res) => {
    try {
        const userId = req.user._id;
        await Report.findOneAndDelete({ _id: req.params.id, userId });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// PUT /api/reports/schedule
exports.setSchedule = async (req, res) => {
    try {
        const userId   = req.user._id;
        const schedule = req.body.schedule; // 'none' | 'weekly' | 'monthly'
        if (!['none', 'weekly', 'monthly'].includes(schedule)) return res.status(400).json({ error: 'Invalid schedule' });
        await User.findByIdAndUpdate(userId, { reportSchedule: schedule });
        res.json({ schedule });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// Called by cron — auto-generate for all users who have a schedule
exports.autoGenerate = async (type) => {
    try {
        const users = await User.find({ reportSchedule: type }).lean();
        for (const u of users) {
            try {
                const data   = await buildReportData(u._id, type);
                await Report.create({ userId: u._id, type, title: data.title, periodStart: data.periodStart, periodEnd: data.periodEnd, data });
                // Trim to MAX_REPORTS
                const all = await Report.find({ userId: u._id, type }).sort('-createdAt').lean();
                if (all.length > MAX_REPORTS) {
                    const toDelete = all.slice(MAX_REPORTS).map(r => r._id);
                    await Report.deleteMany({ _id: { $in: toDelete } });
                }
                console.log(`[Report] Auto-generated ${type} report for user ${u.email}`);
            } catch (err) {
                console.error(`[Report] Failed for user ${u._id}:`, err.message);
            }
        }
    } catch (e) {
        console.error('[Report] autoGenerate error:', e.message);
    }
};
