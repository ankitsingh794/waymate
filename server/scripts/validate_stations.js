#!/usr/bin/env node
'use strict';

const fs = require('fs');
const cfg = require('./config.stations');

function validate() {
  const raw = JSON.parse(fs.readFileSync(cfg.paths.outJson, 'utf8'));
  const seen = new Set();
  const errors = [];
  const warn = [];

  for (const s of raw) {
    // unique code
    if (seen.has(s.code)) errors.push(`Duplicate code: ${s.code}`);
    seen.add(s.code);

    // basic schema
    if (!s.name) errors.push(`Missing name for ${s.code}`);

    // lat/lon sanity (allow nulls but warn)
    if (s.lat == null || s.lon == null) {
      warn.push(`No coords for ${s.code} ${s.name}`);
    } else {
      const { minLat, maxLat, minLon, maxLon } = cfg.indiaBounds;
      if (s.lat < minLat || s.lat > maxLat || s.lon < minLon || s.lon > maxLon) {
        errors.push(`Coords out of India for ${s.code} (${s.lat}, ${s.lon})`);
      }
    }

    // aliases sanity
    if (!Array.isArray(s.aliases) || s.aliases.length === 0) {
      warn.push(`No aliases for ${s.code}`);
    }
  }

  console.log(`records: ${raw.length}`);
  if (errors.length) {
    console.error(`❌ errors (${errors.length}):`);
    errors.slice(0, 50).forEach(e => console.error(' -', e));
    process.exitCode = 1;
  } else {
    console.log('✔ no critical errors');
  }
  if (warn.length) {
    console.warn(`⚠ warnings (${warn.length}): showing up to 30`);
    warn.slice(0, 30).forEach(w => console.warn(' -', w));
  }
}

validate();
