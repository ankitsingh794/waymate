const Parser = require('rss-parser');
const logger = require('../utils/logger');
const axios = require('axios'); // Use axios to add headers

const parser = new Parser();

const EVENT_FEED_SOURCES = {
    'delhi': ['https://www.delhievents.com/feed/'],
    'mumbai': ['https://insider.in/mumbai/rss'],
    'bangalore': ['https://insider.in/bangalore/rss'],
    'goa': ['https://www.whatsupgoa.com/feed/'],
    'default': (destination) => `https://news.google.com/rss/search?q=events+in+${encodeURIComponent(destination)}&hl=en-IN&gl=IN&ceid=IN:en`
};

async function fetchLocalEvents(destinationName, startDate, endDate) {
    const tripStart = new Date(startDate);
    const tripEnd = new Date(endDate);
    const lowerCaseDestination = destinationName.toLowerCase();

    const sourceKey = Object.keys(EVENT_FEED_SOURCES).find(key => 
        key !== 'default' && lowerCaseDestination.includes(key)
    );

    let feedUrls;
    if (sourceKey) {
        feedUrls = EVENT_FEED_SOURCES[sourceKey];
    } else {
        const googleNewsUrl = EVENT_FEED_SOURCES.default(destinationName);
        feedUrls = [googleNewsUrl];
    }

    const allEvents = [];

    for (const url of feedUrls) {
        try {
            const response = await axios.get(url, {
                headers: { 'User-Agent': 'WayMateApp/1.0 (+http://yourapp.com/bot)' },
                timeout: 10000
            });
            
            const feed = await parser.parseString(response.data);
            if (feed && feed.items) {
                feed.items.forEach(item => {
                    const eventDate = item.pubDate ? new Date(item.pubDate) : new Date();
                    if (eventDate >= tripStart && eventDate <= tripEnd) {
                        allEvents.push({
                            title: item.title,
                            link: item.link,
                            date: eventDate.toISOString().split('T')[0],
                            summary: item.contentSnippet || item.content || 'No summary available.'
                        });
                    }
                });
            }
        } catch (error) {
            logger.warn(`Failed to fetch or parse event feed from ${url}: ${error.message}`);
        }
    }

    logger.info(`Found ${allEvents.length} relevant local events for ${destinationName}.`);
    return allEvents.slice(0, 5);
}


module.exports = { fetchLocalEvents };

