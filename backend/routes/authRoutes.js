const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Warden = require('../models/Warden');

const router = express.Router();

function signToken(id, role) {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// POST /api/auth/student/signup
router.post('/student/signup', async (req, res) => {
  try {
    const { name, rollNumber, email, password, phone, hostelBlock, roomNumber, emergencyContact } = req.body;

    const existing = await Student.findOne({ $or: [{ email }, { rollNumber }] });
    if (existing) return res.status(400).json({ message: 'Student already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const student = await Student.create({
      name, rollNumber, email, phone, hostelBlock, roomNumber, emergencyContact,
      password: hashedPassword,
    });

    const token = signToken(student._id, 'student');
    res.status(201).json({ token, student: { id: student._id, name: student.name, email: student.email } });
  } catch (err) {
    res.status(500).json({ message: 'Signup failed', error: err.message });
  }
});

// POST /api/auth/student/login
router.post('/student/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const student = await Student.findOne({ email });
    if (!student) return res.status(400).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, student.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    const token = signToken(student._id, 'student');
    res.json({ token, student: { id: student._id, name: student.name, email: student.email } });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// POST /api/auth/warden/signup
router.post('/warden/signup', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      hostelBlock,
      role
    } = req.body;

    const existing = await Warden.findOne({ email });

    if (existing) {
      return res.status(400).json({
        message: 'Warden already registered'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const warden = await Warden.create({
      name,
      email,
      password: hashedPassword,
      phone,
      hostelBlock,
      role: role || 'warden'
    });

    const token = signToken(warden._id, warden.role);

    res.status(201).json({
      token,
      warden: {
        id: warden._id,
        name: warden.name,
        email: warden.email,
        role: warden.role
      }
    });

  } catch (err) {
    res.status(500).json({
      message: 'Warden signup failed',
      error: err.message
    });
  }
});

// POST /api/auth/warden/login
router.post('/warden/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const warden = await Warden.findOne({ email });
    if (!warden) return res.status(400).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, warden.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    const token = signToken(warden._id, warden.role); // role: 'warden' or 'admin'
    res.json({ token, warden: { id: warden._id, name: warden.name, role: warden.role } });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

module.exports = router;
