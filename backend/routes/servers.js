const router = require('express').Router();
const Server = require('../models/Server');
const { checkAll } = require('../services/monitor');

router.get('/', async (req, res) => {
    try {
        const servers = await Server.find().sort('-createdAt');
        res.json(servers);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
    try {
        const server = await Server.create(req.body);
        res.json(server);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
    try {
        const server = await Server.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
        res.json(server);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
    try {
        await Server.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/check-now', async (req, res) => {
    try {
        await checkAll();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id/history', async (req, res) => {
    try {
        const server = await Server.findById(req.params.id).select('name history');
        res.json(server);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
