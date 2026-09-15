const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    // Snapshots, so an order still reads correctly after a product is edited
    // or removed from the catalog.
    name: { type: String, required: true },
    imageUrl: { type: String },
    size: { type: String },
    flavour: { type: String },
    icingMessage: { type: String, maxlength: 120 },
    notes: { type: String, maxlength: 500 },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, max: 50 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true, index: true },

    customer: {
      name: { type: String, required: [true, 'Enter your name.'], trim: true },
      phone: { type: String, required: [true, 'Enter a phone number.'], trim: true },
      email: {
        type: String,
        required: [true, 'Enter an email address.'],
        trim: true,
        lowercase: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address.'],
      },
    },

    fulfilment: {
      method: { type: String, enum: ['pickup', 'delivery'], required: true },
      address: { type: String, trim: true },
      date: { type: Date, required: [true, 'Choose a date.'] },
      timeWindow: { type: String, required: [true, 'Choose a time.'] },
    },

    items: {
      type: [orderItemSchema],
      validate: [(v) => v.length > 0, 'An order needs at least one item.'],
    },

    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },

    paymentMethod: {
      type: String,
      enum: ['mobile-money', 'on-collection'],
      default: 'on-collection',
    },

    status: {
      type: String,
      enum: ['pending', 'confirmed', 'baking', 'ready', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
