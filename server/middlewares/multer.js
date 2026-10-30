const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const AppError = require('../utils/AppError');

// Allowed MIME types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'application/pdf'];

// Memory storage for multer (we compress in memory)
const imageStorage = multer.memoryStorage();
const mediaStorage = multer.memoryStorage();

// Multer uploaders with safe memory bounds
const imageUploader = multer({
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Safe 10MB limit to prevent Heap Out-Of-Memory DoS
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Invalid file type. Only JPG, PNG, or WEBP images are allowed.', 400), false);
    }
  },
});

const mediaUploader = multer({
  storage: mediaStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit for chat media
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MEDIA_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('This file type is not supported.', 400), false);
    }
  },
});

// Utility function to compress and save image with directory traversal guard
const compressAndSaveImage = async (fileBuffer, filename, folder = 'uploads') => {
  const resolvedFolder = path.resolve(folder);
  if (!fs.existsSync(resolvedFolder)) {
    fs.mkdirSync(resolvedFolder, { recursive: true });
  }

  // Strictly prevent path traversal
  const safeFilename = path.basename(filename);
  const filepath = path.join(resolvedFolder, safeFilename);

  // Compress and resize
  await sharp(fileBuffer)
    .resize({ width: 1024, withoutEnlargement: true })
    .jpeg({ quality: 75 })
    .toFile(filepath);

  return filepath;
};

// Middleware to handle single image upload with compression
exports.uploadSingleImage = (fieldName) => [
  imageUploader.single(fieldName),
  async (req, res, next) => {
    try {
      if (!req.file) return next();

      // Secure random filename generation (immune to path traversal attacks)
      const randomToken = crypto.randomBytes(12).toString('hex');
      const filename = `${Date.now()}-${randomToken}.jpeg`;
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
