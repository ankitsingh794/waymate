const axios = require('axios');
const Parser = require('rss-parser');
// ✅ Increased timeout to 15 seconds for better resilience
const parser = new Parser({ timeout: 15000 });
const logger = require('../utils/logger');
const { getCache, setCache } = require('../config/redis');

const CACHE_TTL_SECONDS = 600; // 10 minutes cache TTL

//Defined threat categories with expanded, specific keywords.
const THREAT_CATEGORIES = {
  'Natural Disaster': /landslide|earthquake|flood|cyclone|tsunami|storm|wildfire|tremor|monsoon|deluge|avalanche|hailstorm|heatwave|blizzard/i,
  'Transport Hazard': /strike|protest|closure|highway blocked|road closed|traffic|diversion|accident|derailed|cancellation|gridlock|congestion|service disruption|flight delay/i,
  'Crime & Safety': /crime|theft|scam|robbery|assault|pickpocket|curfew|unrest|violence|police warning|lockdown|shooting|riot|looting|abduction/i,
  'Health Advisory': /outbreak|epidemic|pandemic|health advisory|virus|disease|contamination/i,
  'Formal Advisory': /alert|warning|advisory|threat|danger|caution|emergency/i,
};

// Feeds by region
const ALERT_FEEDS_BY_REGION = {
  global: [
    'https://www.weather.gov/alerts/rss',
    'https://travel.state.gov/_res/rss/TAs.xml',
  ],
  india: [
    // 'https://mausam.imd.gov.in/rss/weatheralerts.xml', // ❌ This link is consistently down (404)
    'https://timesofindia.indiatimes.com/rssfeeds/296589292.cms',
    'https://www.thehindu.com/news/national/?service=rss',
    'https://feeds.feedburner.com/ndtvnews-top-stories', // ✅ Updated NDTV feed URL
    'https://www.indiatoday.in/rss/1206573', // India Today National
  ],
  andhra_pradesh: [
    'https://www.thehindu.com/news/national/andhra-pradesh/?service=rss',
    'https://www.deccanchronicle.com/rss/state/andhra-pradesh',
    'https://www.sakshi.com/rss-feed',
    'https://www.newindianexpress.com/states/andhra-pradesh/rss',
  ],
  arunachal_pradesh: [
    'https://www.arunachaltimes.in/rssfeed',
    'https://arunachal24.in/feed/',
  ],
  assam: [
    'https://assamtribune.com/rss',
    'https://www.sentinelassam.com/feed/',
    'https://gplus.guwahatiplus.com/rss',
  ],
  bihar: [
    'https://timesofindia.indiatimes.com/rssfeeds/295823280.cms',
    'https://www.prabhatkhabar.com/rss/state/bihar',
    'https://www.hindustantimes.com/cities/patna-news/rss/feed',
  ],
  chhattisgarh: [
    'https://www.newindianexpress.com/states/chhattisgarh/rss',
    'https://www.naidunia.com/rss/chhattisgarh',
  ],
  delhi: [
    'https://timesofindia.indiatimes.com/rssfeeds/2912256.cms',
    'https://www.hindustantimes.com/delhi-news/rss/feed',
  ],
  goa: [
    'https://timesofindia.indiatimes.com/rssfeeds/2940629.cms',
    'https://www.heraldgoa.in/rss/feed',
  ],
  gujarat: [
    'https://timesofindia.indiatimes.com/rssfeeds/2939708.cms',
    'https://www.divyabhaskar.co.in/rss',
  ],
  haryana: [
    'https://timesofindia.indiatimes.com/rssfeeds/2915348.cms',
    'https://www.bhaskar.com/rss/haryana',
  ],
  himachal_pradesh: [
    'https://himachal.nic.in/en-US/RSS-Feeds.html',
    'https://www.tribuneindia.com/rssfeed/himachal-pradesh',
  ],
  jharkhand: [
    'https://timesofindia.indiatimes.com/rssfeeds/2957024.cms',
    'https://www.prabhatkhabar.com/rss/state/jharkhand',
  ],
  karnataka: [
    'https://timesofindia.indiatimes.com/rssfeeds/2959650.cms',
    'https://www.deccanherald.com/rss/karnataka.xml',
    'https://starofmysore.com/feed/',
  ],
  kerala: [
    'https://timesofindia.indiatimes.com/rssfeeds/2949053.cms',
    'https://www.mathrubhumi.com/rss/kerala-news.xml',
    'https://www.manoramanews.com/rss',
  ],
  madhya_pradesh: [
    'https://timesofindia.indiatimes.com/rssfeeds/2955246.cms',
    'https://www.bhaskar.com/rss/madhya-pradesh',
  ],
  maharashtra: [
    'https://timesofindia.indiatimes.com/rssfeeds/2927337.cms',
    'https://www.lokmat.com/rss',
    'https://www.mid-day.com/rss/mumbai/mumbai-news.xml',
  ],
  manipur: ['https://ifp.co.in/feed/'],
  meghalaya: [
    'https://meghalayatimes.info/feed/',
    'https://www.easternmirror.news/feed/',
  ],
  mizoram: ['https://www.vanglaini.org/rss'],
  nagaland: ['https://nagalandpost.com/rss'],
  odisha: [
    'https://timesofindia.indiatimes.com/rssfeeds/2949872.cms',
    'https://odishatv.in/rss',
    'https://odishabytes.com/feed/',
  ],
  punjab: [
    'https://timesofindia.indiatimes.com/rssfeeds/2917142.cms',
    'https://www.tribuneindia.com/rssfeed/punjab',
  ],
  rajasthan: [
    'https://timesofindia.indiatimes.com/rssfeeds/2949910.cms',
    'https://www.patrika.com/rss-feed/',
  ],
  sikkim: ['https://www.sikkimexpress.com/feed/'],
  tamil_nadu: [
    'https://timesofindia.indiatimes.com/rssfeeds/2917288.cms',
    'https://www.thehindu.com/news/national/tamil-nadu/?service=rss',
    'https://www.dtnext.in/rss',
  ],
  telangana: ['https://timesofindia.indiatimes.com/rssfeeds/2959721.cms'],
  tripura: ['https://tripurainfo.com/rssfeed'],
  uttar_pradesh: [
    'https://timesofindia.indiatimes.com/rssfeeds/2916848.cms',
    'https://www.livehindustan.com/rss/uttar-pradesh',
    'https://www.jagran.com/rss/uttar-pradesh.xml',
  ],
  uttarakhand: [
    'https://timesofindia.indiatimes.com/rssfeeds/2954846.cms',
    'https://www.livehindustan.com/rss/uttarakhand',
  ],
  west_bengal: [
    'https://timesofindia.indiatimes.com/rssfeeds/2971500.cms',
    'https://www.hindustantimes.com/cities/kolkata-news/rss/feed',
  ],

  // Hindi and pan-India general news feeds
  ndtv_hindi: ['https://feeds.feedburner.com/ndtvidhimaalts'],
};


