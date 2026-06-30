import multer from 'multer';
import fs from 'fs';
import os from 'os';
import path from 'path';

const uploadDir = process.env.VERCEL
  ? path.join(os.tmpdir(), 'forever-store-uploads')
  : path.join(process.cwd(), 'uploads');

// Ensure the upload folder exists (so diskStorage can write files safely).
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, uploadDir);
  },
  filename: function (req, file, callback) {
    // Keep original extension, but make the filename unique to avoid overwrites.
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    callback(null, `${baseName}-${uniqueSuffix}${ext}`);
  },
});

// IMPORTANT: multer takes an options object. Passing `storage` directly breaks `req.files[i].path`.
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 4 },
  fileFilter: (req, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.mimetype)) {
      return callback(new Error('Only JPEG, PNG, WebP, and AVIF images are allowed'));
    }
    callback(null, true);
  }
});

export default upload;
