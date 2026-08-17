const express = require('express');
const EmergencyAlert = require('../models/EmergencyAlert');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// POST /api/alerts/sos — student presses the SOS button in the app
router.post('/sos', verifyToken, requireRole('student'), async (req, res) => {
  try {
    const { outingRequestId, latitude, longitude } = req.body;

    const alert = await EmergencyAlert.create({
      student: req.user.id,
      outingRequest: outingRequestId,
      type: 'sos',
      location: { latitude, longitude },
      status: 'open',
    });

    // TODO (Phase 7): push a real-time notification to the warden dashboard here
    // (e.g. via Socket.io or a push notification service) so this shows up instantly,
    // not just on the next dashboard refresh.

    res.status(201).json(alert);
  } catch (err) {
    res.status(500).json({ message: 'Could not raise SOS alert', error: err.message });
  }
});

// GET /api/alerts/open — warden dashboard: all unresolved alerts
router.get('/open', verifyToken, requireRole('warden', 'admin'), async (req, res) => {
  try {
    const alerts = await EmergencyAlert.find({ status: { $ne: 'resolved' } })
      .populate('student', 'name rollNumber phone emergencyContact')
      .populate('outingRequest', 'destination expectedReturnTime')
      .sort({ createdAt: -1 });
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ message: 'Could not fetch alerts', error: err.message });
  }
});

// PATCH /api/alerts/:id/acknowledge — warden acknowledges they're handling it
router.patch('/:id/acknowledge', verifyToken, requireRole('warden', 'admin'), async (req, res) => {
  try {
    const alert = await EmergencyAlert.findByIdAndUpdate(
      req.params.id,
      { status: 'acknowledged', acknowledgedBy: req.user.id },
      { new: true }
    );
    res.json(alert);
  } catch (err) {
    res.status(500).json({ message: 'Could not acknowledge alert', error: err.message });
  }
});

// PATCH /api/alerts/:id/resolve — warden marks it resolved, with notes
router.patch('/:id/resolve', verifyToken, requireRole('warden', 'admin'), async (req, res) => {
  try {
    const { notes } = req.body;
    const alert = await EmergencyAlert.findByIdAndUpdate(
      req.params.id,
      { status: 'resolved', notes },
      { new: true }
    );
    res.json(alert);
  } catch (err) {
    res.status(500).json({ message: 'Could not resolve alert', error: err.message });
  }
});

module.exports = router;
