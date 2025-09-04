const { client } = require('../utils/metrics');

exports.getMetrics = async (req, res, next) => {
    try {
        res.set('Content-Type', client.register.contentType);
        res.end(await client.register.metrics());
    } catch (error) {
        next(error);
    }
};