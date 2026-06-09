const path      = require('path');
const fs        = require('fs');
const Report    = require('../models/Report');
const User      = require('../models/User');
const { buildReportData, generateHTML } = require('../services/reportGenerator');
const puppeteer = require('puppeteer-core');

const MAX_REPORTS = 1;
const PDF_DIR     = path.join(__dirname, '../uploads/reports');

if (!fs.existsSync(PDF_DIR)) fs.mkdirSync(PDF_DIR, { recursive: true });

async function makePDF(reportId, html) {
    let browser;
    try {
        browser = await puppeteer.launch({
            executablePath: '/usr/bin/chromium-browser',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
            headless: true,
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
        const buf = await page.pdf({ format: 'A4', printBackground: true });
        fs.writeFileSync(path.join(PDF_DIR, `${reportId}.pdf`), buf);
        console.log(`[Report PDF] Generated for report ${reportId}`);
    } catch (e) {
        console.error(`[Report PDF] makePDF failed for ${reportId}:`, e.message);
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

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
        const type   = req.body.type;
        if (!['weekly', 'monthly'].includes(type)) return res.status(400).json({ error: 'Invalid type' });

        const data   = await buildReportData(userId, type);
        const report = await Report.create({
            userId,
            type,
            title:       data.title,
            periodStart: data.periodStart,
            periodEnd:   data.periodEnd,
            data,
        });

        // Keep only last MAX_REPORTS per type
        const all = await Report.find({ userId, type }).sort('-createdAt').lean();
        if (all.length > MAX_REPORTS) {
            const toDelete = all.slice(MAX_REPORTS).map(r => r._id);
            // Delete PDF files for removed reports
            toDelete.forEach(id => {
                const f = path.join(PDF_DIR, `${id}.pdf`);
                if (fs.existsSync(f)) fs.unlinkSync(f);
            });
            await Report.deleteMany({ _id: { $in: toDelete } });
        }

        // Generate PDF in background — don't block the API response
        const html = generateHTML(data);
        makePDF(report._id.toString(), html);

        res.json({ report });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /api/reports/:id/pdf
exports.pdf = async (req, res) => {
    try {
        const report = await Report.findById(req.params.id).lean();
        if (!report) return res.status(404).json({ error: 'Report not found' });

        const filepath = path.join(PDF_DIR, `${req.params.id}.pdf`);
        const filename = `${report.title || 'report'}.pdf`.replace(/[^a-z0-9.\- ]/gi, '_');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Serve pre-generated file if ready
        if (fs.existsSync(filepath)) {
            return res.sendFile(filepath);
        }

        // Fallback: generate on-the-fly (first download after cron auto-generate)
        let browser;
        try {
            const html = generateHTML(report.data);
            browser = await puppeteer.launch({
                executablePath: '/usr/bin/chromium-browser',
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
                headless: true,
            });
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
            const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
            // Save for future downloads
            fs.writeFileSync(filepath, pdfBuffer);
            res.send(pdfBuffer);
        } finally {
            if (browser) await browser.close().catch(() => {});
        }
    } catch (e) {
        console.error('[Report PDF]', e.message);
        res.status(500).json({ error: 'PDF generation failed: ' + e.message });
    }
};

// GET /api/reports/:id/view
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
        // Delete cached PDF file
        const f = path.join(PDF_DIR, `${req.params.id}.pdf`);
        if (fs.existsSync(f)) fs.unlinkSync(f);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// PUT /api/reports/schedule
exports.setSchedule = async (req, res) => {
    try {
        const userId   = req.user._id;
        const schedule = req.body.schedule;
        if (!['none', 'weekly', 'monthly'].includes(schedule)) return res.status(400).json({ error: 'Invalid schedule' });
        await User.findByIdAndUpdate(userId, { reportSchedule: schedule });
        res.json({ schedule });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// Called by cron
exports.autoGenerate = async (type) => {
    try {
        const users = await User.find({ reportSchedule: type }).lean();
        for (const u of users) {
            try {
                const data   = await buildReportData(u._id, type);
                const report = await Report.create({ userId: u._id, type, title: data.title, periodStart: data.periodStart, periodEnd: data.periodEnd, data });
                // Trim to MAX_REPORTS
                const all = await Report.find({ userId: u._id, type }).sort('-createdAt').lean();
                if (all.length > MAX_REPORTS) {
                    const toDelete = all.slice(MAX_REPORTS).map(r => r._id);
                    toDelete.forEach(id => {
                        const f = path.join(PDF_DIR, `${id}.pdf`);
                        if (fs.existsSync(f)) fs.unlinkSync(f);
                    });
                    await Report.deleteMany({ _id: { $in: toDelete } });
                }
                // Pre-generate PDF in background
                const html = generateHTML(data);
                makePDF(report._id.toString(), html);
                console.log(`[Report] Auto-generated ${type} report for user ${u.email}`);
            } catch (err) {
                console.error(`[Report] Failed for user ${u._id}:`, err.message);
            }
        }
    } catch (e) {
        console.error('[Report] autoGenerate error:', e.message);
    }
};
