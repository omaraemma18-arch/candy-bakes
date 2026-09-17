const Product = require('../models/Product');
const { uploadBuffer, deleteImage, isConfigured } = require('../config/cloudinary');

// Turns a Mongoose validation error into { field: message }.
function fieldErrors(err) {
  const out = {};
  for (const key in err.errors) out[key] = err.errors[key].message;
  return out;
}

// Sizes and flavours arrive as JSON strings from the multipart admin form.
function parseJsonField(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

/* ---------------- Public ---------------- */

// GET /api/products — only what's actually for sale
async function listPublicProducts(req, res) {
  try {
    const { category, search, featured } = req.query;
    const filter = { available: true };

    if (category && category !== 'all') filter.category = category;
    if (featured === 'true') filter.featured = true;
    if (search) {
      const re = new RegExp(String(search).trim().slice(0, 60), 'i');
      filter.$or = [{ name: re }, { description: re }];
    }

    const products = await Product.find(filter).sort({ featured: -1, createdAt: -1 });
    res.json({ products });
  } catch (err) {
    console.error('listPublicProducts:', err);
    res.status(500).json({ error: 'Could not load the cakes. Please refresh.' });
  }
}

// GET /api/products/:slug
async function getPublicProduct(req, res) {
  try {
    const product = await Product.findOne({ slug: req.params.slug, available: true });
    if (!product) return res.status(404).json({ error: 'That cake is not on the menu.' });
    res.json({ product });
  } catch (err) {
    console.error('getPublicProduct:', err);
    res.status(500).json({ error: 'Could not load that cake.' });
  }
}

/* ---------------- Admin ---------------- */

// GET /api/admin/products — includes unavailable ones
async function listAllProducts(req, res) {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json({ products });
  } catch (err) {
    console.error('listAllProducts:', err);
    res.status(500).json({ error: 'Could not load products.' });
  }
}

// POST /api/admin/products  (multipart/form-data, field name: "images")
async function createProduct(req, res) {
  let uploaded = [];

  try {
    if (!req.files?.length) {
      return res.status(400).json({ error: 'Add at least one photo of the cake.' });
    }
    if (!isConfigured()) {
      return res.status(503).json({
        error: 'Image uploads are not set up yet. Add your Cloudinary keys to the environment variables.',
      });
    }

    uploaded = await Promise.all(req.files.map((file) => uploadBuffer(file.buffer)));

    const product = await Product.create({
      name: req.body.name,
      description: req.body.description,
      category: req.body.category || 'other',
      basePrice: Number(req.body.basePrice),
      sizes: parseJsonField(req.body.sizes, []),
      flavours: parseJsonField(req.body.flavours, []),
      leadTimeDays: req.body.leadTimeDays ? Number(req.body.leadTimeDays) : 3,
      available: req.body.available !== 'false',
      featured: req.body.featured === 'true',
      imageUrl: uploaded[0].secure_url,
      imagePublicId: uploaded[0].public_id,
      images: uploaded.map((image) => ({ url: image.secure_url, publicId: image.public_id })),
    });

    res.status(201).json({ product });
  } catch (err) {
    // If saving failed after the image went up, don't leave it orphaned.
    await Promise.all(uploaded.map((image) => deleteImage(image.public_id)));

    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: 'Please check the highlighted fields.', fieldErrors: fieldErrors(err) });
    }
    console.error('createProduct:', err);
    res.status(500).json({ error: 'Could not save that cake. Please try again.' });
  }
}

// PUT /api/admin/products/:id — image is optional on update
async function updateProduct(req, res) {
  let uploaded = [];

  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'That cake no longer exists.' });

    const existingImages = product.images?.length
      ? product.images.map((image) => ({ url: image.url, publicId: image.publicId }))
      : [{ url: product.imageUrl, publicId: product.imagePublicId }];

    if (req.files?.length) {
      if (!isConfigured()) {
        return res.status(503).json({ error: 'Image uploads are not set up yet.' });
      }
      uploaded = await Promise.all(req.files.map((file) => uploadBuffer(file.buffer)));
      const newImages = uploaded.map((image) => ({ url: image.secure_url, publicId: image.public_id }));
      product.images = [...existingImages, ...newImages];
      product.imageUrl = product.images[0].url;
      product.imagePublicId = product.images[0].publicId;
    } else if (!product.images?.length) {
      product.images = existingImages;
    }

    if (req.body.name !== undefined) product.name = req.body.name;
    if (req.body.description !== undefined) product.description = req.body.description;
    if (req.body.category !== undefined) product.category = req.body.category;
    if (req.body.basePrice !== undefined) product.basePrice = Number(req.body.basePrice);
    if (req.body.sizes !== undefined) product.sizes = parseJsonField(req.body.sizes, product.sizes);
    if (req.body.flavours !== undefined) product.flavours = parseJsonField(req.body.flavours, product.flavours);
    if (req.body.leadTimeDays !== undefined) product.leadTimeDays = Number(req.body.leadTimeDays);
    if (req.body.available !== undefined) product.available = req.body.available === 'true' || req.body.available === true;
    if (req.body.featured !== undefined) product.featured = req.body.featured === 'true' || req.body.featured === true;

    await product.save();

    // Only bin the old image once the new record is safely saved.
    res.json({ product });
  } catch (err) {
    await Promise.all(uploaded.map((image) => deleteImage(image.public_id)));

    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: 'Please check the highlighted fields.', fieldErrors: fieldErrors(err) });
    }
    console.error('updateProduct:', err);
    res.status(500).json({ error: 'Could not update that cake. Please try again.' });
  }
}

// PATCH /api/admin/products/:id/availability — the quick toggle in the dashboard
async function toggleAvailability(req, res) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'That cake no longer exists.' });

    product.available = !product.available;
    await product.save();

    res.json({ product });
  } catch (err) {
    console.error('toggleAvailability:', err);
    res.status(500).json({ error: 'Could not update that cake.' });
  }
}

// DELETE /api/admin/products/:id
async function deleteProduct(req, res) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'That cake no longer exists.' });

    await product.deleteOne();
    const imageIds = product.images?.length
      ? product.images.map((image) => image.publicId)
      : [product.imagePublicId];
    await Promise.all(imageIds.map((publicId) => deleteImage(publicId)));

    res.json({ ok: true });
  } catch (err) {
    console.error('deleteProduct:', err);
    res.status(500).json({ error: 'Could not delete that cake. Please try again.' });
  }
}

module.exports = {
  listPublicProducts, getPublicProduct,
  listAllProducts, createProduct, updateProduct, toggleAvailability, deleteProduct,
};