// City to state exact normalized lookup
const CITY_TO_STATE = {
  bangalore: 'karnataka',
  bengaluru: 'karnataka',
  mysore: 'karnataka',
  hubli: 'karnataka',
  shimoga: 'karnataka',
  mumbai: 'maharashtra',
  pune: 'maharashtra',
  nagpur: 'maharashtra',
  nashik: 'maharashtra',
  solapur: 'maharashtra',
  aurangabad: 'maharashtra',
  kolhapur: 'maharashtra',
  delhi: 'delhi',
  chandigarh: 'punjab',
  chennai: 'tamil_nadu',
  coimbatore: 'tamil_nadu',
  madurai: 'tamil_nadu',
  tiruchirappalli: 'tamil_nadu',
  salem: 'tamil_nadu',
  tirunelveli: 'tamil_nadu',
  hyderabad: 'telangana',
  warangal: 'telangana',
  nizamabad: 'telangana',
  khammam: 'telangana',
  visakhapatnam: 'andhra_pradesh',
  vijayawada: 'andhra_pradesh',
  guntur: 'andhra_pradesh',
  tirupati: 'andhra_pradesh',
  kurnool: 'andhra_pradesh',
  ahmedabad: 'gujarat',
  surat: 'gujarat',
  rajkot: 'gujarat',
  vadodara: 'gujarat',
  bhavnagar: 'gujarat',
  gandhinagar: 'gujarat',
  jaipur: 'rajasthan',
  udaipur: 'rajasthan',
  jodhpur: 'rajasthan',
  kota: 'rajasthan',
  ajmer: 'rajasthan',
  lucknow: 'uttar_pradesh',
  kanpur: 'uttar_pradesh',
  varanasi: 'uttar_pradesh',
  agra: 'uttar_pradesh',
  meerut: 'uttar_pradesh',
  ghaziabad: 'uttar_pradesh',
  indore: 'madhya_pradesh',
  bhopal: 'madhya_pradesh',
  gwalior: 'madhya_pradesh',
  jabalpur: 'madhya_pradesh',
  ujjain: 'madhya_pradesh',
  patna: 'bihar',
  gaya: 'bihar',
  muzaffarpur: 'bihar',
  darbhanga: 'bihar',
  ranchi: 'jharkhand',
  jamshedpur: 'jharkhand',
  bokaro: 'jharkhand',
  guwahati: 'assam',
  silchar: 'assam',
  dibrugarh: 'assam',
  shillong: 'meghalaya',
  imphal: 'manipur',
  aizawl: 'mizoram',
  kohima: 'nagaland',
  agartala: 'tripura',
  gangtok: 'sikkim',
  shimla: 'himachal_pradesh',
  mandi: 'himachal_pradesh',
  dehradun: 'uttarakhand',
  haridwar: 'uttarakhand',
  amritsar: 'punjab',
  jalandhar: 'punjab',
  ludhiana: 'punjab',
  kochi: 'kerala',
  trivandrum: 'kerala',
  kollam: 'kerala',
  ernakulam: 'kerala',
  kannur: 'kerala',
  panaji: 'goa',
  bhubaneswar: 'odisha',
  rourkela: 'odisha',
  sambalpur: 'odisha',
  pondicherry: 'puducherry',
  portblair: 'andaman_and_nicobar',
  leh: 'ladakh',
  kargil: 'ladakh',
  silvassa: 'dadra_and_nagar_haveli',
  daman: 'daman_and_diu',
  kavaratti: 'lakshadweep',
  dharamshala: 'himachal_pradesh',
  muzaffarnagar: 'uttar_pradesh',
  mathura: 'uttar_pradesh',
  faridabad: 'haryana',
  gurgaon: 'haryana',
  rohtak: 'haryana',
  sonipat: 'haryana',
  jangipur: 'west_bengal',
  asansol: 'west_bengal',
  siliguri: 'west_bengal',
  darjeeling: 'west_bengal',
  dindigul: 'tamil_nadu',
  vellore: 'tamil_nadu',
  nanded: 'maharashtra',
  jammu: 'jammu_and_kashmir',
  srinagar: 'jammu_and_kashmir',
  malad: 'maharashtra',
  deoghar: 'jharkhand',
  bhiwandi: 'maharashtra',
  motihari: 'bihar',
  patiala: 'punjab',
  bathinda: 'punjab',
  jalgaon: 'maharashtra',
  akola: 'maharashtra',
  ambala: 'haryana',
  hosur: 'tamil_nadu',
  thiruvananthapuram: 'kerala',
};

