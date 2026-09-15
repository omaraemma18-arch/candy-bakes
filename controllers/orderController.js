const Order = require('../models/Order');
const Product = require('../models/Product');

const DELIVERY_FEE = 15000;
const FREE_DELIVERY_OVER = 300000;

function makeReference() {
  return 'SH-' + Date.now().toString(36).toUpperCase().slice(-6);
}

function fieldErrors(err) {
  const out = {};
  for (const key in err.errors) out[key] = err.errors[key].message;
  return out;
}

// POST /api/orders — public
async function createOrder(req, res) {
  try {
    const { customer, fulfilment, items, paymentMethod } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Your basket is empty.' });
    }
    if (items.length > 20) {
      return res.status(400).json({ error: 'That is more items than we can take in one order.' });
    }

    // Never trust prices sent by the browser. Re-read every product from the
    // database and recalculate the total here.
    const priced = [];
    let subtotal = 0;
    let maxLeadDays = 0;

    for (const line of items) {
      const product = await Product.findById(line.productId);
      if (!product || !product.available) {
        return res.status(400).json({
          error: `"${product ? product.name : 'One of your items'}" is no longer available.`,
        });
      }

      const quantity = Math.max(1, Math.min(50, Number(line.quantity) || 1));

      let unitPrice = product.basePrice;
      let sizeLabel = null;
      if (line.size) {
        const size = product.sizes.find((s) => s.label === line.size);
        if (!size) {
          return res.status(400).json({ error: `That size is not offered for ${product.name}.` });
        }
        unitPrice += size.priceModifier;
        sizeLabel = size.label;
      }

      if (line.flavour && product.flavours.length && !product.flavours.includes(line.flavour)) {
        return res.status(400).json({ error: `That flavour is not offered for ${product.name}.` });
      }

      priced.push({
        product: product._id,
        name: product.name,
        imageUrl: product.imageUrl,
        size: sizeLabel,
        flavour: line.flavour || null,
        icingMessage: (line.icingMessage || '').slice(0, 120),
        notes: (line.notes || '').slice(0, 500),
        unitPrice,
        quantity,
      });

      subtotal += unitPrice * quantity;
      maxLeadDays = Math.max(maxLeadDays, product.leadTimeDays || 0);
    }

    // Check the requested date gives the kitchen enough notice.
    const requested = new Date(fulfilment?.date);
    if (isNaN(requested.getTime())) {
      return res.status(400).json({ error: 'Choose a valid date.' });
    }
    const earliest = new Date();
    earliest.setHours(0, 0, 0, 0);
    earliest.setDate(earliest.getDate() + maxLeadDays);

    if (requested < earliest) {
      return res.status(400).json({
        error: `We need ${maxLeadDays} days' notice for this order. The soonest date is ${earliest.toISOString().slice(0, 10)}.`,
      });
    }

    const method = fulfilment?.method === 'delivery' ? 'delivery' : 'pickup';
    if (method === 'delivery' && (!fulfilment.address || fulfilment.address.trim().length < 8)) {
      return res.status(400).json({ error: 'Add the delivery address.' });
    }

    const deliveryFee =
      method === 'delivery' && subtotal < FREE_DELIVERY_OVER ? DELIVERY_FEE : 0;

    const order = await Order.create({
      reference: makeReference(),
      customer: {
        name: customer?.name,
        phone: customer?.phone,
        email: customer?.email,
      },
      fulfilment: {
        method,
        address: method === 'delivery' ? fulfilment.address.trim() : undefined,
        date: requested,
        timeWindow: fulfilment?.timeWindow,
      },
      items: priced,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      paymentMethod: paymentMethod === 'mobile-money' ? 'mobile-money' : 'on-collection',
    });

    console.log(`New order ${order.reference} — ${order.items.length} item(s), total ${order.total}`);

    res.status(201).json({ order });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: 'Please check the highlighted fields.', fieldErrors: fieldErrors(err) });
    }
    console.error('createOrder:', err);
    res.status(500).json({ error: 'Could not place that order. Please try again.' });
  }
}

// GET /api/orders/:reference — public lookup of a single order
async function getOrderByReference(req, res) {
  try {
    const order = await Order.findOne({ reference: req.params.reference.toUpperCase() });
    if (!order) return res.status(404).json({ error: 'No order found with that reference.' });
    res.json({ order });
  } catch (err) {
    console.error('getOrderByReference:', err);
    res.status(500).json({ error: 'Could not look up that order.' });
  }
}

/* ---------------- Admin ---------------- */

// GET /api/admin/orders
async function listOrders(req, res) {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;

    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(300);
    res.json({ orders });
  } catch (err) {
    console.error('listOrders:', err);
    res.status(500).json({ error: 'Could not load orders.' });
  }
}

// PATCH /api/admin/orders/:id/status
async function updateOrderStatus(req, res) {
  try {
    const allowed = ['pending', 'confirmed', 'baking', 'ready', 'completed', 'cancelled'];
    if (!allowed.includes(req.body.status)) {
      return res.status(400).json({ error: 'That is not a valid status.' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!order) return res.status(404).json({ error: 'That order no longer exists.' });

    res.json({ order });
  } catch (err) {
    console.error('updateOrderStatus:', err);
    res.status(500).json({ error: 'Could not update that order.' });
  }
}

// GET /api/admin/stats — dashboard summary
async function getStats(req, res) {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalProducts, availableProducts, pendingOrders, ordersToday, upcoming] =
      await Promise.all([
        Product.countDocuments(),
        Product.countDocuments({ available: true }),
        Order.countDocuments({ status: 'pending' }),
        Order.countDocuments({ createdAt: { $gte: startOfToday } }),
        Order.find({
          'fulfilment.date': { $gte: startOfToday },
          status: { $nin: ['completed', 'cancelled'] },
        })
          .sort({ 'fulfilment.date': 1 })
          .limit(5),
      ]);

    res.json({
      totalProducts,
      availableProducts,
      pendingOrders,
      ordersToday,
      upcoming,
    });
  } catch (err) {
    console.error('getStats:', err);
    res.status(500).json({ error: 'Could not load the dashboard figures.' });
  }
}

module.exports = {
  createOrder, getOrderByReference,
  listOrders, updateOrderStatus, getStats,
  DELIVERY_FEE, FREE_DELIVERY_OVER,
};
