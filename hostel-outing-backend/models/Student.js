const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    rollNumber: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // stored as bcrypt hash
    phone: { type: String, required: true },
    hostelBlock: { type: String, required: true },
    roomNumber: { type: String, required: true },

    // Used by the alert system if a student doesn't return / stops sharing location
    emergencyContact: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      relation: { type: String },
    },

    currentStatus: {
      type: String,
      enum: ['in_hostel', 'out', 'pending_approval'],
      default: 'in_hostel',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Student', studentSchema);
