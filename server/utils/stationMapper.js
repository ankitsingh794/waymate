'use strict';

/**
 * Enterprise-grade Station Mapper for Indian Railways
 * ---------------------------------------------------
 * - Zero-dep, Node/CommonJS
 * - Robust normalization + alias handling
 * - Fuzzy, city, code, and geo-based lookup
 * - Deterministic scoring (major hubs boosted)
 * - In-memory TTL cache for hot lookups
 *
 * Dataset schema (stations.json):
 * [
 *   {
 *     "code": "NDLS",               // IR station code (uppercase)
 *     "name": "New Delhi",          // Official station name
 *     "city": "Delhi",              // Primary city
 *     "state": "Delhi",
 *     "lat": 28.643,                // number
 *     "lon": 77.219,                // number
 *     "isMajor": true,              // boolean - boosts ranking
 *     "aliases": ["New Delhi Jn", "NDLS", "New Delhi Railway Station"]
 *   },
 *   ...
 * ]
 */

const fs = require('fs');
const path = require('path');

// ----------------------------- Config ---------------------------------

const DEFAULT_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h
const DEFAULT_MAX_SUGGESTIONS = 8;
const DEFAULT_MAX_RESULTS = 5;

// --------------------------- Small Sample ------------------------------
// Replace this with a real dataset file (see loadStationsFromPath).
const SAMPLE_STATIONS = [
  {
    code: 'NDLS', name: 'New Delhi', city: 'Delhi', state: 'Delhi',
    lat: 28.643, lon: 77.219, isMajor: true,
    aliases: ['New Delhi Jn', 'New Delhi Railway Station', 'NDLS']
  },
  {
    code: 'DLI', name: 'Delhi', city: 'Delhi', state: 'Delhi',
    lat: 28.667, lon: 77.227, isMajor: true, aliases: ['Old Delhi', 'Delhi Junction', 'DLI']
  },
  {
    code: 'BCT', name: 'Mumbai Central', city: 'Mumbai', state: 'Maharashtra',
    lat: 18.969, lon: 72.819, isMajor: true, aliases: ['Bombay Central', 'Mumbai Central', 'BCT']
  },
  {
    code: 'CSTM', name: 'Chhatrapati Shivaji Maharaj Terminus', city: 'Mumbai', state: 'Maharashtra',
    lat: 18.940, lon: 72.835, isMajor: true, aliases: ['CSMT', 'VT', 'Chhatrapati Shivaji Terminus', 'CSTM']
  },
  {
    code: 'HWH', name: 'Howrah Jn', city: 'Kolkata', state: 'West Bengal',
    lat: 22.585, lon: 88.342, isMajor: true, aliases: ['Howrah', 'Howrah Junction', 'HWH']
  },
  {
    code: 'SDAH', name: 'Sealdah', city: 'Kolkata', state: 'West Bengal',
    lat: 22.566, lon: 88.370, isMajor: true, aliases: ['Sealdah Jn', 'SDAH']
  },
  {
    code: 'KOAA', name: 'Kolkata', city: 'Kolkata', state: 'West Bengal',
    lat: 22.574, lon: 88.363, isMajor: true, aliases: ['Kolkata Terminus', 'KOAA']
  }
];

// --------------------------- Utilities --------------------------------

function normalizeStr(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')           // split diacritics
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9]+/g, '')  // alnum only
    .trim();
}

function levenshtein(a, b, maxDistance = 3) {
  // Early exit for large diffs
  if (Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1;
  const dp = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) dp[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = dp[j];
      if (a[i - 1] === b[j - 1]) {
        dp[j] = prev;
      } else {
        dp[j] = Math.min(prev + 1, dp[j] + 1, dp[j - 1] + 1);
      }
      prev = temp;
    }
  }
  return dp[b.length];
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

class TTLCache {
  constructor(ttlMs = DEFAULT_CACHE_TTL_MS) {
    this.ttl = ttlMs;
    this.map = new Map();
  }
  get(key) {
    const v = this.map.get(key);
    if (!v) return undefined;
    if (Date.now() > v.exp) {
      this.map.delete(key);
      return undefined;
    }
    return v.val;
  }
  set(key, val) {
    this.map.set(key, { val, exp: Date.now() + this.ttl });
    return val;
  }
  clear() {
    this.map.clear();
  }
}

// ----------------------------- Indexer --------------------------------

class StationIndexer {
  constructor() {
    this.loaded = false;
    this.stations = [];
    this.codeIndex = new Map();          // CODE → station
    this.cityIndex = new Map();          // normalized city → [stations]
    this.nameIndex = new Map();          // normalized name → [stations]
    this.aliasIndex = new Map();         // normalized alias → [stations]
    this.cache = new TTLCache();
  }

