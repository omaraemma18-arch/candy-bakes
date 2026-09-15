const jwt = require('jsonwebtoken');
const User = require('../models/User');

const COOKIE_NAME = 'cakeshop_token';

function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true, // not readable by JavaScript, so XSS can't steal it
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

// Reads the token from the httpOnly cookie, falling back to an
// Authorization header so the API is usable from tools like curl.
function readToken(req) {
  if (req.cookies && req.cookies[COOKIE_NAME]) return req.cookies[COOKIE_NAME];
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

async function requireAuth(req, res, next) {
  const token = readToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Please log in to continue.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Look the user up fresh rather than trusting the token's contents —
    // so a role change or deleted account takes effect immediately.
    const user = await User.findById(payload.id);
    if (!user) {
      clearAuthCookie(res);
      return res.status(401).json({ error: 'That account no longer exists.' });
    }

    req.user = user;
    next();
  } catch {
    clearAuthCookie(res);
    return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  }
}

// Role-based access control. Usage: requireRole('admin')
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You don't have permission to do that." });
    }
    next();
  };
}

module.exports = {
  signToken, setAuthCookie, clearAuthCookie,
  requireAuth, requireRole, COOKIE_NAME,
};
