const multer = require('multer');
const path = require('path');
const logger = require('../utils/logger');

// ✅ Memory storage for Cloudinary/S3
const storage = multer.memoryStorage();

// ✅ File type filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    const errorMsg = `Invalid file type: ${file.originalname}. Only jpeg, jpg, png, webp allowed.`;
    logger.warn(`Upload rejected | User: ${req.user ? req.user._id : 'Guest'} | IP: ${req.ip} | Reason: ${errorMsg}`);
    
    const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE');
    err.message = errorMsg;
    cb(err);
  }
};

// ✅ Multer config
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  }
});

module.exports = upload;
