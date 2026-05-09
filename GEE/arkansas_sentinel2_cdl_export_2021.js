var bands = ['B2','B3','B4','B5','B6','B7','B8','B8A','B11','B12'];
var empty = ee.Image.constant([0,0,0,0,0,0,0,0,0,0]).rename(bands).toFloat();
var cdl_raw = ee.Image('USDA/NASS/CDL/2021');

function composite(col) {
  return ee.List.sequence(0, 35).map(function(i) {
    var start = ee.Date('2021-01-01').advance(ee.Number(i).multiply(10), 'day');
    var end   = start.advance(10, 'day');
    var sub   = col.filterDate(start, end).select(bands);
    return ee.Algorithms.If(sub.size().gt(0), sub.median().toFloat(), empty);
  });
}

// Zones Arkansas
var ar_north = ee.Geometry.Rectangle([-91.8, 34.3, -91.3, 34.7]);
var ar_south = ee.Geometry.Rectangle([-91.0, 34.3, -90.5, 34.7]);

Map.addLayer(ar_north, {color:'blue'}, 'Arkansas Nord');
Map.addLayer(ar_south, {color:'red'},  'Arkansas Sud');

var col_north = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(ar_north).filterDate('2021-01-01', '2021-12-31');
var col_south = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(ar_south).filterDate('2021-01-01', '2021-12-31');

// Export Sentinel-2 Nord
Export.image.toDrive({
  image      : ee.ImageCollection(composite(col_north)).toBands(),
  description: 'sentinel2_arkansas_north_2021',
  folder     : 'MCTNet_final',
  region     : ar_north, scale: 30, maxPixels: 1e10, fileFormat: 'GeoTIFF'
});

// Export CDL Nord
Export.image.toDrive({
  image      : cdl_raw.select([0]).unmask(0).toUint8().clip(ar_north).rename(['b1']),
  description: 'cdl_arkansas_north_2021',
  folder     : 'MCTNet_final',
  region     : ar_north, scale: 30, maxPixels: 1e10, fileFormat: 'GeoTIFF'
});

// Export Sentinel-2 Sud
Export.image.toDrive({
  image      : ee.ImageCollection(composite(col_south)).toBands(),
  description: 'sentinel2_arkansas_south_2021',
  folder     : 'MCTNet_final',
  region     : ar_south, scale: 30, maxPixels: 1e10, fileFormat: 'GeoTIFF'
});

// Export CDL Sud
Export.image.toDrive({
  image      : cdl_raw.select([0]).unmask(0).toUint8().clip(ar_south).rename(['b1']),
  description: 'cdl_arkansas_south_2021',
  folder     : 'MCTNet_final',
  region     : ar_south, scale: 30, maxPixels: 1e10, fileFormat: 'GeoTIFF'
});