// server.js - Basic version without Puppeteer (deploy this first)
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Mock housing data (will replace with real scraping later)
const mockHousingData = [
  {
    name: 'Verve New Brunswick',
    address: '88 Easton Avenue, New Brunswick, NJ 08901',
    phone: '(862) 244-1479',
    images: ['https://example.com/verve1.jpg'],
    prices: ['Contact for pricing'],
    amenities: ['Gym', 'Study Rooms', 'Gaming Lounge', 'Roof Deck'],
    coordinates: [40.4862, -74.4518],
    walkingTime: '1 min walk',
    bedrooms: 'Studio-5 BR',
    source: 'verve',
    scrapedAt: new Date().toISOString()
  },
  {
    name: 'The Standard at New Brunswick',
    address: '90 New Street, New Brunswick, NJ 08901',
    phone: '(732) 247-0500',
    images: ['https://example.com/standard1.jpg'],
    prices: ['$749-$1,200'],
    amenities: ['Fitness Center', 'Study Spaces', 'Rooftop Lounge', 'Business Center'],
    coordinates: [40.4851, -74.4489],
    walkingTime: '4 min walk',
    bedrooms: 'Studio-5 BR',
    source: 'standard',
    scrapedAt: new Date().toISOString()
  },
  {
    name: 'RU Living - Bartlett Street',
    address: '12 Bartlett Street, New Brunswick, NJ 08901',
    phone: '(732) 317-8313',
    images: ['https://example.com/ruliving1.jpg'],
    prices: ['$650-$900'],
    amenities: ['Utility Management', '24/7 Maintenance', 'Parking', 'WiFi'],
    coordinates: [40.4868, -74.4505],
    walkingTime: '2 min walk',
    bedrooms: '1-4 BR',
    source: 'ruliving',
    scrapedAt: new Date().toISOString()
  },
  {
    name: 'Brunswick Student Housing',
    address: 'Hamilton Street Properties, New Brunswick, NJ',
    phone: '(732) 545-7368',
    images: ['https://example.com/bsh1.jpg'],
    prices: ['$500-$750'],
    amenities: ['Gigabit WiFi', 'Parking', 'Pet Friendly', 'Security Cameras'],
    coordinates: [40.4892, -74.4456],
    walkingTime: '8 min walk',
    bedrooms: '2-6 BR',
    source: 'brunswicksh',
    scrapedAt: new Date().toISOString()
  },
  {
    name: 'Tverdov Housing - Richardson St',
    address: '45 Richardson Street, New Brunswick, NJ',
    phone: '(732) 344-0701',
    images: ['https://example.com/tverdov1.jpg'],
    prices: ['$600-$850'],
    amenities: ['Multiple Locations', 'Parking', 'Well Maintained', 'Close to Campus'],
    coordinates: [40.4874, -74.4523],
    walkingTime: '5 min walk',
    bedrooms: '3-5 BR',
    source: 'tverdov',
    scrapedAt: new Date().toISOString()
  }
];

// API Routes
app.get('/api/properties', (req, res) => {
  res.json({
    properties: mockHousingData,
    lastScrapeTime: new Date().toISOString(),
    totalCount: mockHousingData.length,
    message: 'Mock data - real scraping coming soon!'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'Basic server running - ready for scraping upgrade',
    propertiesCount: mockHousingData.length,
    uptime: process.uptime()
  });
});

app.get('/api/property/:id', (req, res) => {
  const property = mockHousingData.find(p => p.source === req.params.id);
  if (property) {
    res.json(property);
  } else {
    res.status(404).json({ error: 'Property not found' });
  }
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 RU Housing API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🏠 Properties: http://localhost:${PORT}/api/properties`);
});
