const mongoose = require('mongoose');

const sizeSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true }, // "8 inch — serves 16–20"
    priceModifier: { type: Number, default: 0 }, // added to basePrice
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Give the cake a name.'],
      trim: true,
      maxlength: [120, 'Keep the name under 120 characters.'],
    },
    slug: { type: String, unique: true, index: true },
    description: {
      type: String,
      required: [true, 'Add a short description.'],
      trim: true,
      maxlength: [1200, 'Keep the description under 1200 characters.'],
    },
    category: {
      type: String,
      enum: ['birthday', 'wedding', 'cupcakes', 'other'],
      default: 'other',
      index: true,
    },
    basePrice: {
      type: Number,
      required: [true, 'Set a price.'],
      min: [0, 'Price cannot be negative.'],
    },
    sizes: { type: [sizeSchema], default: [] },
    flavours: { type: [String], default: [] },

    imageUrl: { type: String, required: [true, 'A photo is required.'] },
    imagePublicId: { type: String }, // Cloudinary id, so we can delete it later

    available: { type: Boolean, default: true, index: true },
    leadTimeDays: { type: Number, default: 3, min: 0 },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Build a URL-safe slug from the name, keeping it unique.
productSchema.pre('validate', async function slugify(next) {
  if (!this.isModified('name') && this.slug) return next();

  const base = this.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60) || 'cake';

  let candidate = base;
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await this.constructor.exists({ slug: candidate, _id: { $ne: this._id } })) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  this.slug = candidate;
  next();
});

module.exports = mongoose.model('Product', productSchema);
