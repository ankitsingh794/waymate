module.exports = {
  paths: {
    railCodes: 'server/Data/raw/rail_codes.json',
    datameetGeo: 'server/Data/raw/datameet_stations.json',
    outJson: 'server/Data/processed/stations.json',
    outReport: 'server/Data/processed/stations_report.json'
  },

  // mark major hubs for ranking; extend as needed
  majorStations: [
    'NDLS','DLI','NZM','HWH','SDAH','KOAA','SHM','CSMT','CSTM','BCT','LTT',
    'MAS','SBC','SC','HYB','ADI','BPL','ET','BSB','LKO','CNB','BBS','ERS',
    'TVC','PNBE','RNC','JAT','ASR','AGC','GWL','RTM','UJJ','GKP','DBG','GHY'
  ],

  // normalize common suffixes/aliases
  aliasThesaurus: {
    junction: ['junction','jn','jn.'],
    terminus: ['terminus','tms','terminal','term'],
    jn: ['jn','junction'],
    road: ['rd','road'],
    fort: ['ft','fort'],
    city: ['ct','city']
  },

  // bounding box of india (rough) for sanity checks
  indiaBounds: { minLat: 6, maxLat: 37.3, minLon: 68, maxLon: 97.5 }
};
