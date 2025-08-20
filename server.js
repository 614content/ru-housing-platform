// server.js - Backend API for RU Housing Platform
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// In-memory storage (use database in production)
let housingData = [];
let lastScrapeTime = null;

// Property websites to scrape
const SCRAPING_TARGETS = {
  verve: {
    url: 'https://vervenb.com',
    name: 'Verve New Brunswick',
    address: '88 Easton Avenue, New Brunswick, NJ 08901',
    phone: '(862) 244-1479'
  },
  standard: {
    url: 'https://thestandardnewbrunswick.landmark-properties.com',
    name: 'The Standard at New Brunswick', 
    address: '90 New Street, New Brunswick, NJ 08901',
    phone: '(732) 247-0500'
  },
  ruliving: {
    url: 'https://ruliving.com',
    name: 'RU Living',
    address: '12 Bartlett Street, New Brunswick, NJ 08901',
    phone: '(732) 317-8313'
  },
  brunswicksh: {
    url: 'https://www.brunswickstudenthousing.com',
    name: 'Brunswick Student Housing',
    address: 'Various Hamilton St Properties, New Brunswick, NJ',
    phone: '(732) 545-7368'
  }
};

// Scraping functions
async function scrapePropertyWebsite(target) {
  try {
    console.log(`Scraping ${target.name}...`);
    
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // Set user agent to avoid blocking
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    await page.goto(target.url, { waitUntil: 'networkidle2' });
    
    // Extract property data
    const propertyData = await page.evaluate((targetInfo) => {
      const images = [];
      const prices = [];
      const amenities = [];
      
      // Look for images
      const imgElements = document.querySelectorAll('img[src*="jpg"], img[src*="jpeg"], img[src*="png"], img[src*="webp"]');
      imgElements.forEach(img => {
        if (img.src && (img.src.includes('apartment') || img.src.includes('exterior') || img.src.includes('interior'))) {
          images.push(img.src);
        }
      });
      
      // Look for pricing information
      const priceElements = document.querySelectorAll('*');
      priceElements.forEach(el => {
        const text = el.textContent || '';
        const priceMatch = text.match(/\$[\d,]+/g);
        if (priceMatch) {
          prices.push(...priceMatch);
        }
      });
      
      // Look for amenities
      const amenityKeywords = ['gym', 'fitness', 'pool', 'parking', 'laundry', 'wifi', 'study', 'rooftop'];
      const textContent = document.body.textContent.toLowerCase();
      amenityKeywords.forEach(keyword => {
        if (textContent.includes(keyword)) {
          amenities.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
        }
      });
      
      return {
        name: targetInfo.name,
        address: targetInfo.address,
        phone: targetInfo.phone,
        images: images.slice(0, 5), // First 5 images
        prices: [...new Set(prices)].slice(0, 3), // Unique prices
        amenities: [...new Set(amenities)].slice(0, 8), // Unique amenities
        scrapedAt: new Date().toISOString()
      };
    }, target);
    
    await browser.close();
    
    return propertyData;
    
  } catch (error) {
    console.error(`Error scraping ${target.name}:`, error.message);
    return {
      name: target.name,
      address: target.address,
      phone: target.phone,
      images: [],
      prices: ['Contact for pricing'],
      amenities: [],
      error: error.message
    };
  }
}

// Scrape Zillow for additional listings
async function scrapeZillow() {
  try {
    console.log('Scraping Zillow...');
    
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Search for rentals near Rutgers
    const zillowUrl = 'https://www.zillow.com/new-brunswick-nj/rentals/?searchQueryState=%7B%22pagination%22%3A%7B%7D%2C%22mapBounds%22%3A%7B%22west%22%3A-74.47%2C%22east%22%3A-74.43%2C%22south%22%3A40.48%2C%22north%22%3A40.50%7D%7D';
    
    await page.goto(zillowUrl, { waitUntil: 'networkidle2' });
    
    const listings = await page.evaluate(() => {
      const propertyCards = document.querySelectorAll('[data-testid="property-card"]');
      const results = [];
      
      propertyCards.forEach(card => {
        const addressEl = card.querySelector('[data-testid="property-card-addr"]');
        const priceEl = card.querySelector('[data-testid="property-card-price"]');
        const imgEl = card.querySelector('img');
        const detailsEl = card.querySelector('[data-testid="property-card-details"]');
        
        if (addressEl && priceEl) {
          results.push({
            address: addressEl.textContent.trim(),
            price: priceEl.textContent.trim(),
            image: imgEl ? imgEl.src : null,
            details: detailsEl ? detailsEl.textContent.trim() : '',
            source: 'Zillow'
          });
        }
      });
      
      return results.slice(0, 10); // First 10 listings
    });
    
    await browser.close();
    return listings;
    
  } catch (error) {
    console.error('Error scraping Zillow:', error.message);
    return [];
  }
}

