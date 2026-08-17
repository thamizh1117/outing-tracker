const mongoose = require('mongoose');

const wardenSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // bcrypt hash
    phone: { type: String, required: true },
    hostelBlock: { type: String, required: true }, // which block this warden manages
    role: { type: String, enum: ['warden', 'admin'], default: 'warden' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Warden', wardenSchema);