  loadStationsFromPath(filePath) {
    const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    const json = JSON.parse(fs.readFileSync(abs, 'utf8'));
    this._build(json);
  }

  loadStations(dataArrayOrNull) {
    const data = Array.isArray(dataArrayOrNull) && dataArrayOrNull.length ? dataArrayOrNull : SAMPLE_STATIONS;
    this._build(data);
  }

  _build(raw) {
    // Basic validation & normalization
    const stations = [];
    for (const r of raw) {
      if (!r || !r.code || !r.name) continue;
      const s = {
        code: String(r.code).toUpperCase().trim(),
        name: String(r.name).trim(),
        city: r.city ? String(r.city).trim() : '',
        state: r.state ? String(r.state).trim() : '',
        lat: typeof r.lat === 'number' ? r.lat : null,
        lon: typeof r.lon === 'number' ? r.lon : null,
        isMajor: !!r.isMajor,
        aliases: Array.isArray(r.aliases) ? r.aliases.filter(Boolean).map(a => String(a).trim()) : []
      };
      stations.push(s);
    }

    // Reset indexes
    this.stations = stations;
    this.codeIndex.clear();
    this.cityIndex.clear();
    this.nameIndex.clear();
    this.aliasIndex.clear();
    this.cache.clear();

    // Build indexes
    for (const s of stations) {
      this.codeIndex.set(s.code, s);

      const nCity = normalizeStr(s.city || s.name); // fall back to name if no city
      if (!this.cityIndex.has(nCity)) this.cityIndex.set(nCity, []);
      this.cityIndex.get(nCity).push(s);

      const nName = normalizeStr(s.name);
      if (!this.nameIndex.has(nName)) this.nameIndex.set(nName, []);
      this.nameIndex.get(nName).push(s);

      const aliasSet = new Set([s.code, s.name, ...(s.aliases || [])]);
      for (const a of aliasSet) {
        const na = normalizeStr(a);
        if (!na) continue;
        if (!this.aliasIndex.has(na)) this.aliasIndex.set(na, []);
        this.aliasIndex.get(na).push(s);
      }
    }

    this.loaded = true;
  }

  // -------------------------- Core Lookups ---------------------------

  /** Direct code lookup (fast path). */
  getByCode(code) {
    if (!code) return null;
    return this.codeIndex.get(String(code).toUpperCase().trim()) || null;
  }

  /** Stations by city (normalized). */
  getByCity(city, { includeNearby = false } = {}) {
    if (!city) return [];
    const key = `city:${city}:${includeNearby}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    const nc = normalizeStr(city);
    let arr = this.cityIndex.get(nc) || [];

    // Optional heuristic: if city not found, try aliasIndex (e.g., "Bombay" → Mumbai)
    if (!arr.length) {
      const viaAlias = this.aliasIndex.get(nc);
      if (viaAlias) {
        arr = viaAlias.filter(s => normalizeStr(s.city) === nc);
      }
    }

    // includeNearby hook could be implemented with a city->geo map; omitted for simplicity.
    this.cache.set(key, arr);
    return arr;
  }

  /** Stations matching a free-text query (name/code/alias), with fuzzy fallback. */
  search(query, { max = DEFAULT_MAX_SUGGESTIONS, fuzzy = true } = {}) {
    if (!query) return [];
    const key = `search:${query}:${max}:${fuzzy}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const nq = normalizeStr(query);

    // Exact/alias hits first
    const direct = new Map();
    const exactList = this.aliasIndex.get(nq) || [];
    for (const s of exactList) direct.set(s.code, s);

    // If not enough, expand to fuzzy on names & aliases
    let candidates = Array.from(direct.values());
    if (fuzzy && candidates.length < max) {
      // Build a simple fuzzy list across unique stations
      const considered = new Set();
      for (const [aliasNorm, stations] of this.aliasIndex.entries()) {
        const dist = levenshtein(nq, aliasNorm, 2);
        if (dist <= 2) {
          for (const s of stations) {
            if (!considered.has(s.code)) {
              considered.add(s.code);
              candidates.push(s);
              if (candidates.length >= max) break;
            }
          }
        }
        if (candidates.length >= max) break;
      }
    }

    // Deduplicate and score
    const scored = scoreStations(query, candidates).slice(0, max);
    this.cache.set(key, scored);
    return scored;
  }

