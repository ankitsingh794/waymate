const client = require('prom-client');

// Enable default metrics like CPU and memory usage
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ prefix: 'waymate_' });

// Create a counter for total HTTP requests
const httpRequestCounter = new client.Counter({
    name: 'waymate_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
});

// Create a histogram to measure HTTP request duration in seconds
const httpRequestDurationHistogram = new client.Histogram({
    name: 'waymate_http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route'],
    buckets: [0.1, 0.5, 1, 1.5, 2, 5] // Buckets for response times in seconds
});

module.exports = {
    client,
    httpRequestCounter,
    httpRequestDurationHistogram
};