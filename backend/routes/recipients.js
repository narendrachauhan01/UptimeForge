const router = require('express').Router();
const Recipient = require('../models/Recipient');

router.get('/', async (req, res) => {
    try {
        const recipients = await Recipient.find().sort('-createdAt').populate('servers', 'name status');
        res.json(recipients);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
    try {
        const r = await Recipient.create(req.body);
        res.json(r);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
    try {
        const r = await Recipient.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
        res.json(r);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
    try {
        await Recipient.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
