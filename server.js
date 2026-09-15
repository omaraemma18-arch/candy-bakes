require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Hosts like Render sit behind a proxy — needed for secure cookies and
// for rate limiting to see the real client IP.
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        // Product photos are served from Cloudinary.
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.originalUrl}`);
    next();
  });
}

// ---- API ----
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, uptime: Math.round(process.uptime()) });
});

// ---- Static frontend ----
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// ---- Pages ----
const page = (file) => (req, res) => res.sendFile(path.join(__dirname, 'public', file));

app.get('/', page('index.html'));
app.get('/menu', page('menu.html'));
app.get('/product', page('product.html'));
app.get('/cart', page('cart.html'));
app.get('/checkout', page('checkout.html'));
app.get('/confirmation', page('confirmation.html'));

app.get('/admin', page('admin/login.html'));
app.get('/admin/dashboard', page('admin/dashboard.html'));
app.get('/admin/products', page('admin/products.html'));
app.get('/admin/orders', page('admin/orders.html'));

// ---- Fallbacks ----
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'That API endpoint does not exist.' });
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Last-resort handler — never leak a stack trace to the browser.
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Could not start — database connection failed:');
    console.error(err.message);
    process.exit(1);
  });
