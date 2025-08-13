
const generateUserTripsKey = (userId, queryParams) => {
    const queryStr = new URLSearchParams(queryParams).toString();
    return `user:${userId}:trips:${queryStr}`;
};

const generateTripDetailsKey = (tripId) => {
    return `trip:${tripId}:details`;
};

const generateSettlementsKey = (tripId) => {
    return `trip:${tripId}:settlements`;
};

module.exports = {
    generateUserTripsKey,
    generateTripDetailsKey,
    generateSettlementsKey,
};