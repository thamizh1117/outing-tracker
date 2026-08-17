const express = require('express');
const LiveLocation = require('../models/LiveLocation');
const OutingRequest = require('../models/OutingRequest');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

const MAX_TRAIL_POINTS = 50;

// PATCH /api/location/:outingId — mobile app sends a GPS ping (call this every N seconds while out)
router.patch('/:outingId', verifyToken, requireRole('student'), async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    const loc = await LiveLocation.findOne({ outingRequest: req.params.outingId, student: req.user.id });
    if (!loc) return res.status(404).json({ message: 'No active tracking session for this outing' });

    loc.latitude = latitude;
    loc.longitude = longitude;
    loc.lastUpdated = new Date();
    loc.isSharing = true;
    loc.trail.push({ latitude, longitude });
    if (loc.trail.length > MAX_TRAIL_POINTS) loc.trail = loc.trail.slice(-MAX_TRAIL_POINTS);

    await loc.save();
    res.json({ message: 'Location updated' });
  } catch (err) {
    res.status(500).json({ message: 'Location update failed', error: err.message });
  }
});

// GET /api/location/live — warden dashboard: all students currently out, with live coordinates
router.get('/live', verifyToken, requireRole('warden', 'admin'), async (req, res) => {
  try {
    const liveLocations = await LiveLocation.find({ isSharing: true })
      .populate('student', 'name rollNumber hostelBlock')
      .populate('outingRequest', 'destination expectedReturnTime status');
    res.json(liveLocations);
  } catch (err) {
    res.status(500).json({ message: 'Could not fetch live locations', error: err.message });
  }
});

module.exports = router;
