#!/usr/bin/env node
'use strict';

const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const cfg = require('./config.stations');

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function loadRailCodes(fp) {
  const raw = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const out = [];

  const codeKeys = ['code', 'value', 'station_code', 'stn_code', 'stationCode'];
  const nameKeys = ['name', 'label', 'station_name', 'stationName', 'stn_name'];

  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;

    let code = codeKeys.map(k => r[k]).find(v => v);
    let name = nameKeys.map(k => r[k]).find(v => v);

    if (!code || !name) continue;

    code = String(code).toUpperCase().trim();
    name = String(name).trim();

    if (/^[A-Z]{2,5}\s*-\s*/.test(name)) {
      name = name.replace(/^[A-Z]{2,5}\s*-\s*/, '').trim();
    }

    out.push({ code, name });
  }
  return out;
}

function loadDatameet(fp) {
  const gj = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const feats = Array.isArray(gj.features) ? gj.features : [];
  const byCode = new Map();
  const byNameNorm = new Map();

  for (const f of feats) {
    const p = f.properties || {};
    const g = f.geometry || {};
    if (!g || g.type !== 'Point' || !Array.isArray(g.coordinates)) continue;
    const [lon, lat] = g.coordinates;

    const code = (p.code || p.stn_code || p.station_code || '').toUpperCase().trim();
    const name = p.name || p.station_name || '';
    const city = p.city || p.town || p.district || '';
    const state = p.state || p.state_name || '';

    const rec = { code, name, city, state, lat: Number(lat), lon: Number(lon) };

    if (code) byCode.set(code, rec);
    if (name) {
      const key = norm(name);
      if (!byNameNorm.has(key)) byNameNorm.set(key, []);
      byNameNorm.get(key).push(rec);
    }
  }
  return { byCode, byNameNorm };
}

function titleCase(s) {
  return String(s || '')
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(w => w[0] ? (w[0].toUpperCase() + w.slice(1)) : w)
    .join(' ');
}

function makeAliases(code, name, thesaurus) {
  const aliases = new Set([code, name, titleCase(name)]);
  const n = name.toLowerCase();

  if (n.includes('junction')) aliases.add(name.replace(/junction/i, 'Jn'));
  if (/\bjn\b/i.test(n)) aliases.add(name.replace(/\bjn\b/i, 'Junction'));
  if (/\bterminus\b/i.test(n)) aliases.add(name.replace(/\bterminus\b/i, 'Terminal'));
  if (/\bterminal\b/i.test(n)) aliases.add(name.replace(/\bterminal\b/i, 'Terminus'));

  for (const [canon, vars] of Object.entries(thesaurus)) {
    for (const v of vars) {
      const re = new RegExp(`\\b${v}\\b`, 'i');
      if (re.test(name)) {
        aliases.add(name.replace(re, canon));
      }
    }
  }
  return Array.from(aliases);
}

function withinIndia(lat, lon) {
  const b = cfg.indiaBounds;
  return lat >= b.minLat && lat <= b.maxLat && lon >= b.minLon && lon <= b.maxLon;
}

function merge() {
  const railCodes = loadRailCodes(cfg.paths.railCodes);
  const geo = loadDatameet(cfg.paths.datameetGeo);

  const byCode = new Map();
  const report = {
    counts: { railCodes: railCodes.length, geoStations: geo.byCode.size },
    merged: 0,
    unmatchedRailCodes: [],
    coordsSourcedByName: 0,
    droppedOutsideIndia: 0
  };

  for (const { code, name } of railCodes) {
    let geoRec = geo.byCode.get(code);

    if (!geoRec) {
      const matches = geo.byNameNorm.get(norm(name)) || [];
      if (matches.length) {
        geoRec = matches[0];
        report.coordsSourcedByName++;
      }
    }

    const lat = geoRec?.lat ?? null;
    const lon = geoRec?.lon ?? null;
    const city = geoRec?.city || '';
    const state = geoRec?.state || '';

    if (lat != null && lon != null && !withinIndia(lat, lon)) {
      report.droppedOutsideIndia++;
      continue;
    }

    const isMajor = cfg.majorStations.includes(code);
    const aliases = makeAliases(code, name, cfg.aliasThesaurus);

    const merged = {
      code,
      name,
      city,
      state,
      lat,
      lon,
      isMajor,
      aliases
    };

    byCode.set(code, merged);
    report.merged++;
  }

  // collect codes we couldn’t locate in geo
  for (const { code } of railCodes) {
    if (!byCode.has(code)) report.unmatchedRailCodes.push(code);
  }

  // final array
  const out = Array.from(byCode.values()).sort((a, b) => a.code.localeCompare(b.code));

  // ensure output dir
  fse.ensureDirSync(path.dirname(cfg.paths.outJson));
  fs.writeFileSync(cfg.paths.outJson, JSON.stringify(out, null, 2));
  fs.writeFileSync(cfg.paths.outReport, JSON.stringify(report, null, 2));

  console.log(`✔ merged ${out.length} stations → ${cfg.paths.outJson}`);
  console.log(`ℹ report → ${cfg.paths.outReport}`);
}

merge();
