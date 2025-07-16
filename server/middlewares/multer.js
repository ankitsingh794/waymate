const multer = require('multer');
const path = require('path');
const logger = require('../utils/logger');

// ✅ Use memory storage (for Cloudinary/S3 uploads)
const storage = multer.memoryStorage();

// ✅ File filter for image validation
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    const errorMsg = `Invalid file type: ${file.originalname}. Only jpeg, jpg, png, webp are allowed.`;
    logger.warn(`File upload rejected | User: ${req.user ? req.user._id : 'unknown'} | Reason: ${errorMsg}`);
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', errorMsg)); // Standard Multer error
  }
};

// ✅ Configure Multer with size limit & custom error messages
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  }
});

module.exports = upload;
