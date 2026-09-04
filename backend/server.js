const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Use default system DNS configuration if custom DNS servers cannot be set
}

const path = require('path');
const fs = require('fs');

try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
  } else {
    require('dotenv').config();
  }
} catch {
  // Environment variables are injected directly into process.env on platforms like Render
}
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const outingRoutes = require('./routes/outingRoutes');
const locationRoutes = require('./routes/locationRoutes');
const alertRoutes = require('./routes/alertRoutes');
const { checkOverdueAndLostOutings } = require('./jobs/outingWatcher');

// Ensure JWT_SECRET fallback if not present in environment
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'default_hostel_outing_jwt_secret_key_2026';
}

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/outings', outingRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/alerts', alertRoutes);

const PORT = process.env.PORT || 5000;
const CHECK_INTERVAL_MS = 60 * 1000; // check for overdue/lost outings every minute

const frontendDist = path.join(__dirname, '../frontend/dist');
const localPublic = path.join(__dirname, 'public');

const staticPath = fs.existsSync(frontendDist) && fs.readdirSync(frontendDist).length > 0
  ? frontendDist
  : localPublic;

// Serve built frontend assets statically
if (fs.existsSync(staticPath)) {
  app.use(express.static(staticPath));
}

// Mount fallback to index.html for client-side routing, while keeping /api 404s clean
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ message: 'API endpoint not found' });
  }

  const indexPath = path.join(staticPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }

  res.status(404).send('Frontend build not found. Run "npm run build" in the frontend directory.');
});

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!mongoUri) {
  console.warn('WARNING: Neither MONGODB_URI nor MONGO_URI is defined in environment variables.');
}

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log('MongoDB connected successfully');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

    // Start background safety watcher job once DB connection is live
    setInterval(checkOverdueAndLostOutings, CHECK_INTERVAL_MS);
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    // Still start Express server so health check / static assets load cleanly
    app.listen(PORT, () => console.log(`Server running on port ${PORT} (Database disconnected)`));
  });