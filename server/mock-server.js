import express from 'express';
import cors from 'cors';
import { networkInterfaces } from 'os';

const app = express();

// Configure CORS
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'HEAD', 'OPTIONS'],
  credentials: true
}));

// Add request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Helper to generate random points
function generatePoints(count, source) {
  const minLat = 8.4, maxLat = 37.6, minLng = 68.7, maxLng = 97.25;
  const points = Array.from({ length: count }).map(() => ({
    lat: +(minLat + Math.random() * (maxLat - minLat)).toFixed(6),
    lng: +(minLng + Math.random() * (maxLng - minLng)).toFixed(6),
    value: +(Math.random().toFixed(3)),
    source,
  }));
  console.log(`Generated ${points.length} points for ${source}`);
  return points;
}

// Water quality (default heatpoints)
app.get('/api/heatpoints', (req, res) => {
  const count = Number(req.query.count) || 500;
  console.log(`Requested ${count} heatpoints`);
  res.json(generatePoints(count, 'water'));
});

// OpenAQ (air quality)
app.get('/api/external/openaq', (req, res) => {
  const count = Number(req.query.limit) || 300;
  res.json(generatePoints(count, 'openaq'));
});

// EONET (fires)
app.get('/api/external/eonet-fires', (req, res) => {
  const count = 200;
  res.json(generatePoints(count, 'eonet'));
});

// USGS (earthquakes)
app.get('/api/external/usgs-quakes', (req, res) => {
  const count = 150;
  res.json(generatePoints(count, 'usgs'));
});

// Vegetation (NDVI-like points)
app.get('/api/external/vegetation', (req, res) => {
  const count = Number(req.query.count) || 400;
  res.json(generatePoints(count, 'vegetation'));
});

// Climate (temperature-like points)
app.get('/api/external/climate', (req, res) => {
  const count = Number(req.query.count) || 400;
  res.json(generatePoints(count, 'climate'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start the server
const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n=== Mock Server Running ===`);
  console.log(`Local:   http://localhost:${PORT}`);
  console.log(`=========================\n`);
});