  /** Geo-nearest stations within radiusKm (if lat/lon available). */
  nearest(lat, lon, { radiusKm = 50, limit = DEFAULT_MAX_RESULTS } = {}) {
    const key = `near:${lat}:${lon}:${radiusKm}:${limit}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const withDist = [];
    for (const s of this.stations) {
      if (typeof s.lat !== 'number' || typeof s.lon !== 'number') continue;
      const d = haversineKm(lat, lon, s.lat, s.lon);
      if (d <= radiusKm) {
        withDist.push({ station: s, distanceKm: d });
      }
    }
    withDist.sort((a, b) => a.distanceKm - b.distanceKm);
    const out = withDist.slice(0, limit).map(x => ({
      ...x.station,
      distanceKm: Math.round(x.distanceKm * 10) / 10
    }));
    this.cache.set(key, out);
    return out;
  }
}

// --------------------------- Scoring Logic ----------------------------

function scoreStations(query, stations) {
  const nq = normalizeStr(query);
  const scored = [];
  for (const s of stations) {
    let score = 0;

    // Exact code/name boosts
    if (normalizeStr(s.code) === nq) score += 100;
    if (normalizeStr(s.name) === nq) score += 80;

    // Alias proximity
    const aliasMatches = (s.aliases || []).map(a => normalizeStr(a));
    if (aliasMatches.includes(nq)) score += 60;

    // City proximity (e.g., searching "Mumbai" should lift Mumbai stations)
    if (normalizeStr(s.city) === nq) score += 40;

    // Heuristic: isMajor gets a healthy boost
    if (s.isMajor) score += 20;

    // Small fuzzy bonus based on edit distance to station name
    const nameDist = levenshtein(nq, normalizeStr(s.name), 2);
    if (nameDist === 0) score += 30;
    else if (nameDist === 1) score += 15;
    else if (nameDist === 2) score += 8;

    scored.push({ ...s, _score: score });
  }
  scored.sort((a, b) => b._score - a._score);
  return scored;
}

// ------------------------------ API -----------------------------------

const indexer = new StationIndexer();
// Load sample by default; for production use loadStationsFromPath in your bootstrap.
indexer.loadStations(SAMPLE_STATIONS);

/**
 * Map a city (or common city alias) to the best station code.
 * Options: { preferMajor: true, fallbackToName: true }
 */
function mapCityToStationCode(city, opts = {}) {
  const { preferMajor = true, fallbackToName = true } = opts;
  if (!city) return null;

  // First, try direct city matches
  const cityStations = indexer.getByCity(city);
  if (cityStations.length) {
    const picked = pickBest(cityStations, { preferMajor });
    return picked?.code || null;
  }

  // Next, try free-text search (aliases/fuzzy)
  const hits = indexer.search(city, { max: 5, fuzzy: true });
  if (hits.length) {
    const picked = pickBest(hits, { preferMajor });
    return picked?.code || null;
  }

  // Fallback: treat input as station name
  if (fallbackToName) {
    const byName = indexer.search(city, { max: 1, fuzzy: true });
    return byName[0]?.code || null;
  }

  return null;
}

/**
 * Convert any user input (code/name/city/alias) into a station code.
 */
function toStationCode(input, opts = {}) {
  if (!input) return null;
  const asCode = indexer.getByCode(input);
  if (asCode) return asCode.code;

  // Direct alias/name search
  const hits = indexer.search(input, { max: 1, fuzzy: true });
  return hits[0]?.code || null;
}

/** Get station object by code. */
function getStationByCode(code) {
  return indexer.getByCode(code);
}

/** All stations for a city (sorted by major first). */
function findStationsByCity(city) {
  const arr = indexer.getByCity(city);
  return arr.sort((a, b) => Number(b.isMajor) - Number(a.isMajor));
}

/** Suggest stations for a query (code/name/alias), scored & limited. */
function suggestStations(query, max = DEFAULT_MAX_SUGGESTIONS) {
  return indexer.search(query, { max, fuzzy: true });
}

/** Nearest stations within radius from coordinates. */
function nearestStations(lat, lon, opts = {}) {
  return indexer.nearest(lat, lon, opts);
}

function pickBest(stations, { preferMajor = true } = {}) {
  if (!stations || !stations.length) return null;
  // Prefer majors; tie-breaker by name length (heuristic = terminals/junctions often longer)
  const sorted = stations
    .map(s => ({ s, k: (preferMajor && s.isMajor ? 1 : 0), len: (s.name || '').length }))
    .sort((a, b) => (b.k - a.k) || (b.len - a.len));
  return sorted[0].s;
}

// --------------------------- Exported API ------------------------------

module.exports = {
  // Bootstrap controls
  loadStationsFromPath: (filePath) => indexer.loadStationsFromPath(filePath),
  loadStations: (dataArray) => indexer.loadStations(dataArray),

  // Core mappings
  mapCityToStationCode,
  toStationCode,
  getStationByCode,
  findStationsByCity,
  suggestStations,
  nearestStations,

  // Expose internals for diagnostics/testing (optional)
  __indexer: indexer
};
