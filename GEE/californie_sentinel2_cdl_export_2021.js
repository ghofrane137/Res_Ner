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

// Zones validées
var cal_north = ee.Geometry.Rectangle([-122.1, 39.1, -121.8, 39.35]);
var cal_south = ee.Geometry.Rectangle([-120.3, 36.8, -120.0, 37.05]);

Map.addLayer(cal_north, {color:'blue'}, 'Carlifornie Nord ');
Map.addLayer(cal_south, {color:'red'},  'Carlifornie Sud ');

var col_north = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(cal_north).filterDate('2021-01-01', '2021-12-31');

var col_south = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(cal_south).filterDate('2021-01-01', '2021-12-31');

// Export Sentinel-2 Nord
Export.image.toDrive({
  image      : ee.ImageCollection(composite(col_north)).toBands(),
  description: 'sentinel2_california_north_2021',
  folder     : 'MCTNet_final',
  region     : cal_north, scale: 30, maxPixels: 1e10, fileFormat: 'GeoTIFF'
});

// Export CDL Nord
Export.image.toDrive({
  image      : cdl_raw.select([0]).unmask(0).toUint8().clip(cal_north).rename(['b1']),
  description: 'cdl_california_north_2021',
  folder     : 'MCTNet_final',
  region     : cal_north, scale: 30, maxPixels: 1e10, fileFormat: 'GeoTIFF'
});

// Export Sentinel-2 Sud
Export.image.toDrive({
  image      : ee.ImageCollection(composite(col_south)).toBands(),
  description: 'sentinel2_california_south_2021',
  folder     : 'MCTNet_final',
  region     : cal_south, scale: 30, maxPixels: 1e10, fileFormat: 'GeoTIFF'
});

// Export CDL Sud
Export.image.toDrive({
  image      : cdl_raw.select([0]).unmask(0).toUint8().clip(cal_south).rename(['b1']),
  description: 'cdl_california_south_2021',
  folder     : 'MCTNet_final',
  region     : cal_south, scale: 30, maxPixels: 1e10, fileFormat: 'GeoTIFF'
});