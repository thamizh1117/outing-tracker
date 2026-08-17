const OutingRequest = require('../models/OutingRequest');
const LiveLocation = require('../models/LiveLocation');
const EmergencyAlert = require('../models/EmergencyAlert');

// How long a GPS signal can be silent before we treat it as "lost", not just a bad signal
const LOCATION_LOST_THRESHOLD_MINUTES = 15;

// Runs on an interval (see server.js) to catch two situations the student can't self-report:
// 1) they're overdue and haven't checked in
// 2) their app has stopped sending location pings
async function checkOverdueAndLostOutings() {
  const now = new Date();

  // --- 1. Late return check ---
  const overdue = await OutingRequest.find({
    status: 'ongoing',
    expectedReturnTime: { $lt: now },
    lateAlertSent: false,
  });

  for (const outing of overdue) {
    await EmergencyAlert.create({
      student: outing.student,
      outingRequest: outing._id,
      type: 'late_return',
      status: 'open',
    });
    outing.status = 'overdue';
    outing.lateAlertSent = true;
    await outing.save();
  }

  // --- 2. Lost signal check (student stopped sharing location unexpectedly) ---
  const cutoff = new Date(now.getTime() - LOCATION_LOST_THRESHOLD_MINUTES * 60 * 1000);
  const staleLocations = await LiveLocation.find({
    isSharing: true,
    lastUpdated: { $lt: cutoff },
  });

  for (const loc of staleLocations) {
    const existingOpenAlert = await EmergencyAlert.findOne({
      outingRequest: loc.outingRequest,
      type: 'location_lost',
      status: { $ne: 'resolved' },
    });
    if (existingOpenAlert) continue; // don't spam duplicate alerts every tick

    await EmergencyAlert.create({
      student: loc.student,
      outingRequest: loc.outingRequest,
      type: 'location_lost',
      location: { latitude: loc.latitude, longitude: loc.longitude }, // last known position
      status: 'open',
    });
    loc.isSharing = false;
    await loc.save();
  }

  if (overdue.length || staleLocations.length) {
    console.log(`[outingWatcher] ${overdue.length} overdue, ${staleLocations.length} lost-signal alert(s) raised`);
  }
}

module.exports = { checkOverdueAndLostOutings };
