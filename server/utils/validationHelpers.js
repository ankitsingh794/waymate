const { param } = require('express-validator');

// Change this function to return an array [ ]
const mongoIdValidation = (paramName) => [
    param(paramName).isMongoId().withMessage(`Invalid ID format for parameter: ${paramName}`)
];

module.exports = {
    mongoIdValidation,
};