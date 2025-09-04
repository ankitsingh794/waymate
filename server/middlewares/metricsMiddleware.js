const { httpRequestCounter, httpRequestDurationHistogram } = require('../utils/metrics');
const url = require('url');

const metricsMiddleware = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const durationSeconds = (Date.now() - start) / 1000;
        const route = url.parse(req.originalUrl).pathname;
        
        // Record request duration
        httpRequestDurationHistogram
            .labels(req.method, route)
            .observe(durationSeconds);
            
        // Record request count
        httpRequestCounter
            .labels(req.method, route, res.statusCode)
            .inc();
    });
    
    return next();
};

module.exports = metricsMiddleware;