const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const AppError = require('../utils/AppError');

// Allowed MIME types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'application/pdf'];

// Memory storage for multer (we compress in memory)
const imageStorage = multer.memoryStorage();
const mediaStorage = multer.memoryStorage();

// Multer uploaders
const imageUploader = multer({
  storage: imageStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // allow large images up to 50MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new AppError('Invalid file type. Only JPG, PNG, or WEBP images are allowed.', 400), false);
  },
});

const mediaUploader = multer({
  storage: mediaStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit for media
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MEDIA_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new AppError('This file type is not supported.', 400), false);
  },
});

// Utility function to compress and save image
const compressAndSaveImage = async (fileBuffer, filename, folder = 'uploads') => {
  // Ensure folder exists
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

  const filepath = path.join(folder, filename);

  // Compress and resize
  await sharp(fileBuffer)
    .resize({ width: 1024 })       // optional: max width 1024px
    .jpeg({ quality: 70 })         // compress to 70% quality
    .toFile(filepath);

  return filepath;
};

// Middleware to handle single image upload with compression
exports.uploadSingleImage = (fieldName) => [
  imageUploader.single(fieldName),
  async (req, res, next) => {
    try {
      if (!req.file) return next();

      // Generate filename
      const filename = `${Date.now()}-${req.file.originalname.split(' ').join('-')}.jpeg`;
      const savedPath = await compressAndSaveImage(req.file.buffer, filename);

      // Attach path to req.file for later use
      req.file.path = savedPath;
      req.file.filename = filename;

      next();
    } catch (err) {
      next(err);
    }
  },
];

// Middleware to handle media (images, video, pdf) without compression
exports.uploadMedia = (fieldName) => mediaUploader.single(fieldName);
