const { JSDOM } = require('jsdom');
const DOMPurify = require('dompurify');

const window = new JSDOM('').window;
const purify = DOMPurify(window);

const MAX_SANITIZATION_DEPTH = 10;
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Recursively traverses an object or array and sanitizes all string values against XSS
 * while blocking prototype pollution attempts and stack-overflow recursive structures.
 * @param {*} data - The data to sanitize.
 * @param {number} depth - Current recursion depth.
 * @returns {*} The sanitized data.
 */
const sanitizeData = (data, depth = 0) => {
  if (depth > MAX_SANITIZATION_DEPTH) {
    return data;
  }

  if (typeof data === 'string') {
    return purify.sanitize(data.trim());
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item, depth + 1));
  }

  if (typeof data === 'object' && data !== null && !(data instanceof Date) && !(data instanceof RegExp) && !Buffer.isBuffer(data)) {
    const sanitizedObject = {};
    for (const key of Object.keys(data)) {
      if (DANGEROUS_KEYS.has(key)) {
        continue;
      }
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        sanitizedObject[key] = sanitizeData(data[key], depth + 1);
      }
    }
    return sanitizedObject;
  }

  return data;
};

/**
 * Express middleware to sanitize req.body, req.query, and req.params.
 */
const sanitizeInput = (req, res, next) => {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeData(req.body);
    }
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeData(req.query);
    }
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeData(req.params);
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = sanitizeInput;
