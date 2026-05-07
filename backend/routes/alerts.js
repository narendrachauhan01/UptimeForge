const router = require('express').Router();
const Alert = require('../models/Alert');

router.get('/', async (req, res) => {
    try {
        const alerts = await Alert.find().sort('-createdAt').limit(100);
        res.json(alerts);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
