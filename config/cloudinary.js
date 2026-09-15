const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

let configured = false;

function configure() {
  if (configured) return;
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error(
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.'
    );
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
}

function isConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

// Streams a file buffer (from multer's memory storage) straight to Cloudinary
// without ever writing it to disk.
function uploadBuffer(buffer, folder = 'cakeshop/products') {
  configure();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        // Cap the stored size so a 12MP phone photo doesn't become the
        // thing that slows the catalog down.
        transformation: [{ width: 1600, height: 1600, crop: 'limit', quality: 'auto:good' }],
      },
      (error, result) => (error ? reject(error) : resolve(result))
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });
}

async function deleteImage(publicId) {
  if (!publicId) return;
  configure();
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    // A failed cleanup shouldn't block the product delete the admin asked for.
    console.error('Could not remove image from Cloudinary:', err.message);
  }
}

// Builds a resized delivery URL from a stored one, so listings can request
// smaller images than the product page does.
function thumbUrl(url, width = 600) {
  if (!url || !url.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/w_${width},q_auto,f_auto/`);
}

module.exports = { uploadBuffer, deleteImage, thumbUrl, isConfigured };
