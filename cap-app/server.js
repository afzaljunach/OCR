// Load environment variables from .env file in development
try {
  require('dotenv').config();
  console.log('Environment variables loaded from .env file');
} catch (err) {
  console.warn('Warning: dotenv package not found, environment variables must be set manually');
}

// Handle Cloud Foundry VCAP_SERVICES in production
if (process.env.VCAP_SERVICES) {
  try {
    const xsenv = require('@sap/xsenv');
    const services = xsenv.getServices({
      aicore: { label: 'user-provided', name: 'aicore-credentials' },
      database: { label: 'hana-cloud', tag: 'database' }
    });
    
    if (services.aicore) {
      process.env.AI_CORE_AUTH_URL = services.aicore.auth_url;
      process.env.AI_CORE_CLIENT_ID = services.aicore.client_id;
      process.env.AI_CORE_CLIENT_SECRET = services.aicore.client_secret;
      process.env.AI_CORE_DEPLOYMENT_URL = services.aicore.deployment_url;
      process.env.AI_CORE_RESOURCE_GROUP = services.aicore.resource_group || 'default';
      console.log('AI Core credentials loaded from VCAP_SERVICES');
    }
    
    if (services.database) {
      process.env.DB_KIND = 'hana';
      process.env.DB_HOST = services.database.host;
      process.env.DB_PORT = services.database.port;
      process.env.DB_USER = services.database.user;
      process.env.DB_PASSWORD = services.database.password;
      process.env.DB_DATABASE = services.database.database;
      console.log('Database credentials loaded from VCAP_SERVICES');
    }
    
    console.log('Successfully loaded VCAP_SERVICES environment');
  } catch (err) {
    console.warn('Error loading VCAP_SERVICES:', err.message);
  }
}

const cds = require('@sap/cds');
const express = require('express');
const path = require('path');
const fs = require('fs');

// Bootstrap express app
const app = express();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static content from app directory
app.use(express.static(path.join(__dirname, 'app')));

// Bootstrap CAP
cds.on('bootstrap', (app) => {
  console.log('CDS app bootstrapped');
});

// Add proper error handling for CDS
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server
const port = process.env.PORT || 4004;

// Load configuration based on environment
const cdsConfig = process.env.NODE_ENV === 'production' 
  ? require('./production-config') 
  : undefined;

// Connect to database with retry mechanism
const connectWithRetry = async (attempts = 5, delay = 2000) => {
  try {
    await cds.connect('db');
    console.log('Database connected successfully');
    return true;
  } catch (err) {
    if (attempts <= 1) {
      console.error('Database connection failed after retries:', err);
      return false;
    }
    console.warn(`Database connection failed. Retrying in ${delay}ms... (${attempts-1} attempts left)`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return connectWithRetry(attempts - 1, delay);
  }
};

connectWithRetry().then(connected => {
  if (!connected) {
    console.error('Failed to connect to database after multiple attempts. Server will start anyway.');
  }
  
  cds.serve(cdsConfig).then(() => {
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
      console.log(`- Static UI: http://localhost:${port}/index.html`);
      console.log(`- Simple UI5: http://localhost:${port}/simple-ui5.html`);
      console.log(`- Test Page: http://localhost:${port}/test.html`);
      console.log(`- OData Service: http://localhost:${port}/odata/v4/document/`);
    });
  }).catch(err => {
    console.error('Failed to start CDS server:', err);
    process.exit(1);
  });
});