// Utility to normalize strings
function normalizeText(text = '') {
  return text.toLowerCase().trim();
}

// Map destination city/state name to region key
function mapDestinationToRegion(destinationName) {
  if (!destinationName) return 'global';

  const name = normalizeText(destinationName);

  // First check exact city mapping:
  if (CITY_TO_STATE[name]) {
    return CITY_TO_STATE[name];
  }

  // Then fallback to state/region substring matching:
  const stateMap = {
    'andhra pradesh': 'andhra_pradesh',
    'arunachal pradesh': 'arunachal_pradesh',
    assam: 'assam',
    bihar: 'bihar',
    chhattisgarh: 'chhattisgarh',
    delhi: 'delhi',
    goa: 'goa',
    gujarat: 'gujarat',
    haryana: 'haryana',
    'himachal pradesh': 'himachal_pradesh',
    jharkhand: 'jharkhand',
    karnataka: 'karnataka',
    kerala: 'kerala',
    'madhya pradesh': 'madhya_pradesh',
    maharashtra: 'maharashtra',
    manipur: 'manipur',
    meghalaya: 'meghalaya',
    mizoram: 'mizoram',
    nagaland: 'nagaland',
    odisha: 'odisha',
    punjab: 'punjab',
    rajasthan: 'rajasthan',
    sikkim: 'sikkim',
    'tamil nadu': 'tamil_nadu',
    telangana: 'telangana',
    tripura: 'tripura',
    'uttar pradesh': 'uttar_pradesh',
    uttarakhand: 'uttarakhand',
    'west bengal': 'west_bengal',
  };

  for (const [stateName, regionKey] of Object.entries(stateMap)) {
    if (name.includes(stateName)) return regionKey;
  }

  // Default fallback to pan-India
  return 'india';
}

