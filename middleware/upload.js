const multer = require('multer');

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB — plenty for a phone photo
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

// Memory storage: the file goes straight from the request to Cloudinary
// without ever touching the server's disk. That matters on hosts like
// Render where the filesystem is ephemeral.
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_BYTES, files: 8 },
  fileFilter(req, file, cb) {
    if (!ALLOWED.includes(file.mimetype)) {
      return cb(new Error('Upload a JPG, PNG, WEBP or HEIC image.'));
    }
    cb(null, true);
  },
});

// Turns multer's errors into the same JSON shape the rest of the API uses.
function handleUploadErrors(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'That image is over 8MB. Try a smaller one.' });
    }
    return res.status(400).json({ error: 'That file could not be uploaded.' });
  }
  if (err && err.message && err.message.startsWith('Upload a')) {
    return res.status(400).json({ error: err.message });
  }
  return next(err);
}

module.exports = { upload, handleUploadErrors };