// Calculate walking distance
function calculateWalkingTime(lat, lng) {
  const campusLat = 40.4866;
  const campusLng = -74.4507;
  
  const latDiff = Math.abs(lat - campusLat);
  const lngDiff = Math.abs(lng - campusLng);
  const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
  
  const minutes = Math.max(1, Math.round(distance * 2000));
  return `${minutes} min walk`;
}

// Main scraping function
async function performFullScrape() {
  console.log('Starting comprehensive property scraping...');
  
  const scrapedData = [];
  
  // Scrape major property websites
  for (const [key, target] of Object.entries(SCRAPING_TARGETS)) {
    const data = await scrapePropertyWebsite(target);
    
    // Add coordinates and walking time
    const coords = getPropertyCoordinates(data.address);
    data.coordinates = coords;
    data.walkingTime = calculateWalkingTime(coords[0], coords[1]);
    data.bedrooms = extractBedroomInfo(data.name);
    data.source = key;
    
    scrapedData.push(data);
  }
  
  // Scrape Zillow for additional listings
  const zillowListings = await scrapeZillow();
  zillowListings.forEach(listing => {
    const coords = getPropertyCoordinates(listing.address);
    scrapedData.push({
      name: `Property - ${listing.address.split(',')[0]}`,
      address: listing.address,
      phone: 'Contact via Zillow',
      images: listing.image ? [listing.image] : [],
      prices: [listing.price],
      amenities: extractAmenities(listing.details),
      coordinates: coords,
      walkingTime: calculateWalkingTime(coords[0], coords[1]),
      bedrooms: extractBedroomInfo(listing.details),
      source: 'Zillow'
    });
  });
  
  housingData = scrapedData;
  lastScrapeTime = new Date();
  
  console.log(`Scraping complete! Found ${scrapedData.length} properties`);
  return scrapedData;
}

// Helper functions
function getPropertyCoordinates(address) {
  // Simple coordinate mapping (in production, use Google Maps API)
  const coordinateMap = {
    'Easton Avenue': [40.4862, -74.4518],
    'New Street': [40.4851, -74.4489],
    'Bartlett Street': [40.4868, -74.4505],
    'Hamilton Street': [40.4883, -74.4534],
    'College Avenue': [40.4866, -74.4507]
  };
  
  for (const [street, coords] of Object.entries(coordinateMap)) {
    if (address.includes(street)) {
      return coords;
    }
  }
  
  // Default coordinates with slight variation
  return [40.4866 + (Math.random() - 0.5) * 0.01, -74.4507 + (Math.random() - 0.5) * 0.01];
}

function extractBedroomInfo(text) {
  const match = text.match(/(\d+)\s*br|\bstudio\b|(\d+)\s*bedroom/i);
  if (match) {
    if (match[0].toLowerCase().includes('studio')) return 'Studio';
    const num = match[1] || match[2];
    return `${num} BR`;
  }
  return '1-4 BR';
}

function extractAmenities(text) {
  const amenityKeywords = ['gym', 'fitness', 'pool', 'parking', 'laundry', 'wifi', 'study', 'rooftop'];
  const found = [];
  const lowerText = text.toLowerCase();
  
  amenityKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      found.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
    }
  });
  
  return found.length > 0 ? found : ['Contact for details'];
}

// API Routes
app.get('/api/properties', (req, res) => {
  res.json({
    properties: housingData,
    lastScrapeTime: lastScrapeTime,
    totalCount: housingData.length
  });
});

app.get('/api/scrape', async (req, res) => {
  try {
    const data = await performFullScrape();
    res.json({
      success: true,
      message: `Successfully scraped ${data.length} properties`,
      data: data,
      scrapedAt: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/property/:id', (req, res) => {
  const property = housingData.find(p => p.source === req.params.id);
  if (property) {
    res.json(property);
  } else {
    res.status(404).json({ error: 'Property not found' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    lastScrape: lastScrapeTime,
    propertiesCount: housingData.length,
    uptime: process.uptime()
  });
});

// Schedule automatic scraping every 24 hours
cron.schedule('0 6 * * *', async () => {
  console.log('Running scheduled scraping...');
  await performFullScrape();
});

// Initial scrape on startup
performFullScrape();

app.listen(PORT, () => {
  console.log(`🚀 RU Housing API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🏠 Properties: http://localhost:${PORT}/api/properties`);
});
