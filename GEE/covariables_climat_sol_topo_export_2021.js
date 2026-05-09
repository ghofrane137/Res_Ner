// ══════════════════════════════════════════════════════
// PART 2 — Covariables environnementales (VERSION CORRIGÉE)
// Climat TEMPOREL : 36 périodes × 3 bandes = 108 bandes
// Sol et Topo : STATIQUES (inchangés)
// ══════════════════════════════════════════════════════

// ── ZONES ────────────────────────────────────────────
var ar_north  = ee.Geometry.Rectangle([-91.8, 34.3, -91.3, 34.7]);
var ar_south  = ee.Geometry.Rectangle([-91.0, 34.3, -90.5, 34.7]);
var cal_north = ee.Geometry.Rectangle([-122.1, 39.1, -121.8, 39.35]);
var cal_south = ee.Geometry.Rectangle([-120.3, 36.8, -120.0, 37.05]);

// ══════════════════════════════════════════════════════
// 1. CLIMAT TEMPOREL — ERA5-Land Daily
// Même agrégation 10 jours que Sentinel-2 → 36 timesteps
// 3 bandes par timestep : temp, precip, dewpoint
// Résultat : 36 × 3 = 108 bandes dans le GeoTIFF
// ══════════════════════════════════════════════════════

var era5 = ee.ImageCollection('ECMWF/ERA5_LAND/DAILY_AGGR')
  .filterDate('2021-01-01', '2021-12-31')
  .select([
    'temperature_2m',
    'total_precipitation_sum',
    'dewpoint_temperature_2m'
  ]);

// Générer les 36 périodes de 10 jours (même logique que Sentinel-2)
var periodes = [];
for (var i = 0; i < 36; i++) {
  var debut = ee.Date('2021-01-01').advance(i * 10, 'day');
  var fin   = debut.advance(10, 'day');

  var periode_img = era5
    .filterDate(debut, fin)
    .mean()  // moyenne sur les ~10 jours de la période
    .rename([
      'temp_t'    + String(i + 1),
      'precip_t'  + String(i + 1),
      'dewpoint_t'+ String(i + 1)
    ]);

  periodes.push(periode_img);
}

// Empiler toutes les périodes en une seule image multi-bandes (108 bandes)
var climate = periodes[0];
for (var j = 1; j < 36; j++) {
  climate = climate.addBands(periodes[j]);
}

// Vérification : doit afficher 108 bandes
print('Climate bandes (doit être 108) :', climate.bandNames().size());
print('Premières bandes :', climate.bandNames().slice(0, 6));
// → ["temp_t1", "precip_t1", "dewpoint_t1", "temp_t2", ...]

// ══════════════════════════════════════════════════════
// 2. SOL — OpenLandMap (statique, inchangé)
// 3 bandes : ph, organic_carbon, texture
// ══════════════════════════════════════════════════════
var soil_ph      = ee.Image('OpenLandMap/SOL/SOL_PH-H2O_USDA-4C1A2A_M/v02')
  .select(['b0']).rename(['ph']);
var soil_oc      = ee.Image('OpenLandMap/SOL/SOL_ORGANIC-CARBON_USDA-6A1C_M/v02')
  .select(['b0']).rename(['organic_carbon']);
var soil_texture = ee.Image('OpenLandMap/SOL/SOL_TEXTURE-CLASS_USDA-TT_M/v02')
  .select(['b0']).rename(['texture']);
var soil = soil_ph.addBands(soil_oc).addBands(soil_texture);

print('Soil bandes :', soil.bandNames());  // → ["ph", "organic_carbon", "texture"]

// ══════════════════════════════════════════════════════
// 3. TOPOGRAPHIE (statique, inchangé)
// 2 bandes : elevation, landforms
// ══════════════════════════════════════════════════════
var elevation = ee.Image('NOAA/NGDC/ETOPO1')
  .select(['bedrock']).rename(['elevation']);
var landforms = ee.Image('CSP/ERGo/1_0/Global/ALOS_landforms')
  .select(['constant']).rename(['landforms']);
var topo = elevation.addBands(landforms);

print('Topo bandes :', topo.bandNames());  // → ["elevation", "landforms"]

// ══════════════════════════════════════════════════════
// VÉRIFICATION VISUELLE
// ══════════════════════════════════════════════════════
Map.addLayer(ar_north,  {color: 'blue'},   'AR Nord');
Map.addLayer(ar_south,  {color: 'cyan'},   'AR Sud');
Map.addLayer(cal_north, {color: 'red'},    'CAL Nord');
Map.addLayer(cal_south, {color: 'orange'}, 'CAL Sud');

// Visualiser la temp de la 1ère période
Map.addLayer(
  climate.select('temp_t1').clip(ar_north),
  {min: 270, max: 290, palette: ['blue', 'yellow', 'red']},
  'Temp t1 - AR Nord'
);
Map.centerObject(ar_north, 7);

// ══════════════════════════════════════════════════════
// EXPORTS — 4 zones × 3 types = 12 fichiers GeoTIFF
//
// Tailles attendues des GeoTIFF :
//   climate_*.tif → 108 bandes (36 périodes × 3 variables)
//   soil_*.tif    →   3 bandes (statique)
//   topo_*.tif    →   2 bandes (statique)
// ══════════════════════════════════════════════════════
var zoneNames = [
  'arkansas_north',
  'arkansas_south',
  'california_north',
  'california_south'
];
var zoneGeoms = [ar_north, ar_south, cal_north, cal_south];

for (var i = 0; i < zoneNames.length; i++) {
  var name   = zoneNames[i];
  var region = zoneGeoms[i];

  // Export Climate TEMPOREL (108 bandes)
  Export.image.toDrive({
    image      : climate.clip(region).toFloat(),
    description: 'climate_' + name,
    folder     : 'MCTNet_final',
    region     : region,
    scale      : 30,
    maxPixels  : 1e10,
    fileFormat : 'GeoTIFF'
  });

  // Export Soil (3 bandes, statique)
  Export.image.toDrive({
    image      : soil.clip(region).toFloat(),
    description: 'soil_' + name,
    folder     : 'MCTNet_final',
    region     : region,
    scale      : 30,
    maxPixels  : 1e10,
    fileFormat : 'GeoTIFF'
  });

  // Export Topo (2 bandes, statique)
  Export.image.toDrive({
    image      : topo.clip(region).toFloat(),
    description: 'topo_' + name,
    folder     : 'MCTNet_final',
    region     : region,
    scale      : 30,
    maxPixels  : 1e10,
    fileFormat : 'GeoTIFF'
  });
}

print('✅ 12 exports lancés !');
print('   climate_*.tif → 108 bandes (36 × 3)');
print('   soil_*.tif    →   3 bandes (statique)');
print('   topo_*.tif    →   2 bandes (statique)');