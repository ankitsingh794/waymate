/**
 * @class AppError
 * @extends Error
 * @description A standardized, operational error class for the application.
 *
 * This class should be used for all anticipated, operational errors (e.g., "resource not found",
 * "invalid input", "user not authorized"). By using this class, we can easily identify
 * errors that are "trusted" and whose messages are safe to send to the client.
 *
 * The `isOperational` flag is the key security feature. A global error handler will
 * check for this flag. If true, it sends the error message to the client. If false (or if the error
 * is not an instance of AppError), it means an unexpected, non-operational error occurred,
 * and a generic message should be sent to prevent leaking stack traces or other sensitive details.
 */
class AppError extends Error {
  /**
   * @param {string} message - The error message, which should be safe for client consumption.
   * @param {number} statusCode - The HTTP status code that corresponds to this error (e.g., 400, 404).
   */
  constructor(message, statusCode) {
    // Call the parent constructor (Error) with the message.
    super(message);

    /**
     * @type {number}
     * @description The HTTP status code to be sent in the response.
     */
    this.statusCode = statusCode;

    /**
     * @type {string}
     * @description A status string ('fail' for 4xx, 'error' for 5xx) for the JSON response body.
     */
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    /**
     * @type {boolean}
     * @description A flag indicating that this is an operational, trusted error, not a bug.
     * This is crucial for preventing sensitive information leakage in production.
     */
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;