const jwt = require('jsonwebtoken');

// Verifies the JWT and attaches { id, role } to req.user
function verifyToken(req, res, next) {
  const authHeader = req.headers && req.headers.authorization;
  const tokenFromHeader = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  // Allow token via query string for websocket or special clients (e.g., ?token=...)
  const token = tokenFromHeader || (req.query && req.query.token);

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Restricts a route to specific roles, e.g. requireRole('warden', 'admin')
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized for this action' });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
