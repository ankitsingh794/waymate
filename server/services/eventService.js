const Parser = require('rss-parser');
const logger = require('../utils/logger');
const axios = require('axios');
const { getCache, setCache } = require('../config/redis');

const CACHE_TTL_SECONDS = 3600; 

const parser = new Parser({
  timeout: 10000, 
  headers: { 'User-Agent': 'WayMateApp/1.0' } 
});

const EVENT_FEED_SOURCES = {
    'delhi': ['https://www.delhievents.com/feed/'],
    'mumbai': ['https://insider.in/mumbai/rss'],
    'bangalore': ['https://insider.in/bangalore/rss'],
    'goa': ['https://www.whatsupgoa.com/feed/'],
    'default': (destination) => `https://news.google.com/rss/search?q=events+in+${encodeURIComponent(destination)}&hl=en-IN&gl=IN&ceid=IN:en`
};

async function fetchLocalEvents(destinationName, startDate, endDate) {
    const lowerCaseDestination = destinationName.toLowerCase().trim();
    const cacheKey = `events:${lowerCaseDestination}:${startDate}:${endDate}`;
    const cachedEvents = await getCache(cacheKey);
    if (cachedEvents) {
        logger.info(`Returning cached events for "${destinationName}"`);
        return cachedEvents;
    }

    const tripStart = new Date(startDate);
    const tripEnd = new Date(endDate);

    const sourceKey = Object.keys(EVENT_FEED_SOURCES).find(key => 
        key !== 'default' && lowerCaseDestination.includes(key)
    );

    const feedUrls = sourceKey 
        ? EVENT_FEED_SOURCES[sourceKey] 
        : [EVENT_FEED_SOURCES.default(destinationName)];

    const results = await Promise.allSettled(
        feedUrls.map(url => parser.parseURL(url))
    );

    const allEvents = [];
    results.forEach(result => {
        if (result.status === 'fulfilled' && result.value?.items) {
            result.value.items.forEach(item => {
                const eventDate = item.isoDate ? new Date(item.isoDate) : (item.pubDate ? new Date(item.pubDate) : null);
                if (eventDate && eventDate >= tripStart && eventDate <= tripEnd) {
                    allEvents.push({
                        title: item.title,
                        link: item.link,
                        date: eventDate.toISOString().split('T')[0],
                        summary: item.contentSnippet || item.content || 'No summary available.'
                    });
                }
            });
        } else if (result.status === 'rejected') {
            logger.warn(`Failed to fetch or parse an event feed: ${result.reason?.message}`);
        }
    });
    
    const finalEvents = allEvents.slice(0, 5);
    logger.info(`Found ${finalEvents.length} relevant local events for ${destinationName}.`);

    // This line will now work correctly.
    await setCache(cacheKey, finalEvents, CACHE_TTL_SECONDS);

    return finalEvents;
}

module.exports = { fetchLocalEvents };