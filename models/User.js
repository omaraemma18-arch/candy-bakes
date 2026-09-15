const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address.'],
    },
    // Only ever stores a bcrypt hash — never the password itself.
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['admin', 'staff'],
      default: 'staff',
    },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
  };
};

module.exports = mongoose.model('User', userSchema);
