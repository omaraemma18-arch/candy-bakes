const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signToken, setAuthCookie, clearAuthCookie } = require('../middleware/auth');

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Enter your email and password.' });
    }

    // passwordHash is select:false on the schema, so ask for it explicitly.
    const user = await User.findOne({ email: String(email).toLowerCase().trim() })
      .select('+passwordHash');

    // Same message either way — don't reveal which accounts exist.
    if (!user) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    setAuthCookie(res, signToken(user));
    res.json({ user: user.toSafeObject() });
  } catch (err) {
    console.error('login:', err);
    res.status(500).json({ error: 'Something went wrong logging in. Please try again.' });
  }
}

// POST /api/auth/logout
function logout(req, res) {
  clearAuthCookie(res);
  res.json({ ok: true });
}

// GET /api/auth/me — used by the admin pages to check the session on load
function me(req, res) {
  res.json({ user: req.user.toSafeObject() });
}

// POST /api/auth/change-password
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Enter your current and new password.' });
    }
    if (newPassword.length < 10) {
      return res.status(400).json({ error: 'Use at least 10 characters for the new password.' });
    }

    const user = await User.findById(req.user._id).select('+passwordHash');
    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      return res.status(401).json({ error: 'Your current password is not correct.' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.json({ ok: true });
  } catch (err) {
    console.error('changePassword:', err);
    res.status(500).json({ error: 'Could not change the password. Please try again.' });
  }
}

// POST /api/auth/users — admin only, add another staff/admin login
async function createUser(req, res) {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are all required.' });
    }
    if (password.length < 10) {
      return res.status(400).json({ error: 'Use at least 10 characters for the password.' });
    }
    if (role && !['admin', 'staff'].includes(role)) {
      return res.status(400).json({ error: 'Role must be admin or staff.' });
    }

    const normalised = String(email).toLowerCase().trim();
    if (await User.exists({ email: normalised })) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    const user = await User.create({
      name,
      email: normalised,
      passwordHash: await bcrypt.hash(password, 12),
      role: role || 'staff',
    });

    res.status(201).json({ user: user.toSafeObject() });
  } catch (err) {
    console.error('createUser:', err);
    res.status(500).json({ error: 'Could not create that account. Please try again.' });
  }
}

// GET /api/auth/users — admin only
async function listUsers(req, res) {
  try {
    const users = await User.find().sort({ createdAt: 1 });
    res.json({ users: users.map((u) => u.toSafeObject()) });
  } catch (err) {
    console.error('listUsers:', err);
    res.status(500).json({ error: 'Could not load accounts.' });
  }
}

module.exports = { login, logout, me, changePassword, createUser, listUsers };
