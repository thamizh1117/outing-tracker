const mongoose = require('mongoose');

const outingRequestSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    destination: { type: String, required: true },
    purpose: { type: String, required: true },

    expectedDepartureTime: { type: Date, required: true },
    expectedReturnTime: { type: Date, required: true },
    actualDepartureTime: { type: Date },
    actualReturnTime: { type: Date },

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'ongoing', 'completed', 'overdue'],
      default: 'pending',
    },

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Warden' },
    rejectionReason: { type: String },

    // Set true once the late-return checker (Phase 8/9) has fired an alert for this outing
    lateAlertSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Fast lookups for "all pending requests" and "all currently ongoing outings" (used by dashboard + late-check job)
outingRequestSchema.index({ status: 1 });
outingRequestSchema.index({ student: 1, status: 1 });

module.exports = mongoose.model('OutingRequest', outingRequestSchema);
