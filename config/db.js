const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not set. Copy .env.example to .env and fill it in.');
  }

  await mongoose.connect(uri);
  console.log('MongoDB connected');

  await seedAdmin();
}

// Creates the owner account the first time the app runs against an empty
// database, so there's always a way to log into /admin.
async function seedAdmin() {
  const User = require('../models/User');

  const existing = await User.findOne({ role: 'admin' });
  if (existing) return;

  const name = process.env.SEED_ADMIN_NAME || 'Bakery Owner';
  const email = (process.env.SEED_ADMIN_EMAIL || 'owner@example.com').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!password) {
    console.warn('No admin exists and SEED_ADMIN_PASSWORD is not set — skipping admin creation.');
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({ name, email, passwordHash, role: 'admin' });

  console.log('------------------------------------------------------');
  console.log('Created the first admin account:');
  console.log(`  email:    ${email}`);
  console.log('  password: (the SEED_ADMIN_PASSWORD from your .env)');
  console.log('Log in at /admin and change this password.');
  console.log('------------------------------------------------------');
}

module.exports = connectDB;
