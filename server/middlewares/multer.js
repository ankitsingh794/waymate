const multer = require('multer');
const AppError = require('../utils/AppError');

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const imageUploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for photos
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Invalid file type. Only JPG, PNG, or WEBP images are allowed.', 400), false);
    }
  },
});


const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'application/pdf'];
const mediaUploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit for media
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MEDIA_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('This file type is not supported.', 400), false);
    }
  },
});

exports.uploadSingleImage = (fieldName) => imageUploader.single(fieldName);
exports.uploadMedia = (fieldName) => mediaUploader.single(fieldName);