const mongoose = require('mongoose');

const emergencyAlertSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    outingRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'OutingRequest', required: true },

    type: {
      type: String,
      enum: ['sos', 'late_return', 'location_lost'],
      required: true,
    },

    location: {
      latitude: Number,
      longitude: Number,
    },

    status: {
      type: String,
      enum: ['open', 'acknowledged', 'resolved'],
      default: 'open',
    },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Warden' },
    notes: { type: String },
  },
  { timestamps: true }
);

emergencyAlertSchema.index({ status: 1 });

module.exports = mongoose.model('EmergencyAlert', emergencyAlertSchema);
