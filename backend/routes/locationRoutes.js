const express = require('express');
const LiveLocation = require('../models/LiveLocation');
const OutingRequest = require('../models/OutingRequest');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

const MAX_TRAIL_POINTS = 50;

// PATCH /api/location/:outingId — mobile app/web app sends a GPS ping
router.patch('/:outingId', verifyToken, requireRole('student'), async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ message: 'Valid latitude and longitude numerical coordinates required' });
    }

    let loc = await LiveLocation.findOne({ outingRequest: req.params.outingId, student: req.user.id });
    if (!loc) {
      loc = new LiveLocation({
        student: req.user.id,
        outingRequest: req.params.outingId,
        latitude,
        longitude,
        isSharing: true,
        lastUpdated: new Date(),
        trail: [],
      });
    } else {
      loc.latitude = latitude;
      loc.longitude = longitude;
      loc.lastUpdated = new Date();
      loc.isSharing = true;
    }

    loc.trail.push({ latitude, longitude, timestamp: new Date() });
    if (loc.trail.length > MAX_TRAIL_POINTS) loc.trail = loc.trail.slice(-MAX_TRAIL_POINTS);

    await loc.save();
    res.json({ message: 'Location updated', location: loc });
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
