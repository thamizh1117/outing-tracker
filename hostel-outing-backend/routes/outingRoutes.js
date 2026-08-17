const express = require('express');
const OutingRequest = require('../models/OutingRequest');
const Student = require('../models/Student');
const LiveLocation = require('../models/LiveLocation');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// POST /api/outings — student requests an outing
router.post('/', verifyToken, requireRole('student'), async (req, res) => {
  try {
    const {
      destination,
      purpose,
      expectedDepartureTime,
      expectedReturnTime,
    } = req.body;

    const outing = await OutingRequest.create({
      student: req.user.id,
      destination,
      purpose,
      expectedDepartureTime,
      expectedReturnTime,
    });

    await Student.findByIdAndUpdate(req.user.id, {
      currentStatus: 'pending_approval',
    });

    res.status(201).json(outing);
  } catch (err) {
    res.status(500).json({
      message: 'Could not create outing request',
      error: err.message,
    });
  }
});

// GET /api/outings/mine — student views their own outing history
router.get('/mine', verifyToken, requireRole('student'), async (req, res) => {
  try {
    const outings = await OutingRequest.find({
      student: req.user.id,
    })
      .populate(
        'student',
        'name rollNumber hostelBlock roomNumber phone'
      )
      .sort({ createdAt: -1 });

    res.json(outings);
  } catch (err) {
    res.status(500).json({
      message: 'Could not fetch your outings',
      error: err.message,
    });
  }
});

// GET /api/outings/pending — warden views all pending requests
router.get(
  '/pending',
  verifyToken,
  requireRole('warden', 'admin'),
  async (req, res) => {
    try {
      const pending = await OutingRequest.find({
        status: 'pending',
      })
        .populate(
          'student',
          'name rollNumber hostelBlock roomNumber phone'
        )
        .sort({ createdAt: 1 });

      res.json(pending);
    } catch (err) {
      res.status(500).json({
        message: 'Could not fetch pending requests',
        error: err.message,
      });
    }
  }
);

// PATCH /api/outings/:id/approve — warden approves
router.patch(
  '/:id/approve',
  verifyToken,
  requireRole('warden', 'admin'),
  async (req, res) => {
    try {
      const outing = await OutingRequest.findByIdAndUpdate(
        req.params.id,
        {
          status: 'approved',
          approvedBy: req.user.id,
        },
        { new: true }
      );

      if (!outing) {
        return res.status(404).json({
          message: 'Outing request not found',
        });
      }

      res.json(outing);
    } catch (err) {
      res.status(500).json({
        message: 'Approval failed',
        error: err.message,
      });
    }
  }
);

// PATCH /api/outings/:id/reject — warden rejects
router.patch(
  '/:id/reject',
  verifyToken,
  requireRole('warden', 'admin'),
  async (req, res) => {
    try {
      const { reason } = req.body;

      const outing = await OutingRequest.findByIdAndUpdate(
        req.params.id,
        {
          status: 'rejected',
          approvedBy: req.user.id,
          rejectionReason: reason,
        },
        { new: true }
      );

      if (!outing) {
        return res.status(404).json({
          message: 'Outing request not found',
        });
      }

      await Student.findByIdAndUpdate(outing.student, {
        currentStatus: 'in_hostel',
      });

      res.json(outing);
    } catch (err) {
      res.status(500).json({
        message: 'Rejection failed',
        error: err.message,
      });
    }
  }
);

// PATCH /api/outings/:id/depart — student checks out
router.patch(
  '/:id/depart',
  verifyToken,
  requireRole('student'),
  async (req, res) => {
    try {
      const { latitude, longitude } = req.body;

      const outing = await OutingRequest.findOneAndUpdate(
        {
          _id: req.params.id,
          student: req.user.id,
          status: 'approved',
        },
        {
          status: 'ongoing',
          actualDepartureTime: new Date(),
        },
        { new: true }
      );

      if (!outing) {
        return res.status(404).json({
          message: 'Approved outing not found',
        });
      }

      await LiveLocation.findOneAndUpdate(
        { outingRequest: outing._id },
        {
          student: req.user.id,
          outingRequest: outing._id,
          latitude,
          longitude,
          isSharing: true,
          lastUpdated: new Date(),
        },
        { upsert: true }
      );

      await Student.findByIdAndUpdate(req.user.id, {
        currentStatus: 'out',
      });

      res.json(outing);
    } catch (err) {
      res.status(500).json({
        message: 'Departure check-in failed',
        error: err.message,
      });
    }
  }
);

// PATCH /api/outings/:id/return — student checks back in
router.patch(
  '/:id/return',
  verifyToken,
  requireRole('student'),
  async (req, res) => {
    try {
      const outing = await OutingRequest.findOneAndUpdate(
        {
          _id: req.params.id,
          student: req.user.id,
          status: { $in: ['ongoing', 'overdue'] },
        },
        {
          status: 'completed',
          actualReturnTime: new Date(),
        },
        { new: true }
      );

      if (!outing) {
        return res.status(404).json({
          message: 'Ongoing outing not found',
        });
      }

      await LiveLocation.findOneAndUpdate(
        { outingRequest: outing._id },
        { isSharing: false }
      );

      await Student.findByIdAndUpdate(req.user.id, {
        currentStatus: 'in_hostel',
      });

      res.json(outing);
    } catch (err) {
      res.status(500).json({
        message: 'Return check-in failed',
        error: err.message,
      });
    }
  }
);

module.exports = router;