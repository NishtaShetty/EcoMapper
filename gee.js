//India boundary
var indiaFC = ee.FeatureCollection("FAO/GAUL/2015/level0")
  .filter(ee.Filter.eq('ADM0_NAME', 'India'));
var indiaGeom = indiaFC.geometry();
Map.centerObject(indiaFC, 5);
Map.addLayer(indiaFC, {}, "India Boundary");

//Bioclim (WorldClim v1)
var bio = ee.Image("WORLDCLIM/V1/BIO");
var bio1  = bio.select("bio01").clip(indiaGeom);   // Annual Mean Temperature
var bio12 = bio.select("bio12").clip(indiaGeom);   // Annual Mean Precipitation
Map.addLayer(bio1,  {min:240, max:310}, "BIO1 Mean Temp");
Map.addLayer(bio12, {min:0,   max:4000}, "BIO12 Annual Precip");

//Elevation (SRTM)
var elev = ee.Image("USGS/SRTMGL1_003").clip(indiaGeom);
Map.addLayer(elev, {min:0, max:3000}, "Elevation");

//Soil pH, Soil organic carbon, Clay
var soilPH = ee.Image("projects/soilgrids-isric/phh2o_mean")
               .select("phh2o_0-5cm_mean").clip(indiaGeom);
var soc    = ee.Image("projects/soilgrids-isric/soc_mean")
               .select("soc_0-5cm_mean").clip(indiaGeom);
var clay   = ee.Image("projects/soilgrids-isric/clay_mean")
               .select("clay_0-5cm_mean").clip(indiaGeom);
Map.addLayer(soilPH, {min:4, max:8.5}, "Soil pH (0–5 cm)");
Map.addLayer(soc,    {min:0, max:30},  "Soil Organic C (0–5 cm)");
Map.addLayer(clay,   {min:0, max:60},  "Clay % (0–5 cm)");

//Land cover (MODIS MCD12Q1 IGBP)
var lc = ee.ImageCollection("MODIS/006/MCD12Q1")
  .filterDate('2020-01-01', '2021-01-01')
  .first()
  .select('LC_Type1')
  .clip(indiaGeom)
  .toInt();
Map.addLayer(lc, {}, "Land Cover (IGBP)");

//Occurrence data
var occurrences = ee.FeatureCollection("projects/project_name/assets/species_name");
var presencePoints = occurrences.map(function(f){ return f.set('presence', 1); });

//Random background (pseudo-absence)
var absencePoints = ee.FeatureCollection.randomPoints({
  region: indiaGeom, points: 3000, seed: 42
}).map(function(f){ return f.set('presence', 0); });

Map.addLayer(presencePoints, {color:'yellow'}, 'Presence Points');
Map.addLayer(absencePoints,  {color:'purple'}, 'Absence Points');

//Predictor stack (align + mask)
lc   = lc.resample('bilinear');
var predictors = bio1.rename('bio01')
  .addBands(bio12.rename('bio12'))
  .addBands(elev.rename('elevation'))
  .addBands(soilPH.rename('phh2o_0_5cm'))
  .addBands(soc.rename('soc_0_5cm'))
  .addBands(clay.rename('clay_0_5cm'))
  .addBands(lc.rename('landcover'));

var commonMask = predictors.bandNames().iterate(function(b, m){
  m = ee.Image(m);
  b = ee.String(b);
  return m.and(predictors.select([b]).mask());
}, ee.Image(1));
predictors = predictors.updateMask(ee.Image(commonMask));

var allPoints = presencePoints.merge(absencePoints);
var samples = predictors.sampleRegions({
  collection: allPoints,
  properties: ['presence'],
  scale: 250,
  geometries: false
});

//Class imbalance handling
var pos = samples.filter(ee.Filter.eq('presence', 1));
var neg = samples.filter(ee.Filter.eq('presence', 0));
var posCount = pos.size();
var negBalanced = neg.randomColumn('r', 13).sort('r').limit(posCount);
var balancedSamples = pos.merge(negBalanced);
print('Counts (pos, negBalanced):', posCount, negBalanced.size());

//Split into train and validation
var split = 0.7;
var withRandom = balancedSamples.randomColumn('rand', 99);
var trainingSamples   = withRandom.filter(ee.Filter.lt('rand', split));
var validationSamples = withRandom.filter(ee.Filter.gte('rand', split));

