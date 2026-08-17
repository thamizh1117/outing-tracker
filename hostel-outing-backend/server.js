const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const outingRoutes = require('./routes/outingRoutes');
const locationRoutes = require('./routes/locationRoutes');
const alertRoutes = require('./routes/alertRoutes');
const { checkOverdueAndLostOutings } = require('./jobs/outingWatcher');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/outings', outingRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/alerts', alertRoutes);

const PORT = process.env.PORT || 5000;
const CHECK_INTERVAL_MS = 60 * 1000; // check for overdue/lost outings every minute
const staticPath = path.join(__dirname, 'public');

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');

    // Serve built frontend from backend/public
    app.use(express.static(staticPath));

    // Mount fallback to index.html for client-side routing, but keep /api routes functional
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ message: 'Not found' });
      }
      res.sendFile(path.join(staticPath, 'index.html'));
    });

    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

    // Start the safety-check job once the DB connection is live
    setInterval(checkOverdueAndLostOutings, CHECK_INTERVAL_MS);
  })
  .catch((err) => console.error('MongoDB connection error:', err));