const MAX_ALERTS = 5;

// Main function to fetch and cache alerts for destination
async function fetchThreatAlertsForDestination(destinationName) {
  const normalizedDest = destinationName.toLowerCase().trim();
  const cacheKey = `v2:alerts:${normalizedDest}`;

  // Try cache first
  try {
    const cached = await getCache(cacheKey);
    if (cached) {
      logger.info(`Serving alerts from cache for: ${destinationName}`);
      return JSON.parse(cached);
    }
  } catch (err) {
    logger.warn(`Redis get error for key ${cacheKey}: ${err.message}`);
  }

  const regionKey = mapDestinationToRegion(destinationName);
  logger.info(`Mapped destination "${destinationName}" to region: ${regionKey}`);

  // Collect feeds
  let feedsToFetch = [
    ...(ALERT_FEEDS_BY_REGION.global || []),
    ...(ALERT_FEEDS_BY_REGION[regionKey] || []),
  ];

  if (regionKey !== 'india') {
    feedsToFetch = feedsToFetch.concat(ALERT_FEEDS_BY_REGION.india);
  }

  feedsToFetch = [...new Set(feedsToFetch)];

  // Fetch all feeds concurrently
  const feedPromises = feedsToFetch.map(async (feedUrl) => {
    try {
      logger.info(`Fetching feed: ${feedUrl}`);
      // ✅ ADD THIS HEADERS OBJECT
      const response = await axios.get(feedUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'WayMate/1.0 (Travel Planning Service)'
        }
      });
      const feed = await parser.parseString(response.data);
      return { feed, feedUrl };
    } catch (err) {
      logger.warn(`Failed to fetch/parse feed ${feedUrl}: ${err.message}`);
      return null;
    }
  });

  const feedResults = await Promise.all(feedPromises);

  const alertsSet = new Set();
  const alertsWithDate = [];

  const destLower = normalizeText(destinationName);
  const regionLower = normalizeText(regionKey.replace(/_/g, ' '));

  for (const result of feedResults) {
    if (!result || !result.feed || !Array.isArray(result.feed.items)) continue;

    for (const item of result.feed.items) {
      const text = `${item.title || ''} ${item.contentSnippet || item.summary || ''}`;
      const textLower = normalizeText(text);

      // ✅ NEW: More intelligent filtering logic
      // First, check if the location is mentioned.
      if (textLower.includes(destLower) || textLower.includes(regionLower)) {
        // Then, loop through our threat categories to find a keyword match.
        for (const [category, regex] of Object.entries(THREAT_CATEGORIES)) {
          if (regex.test(textLower)) {
            const trimmedTitle = item.title.trim();
            if (!alertsSet.has(trimmedTitle)) {
              alertsSet.add(trimmedTitle);

              const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
              alertsWithDate.push({
                title: trimmedTitle,
                pubDate,
                category, // Store the category of the threat
              });
            }
            break; // Stop checking categories once one has matched for this item
          }
        }
      }
    }
  }

  // Sort alerts descending by pubDate (latest first)
  alertsWithDate.sort((a, b) => b.pubDate - a.pubDate);

  // ✅ NEW: Format the final alert string to include the category.
  const finalAlerts = alertsWithDate.slice(0, MAX_ALERTS).map(a => `[${a.category}] ${a.title}`);

  // Cache the result
  await setCache(cacheKey, finalAlerts, CACHE_TTL_SECONDS);

  return finalAlerts;
}
module.exports = {
  fetchThreatAlertsForDestination,
  mapDestinationToRegion,
  ALERT_FEEDS_BY_REGION,
};