//Train Random Forest model
var inputBands = ['bio01','bio12','elevation','phh2o_0_5cm','soc_0_5cm','clay_0_5cm','landcover'];
var classifier = ee.Classifier.smileRandomForest({
  numberOfTrees: 150,
  minLeafPopulation: 5,
  bagFraction: 0.7
}).setOutputMode('PROBABILITY').train({
  features: trainingSamples,
  classProperty: 'presence',
  inputProperties: inputBands
});

//Feature importance
print('Feature importance:', classifier.explain().get('importance'));

//Dynamic threshold selection
var validationWithProb = validationSamples.classify(classifier);
var thresholds = ee.List.sequence(0.1, 0.9, 0.05);
var youdenFC = ee.FeatureCollection(thresholds.map(function(th){
  th = ee.Number(th);
  var pred = validationWithProb.map(function(f){
    var prob = ee.Number(f.get('classification'));
    return f.set('predicted', prob.gt(th));
  });
  var cm = pred.errorMatrix('presence', 'predicted');
  var cmArr = ee.Array(cm.array());
  var TP = cmArr.get([1,1]);
  var TN = cmArr.get([0,0]);
  var FP = cmArr.get([0,1]);
  var FN = cmArr.get([1,0]);
  var sens = ee.Number(TP).divide(ee.Number(TP).add(FN));
  var spec = ee.Number(TN).divide(ee.Number(TN).add(FP));
  var youden = sens.add(spec).subtract(1);
  return ee.Feature(null, {threshold: th, youden: youden});
}));

var bestThreshold = youdenFC.sort('youden', false).first().getNumber('threshold');
print('Optimal Threshold (Youden):', bestThreshold);

//Evaluation at optimal threshold
var validated = validationWithProb.map(function(f){
  var prob = ee.Number(f.get('classification'));
  return f.set('predicted', prob.gt(bestThreshold));
});
var cm = validated.errorMatrix('presence', 'predicted');
print('Confusion Matrix:', cm);
print('Accuracy:', cm.accuracy());
print('Kappa:', cm.kappa());
var cmArr = ee.Array(cm.array());
var TP = cmArr.get([1,1]);
var TN = cmArr.get([0,0]);
var FP = cmArr.get([0,1]);
var FN = cmArr.get([1,0]);
var precision   = TP.divide(TP.add(FP));
var recall      = TP.divide(TP.add(FN));
var specificity = TN.divide(TN.add(FP));
var f1 = precision.multiply(recall).multiply(2).divide(precision.add(recall));
print('Precision:', precision);
print('Recall (Sensitivity):', recall);
print('Specificity:', specificity);
print('F1 Score:', f1);

//Predict suitability map
var probImage = predictors.classify(classifier).clip(indiaGeom);
var suitability = probImage.gt(bestThreshold).rename('suitability');
Map.addLayer(probImage, {min:0, max:1, palette:['white','blue']}, 'Probability');
Map.addLayer(suitability, {min:0, max:1, palette:['red','green']}, 'Suitability (>thr)'); //final map layer that is actually exported

//Export tiles
var indiaBounds = indiaGeom.bounds();
function splitRegion(region, rows, cols) {
  var coords = ee.List(region.coordinates().get(0));
  var xmin = ee.Number(ee.List(coords.get(0)).get(0));
  var ymin = ee.Number(ee.List(coords.get(0)).get(1));
  var xmax = ee.Number(ee.List(coords.get(2)).get(0));
  var ymax = ee.Number(ee.List(coords.get(2)).get(1));
  var dx = xmax.subtract(xmin).divide(cols);
  var dy = ymax.subtract(ymin).divide(rows);
  var boxes = [];
  for (var i = 0; i < rows; i++) {
    for (var j = 0; j < cols; j++) {
      var x0 = xmin.add(dx.multiply(j));
      var y0 = ymin.add(dy.multiply(i));
      var x1 = x0.add(dx);
      var y1 = y0.add(dy);
      boxes.push(ee.Geometry.Rectangle([x0, y0, x1, y1]));
    }
  }
  return boxes;
}
var gridBoxes = splitRegion(indiaBounds, 3, 3);
gridBoxes.forEach(function(box, idx){
  Export.image.toDrive({
    image: suitability.clip(box),
    description: 'Suitability_Tile_' + idx,
    folder: 'folder_name',
    scale: 250,
    region: box,
    maxPixels: 1e13
  });
});
print('Created', gridBoxes.length, 'tiles for export');