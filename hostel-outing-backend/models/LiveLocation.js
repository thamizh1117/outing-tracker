const mongoose = require('mongoose');

// One document per active outing. Updated in place (not appended) so lookups for
// "where is this student right now" stay O(1) instead of scanning a growing history.
const liveLocationSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    outingRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'OutingRequest', required: true, unique: true },

    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    lastUpdated: { type: Date, default: Date.now },

    // Set false if the app stops sending pings for too long — this is one of the
    // triggers for an emergency alert (student "stopped sharing location unexpectedly")
    isSharing: { type: Boolean, default: true },

    // Short rolling trail for drawing a path on the dashboard map (last ~50 points, not full history)
    trail: [
      {
        latitude: Number,
        longitude: Number,
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('LiveLocation', liveLocationSchema);
