// server.js - Ultra-simple version for Vercel
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Mock housing data
const mockHousingData = [
  {
    name: 'Verve New Brunswick',
    address: '88 Easton Avenue, New Brunswick, NJ 08901',
    phone: '(862) 244-1479',
    images: [],
    prices: ['Contact for pricing'],
    amenities: ['Gym', 'Study Rooms', 'Gaming Lounge'],
    coordinates: [40.4862, -74.4518],
    walkingTime: '1 min walk',
    bedrooms: 'Studio-5 BR',
    source: 'verve'
  },
  {
    name: 'The Standard at New Brunswick',
    address: '90 New Street, New Brunswick, NJ 08901',
    phone: '(732) 247-0500',
    images: [],
    prices: ['$749-$1,200'],
    amenities: ['Fitness Center', 'Study Spaces', 'Rooftop'],
    coordinates: [40.4851, -74.4489],
    walkingTime: '4 min walk',
    bedrooms: 'Studio-5 BR',
    source: 'standard'
  }
];

// API Routes
app.get('/api/properties', (req, res) => {
  res.json({
    properties: mockHousingData,
    lastScrapeTime: new Date().toISOString(),
    totalCount: mockHousingData.length
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    propertiesCount: mockHousingData.length
  });
});

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'RU Housing API is running!' });
});

module.exports = app;
