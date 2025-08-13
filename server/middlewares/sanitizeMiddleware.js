const { JSDOM } = require('jsdom');
const DOMPurify = require('dompurify');

const window = new JSDOM('').window;
const purify = DOMPurify(window);

/**
 * Recursively traverses an object or array and sanitizes all string values.
 * @param {*} data - The data to sanitize (object, array, string, etc.).
 * @returns {*} The sanitized data.
 */
const sanitizeData = (data) => {
  if (typeof data === 'string') {
    return purify.sanitize(data);
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }
  if (typeof data === 'object' && data !== null) {
    const sanitizedObject = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        sanitizedObject[key] = sanitizeData(data[key]);
      }
    }
    return sanitizedObject;
  }
  return data;
};

/**
 * Express middleware to sanitize req.body and req.query.
 */
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeData(req.body);
  }
  if (req.query) {
    req.query = sanitizeData(req.query);
  }
  next();
};

module.exports = sanitizeInput;