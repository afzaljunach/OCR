# Deploying Document Information Extractor to SAP BTP

This guide provides step-by-step instructions for deploying the Document Information Extractor application to SAP Business Technology Platform (BTP) using the Cloud Foundry environment.

## Prerequisites

1. **SAP BTP Account** with:
   - Cloud Foundry environment enabled
   - Entitlement for SAP AI Core services
   - Entitlement for SAP HANA Cloud or SAP HANA Cloud, SAP HANA Database (recommended for production)

2. **Tools**:
   - [Cloud Foundry CLI](https://github.com/cloudfoundry/cli/wiki/V8-CLI-Installation-Guide)
   - [Node.js](https://nodejs.org/) (version 14.x or higher)
   - Git
   
3. **SAP AI Core**:
   - Configured and deployed Claude 3.5 model
   - Client credentials (Client ID and Client Secret)

## Step 1: Login to Cloud Foundry

```bash
# Login to your Cloud Foundry environment
cf login -a <API-ENDPOINT> -o <ORG> -s <SPACE>

# Example
# cf login -a https://api.cf.eu10.hana.ondemand.com -o my-org -s dev
```

## Step 2: Create Required Services

### Create User-Provided Service for AI Core Credentials

```bash
cf create-user-provided-service aicore-credentials -p '{"auth_url":"https://subdomainaicore.authentication.eu10.hana.ondemand.com/oauth/token","client_id":"your-client-id","client_secret":"your-client-secret","deployment_url":"https://api.ai.prod.eu-central-1.aws.ml.hana.ondemand.com/v2/inference/deployments/your-deployment-id"}'
```

### Create SAP HANA Service Instance (Production Environment)

For persistence in a production environment, create an SAP HANA instance:

```bash
cf create-service hana-cloud hana document-extractor-db
```

## Step 3: Prepare Your Application for Deployment

### Update package.json

Ensure your package.json includes the correct SAP BTP dependencies and scripts. Add:

```json
"engines": {
  "node": ">=14.x"
},
"cds": {
  "requires": {
    "db": {
      "kind": "sql"
    }
  }
}
```

### Create Production Config

Create a file called `production-config.js` in the project root:

```javascript
module.exports = {
  db: {
    kind: process.env.DB_KIND || "sqlite",
    model: ["db/schema", "srv/service"],
    credentials: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE || "sqlite.db"
    }
  }
};
```

### Update Application for Cloud Environment

For production deployment, add this code to your server.js or express-server.js file:

```javascript
// Add this at the beginning of your server file
const xsenv = require('@sap/xsenv');

// Only attempt to load VCAP services in cloud environment
if (process.env.VCAP_SERVICES) {
  try {
    const services = xsenv.getServices({
      aicore: { label: 'user-provided', name: 'aicore-credentials' },
      database: { label: 'hana-cloud', tag: 'database' }
    });
    
    if (services.aicore) {
      process.env.AI_CORE_AUTH_URL = services.aicore.auth_url;
      process.env.AI_CORE_CLIENT_ID = services.aicore.client_id;
      process.env.AI_CORE_CLIENT_SECRET = services.aicore.client_secret;
      process.env.AI_CORE_DEPLOYMENT_URL = services.aicore.deployment_url;
    }
    
    if (services.database) {
      process.env.DB_KIND = 'hana';
      process.env.DB_HOST = services.database.host;
      process.env.DB_PORT = services.database.port;
      process.env.DB_USER = services.database.user;
      process.env.DB_PASSWORD = services.database.password;
      process.env.DB_DATABASE = services.database.database;
    }
    
    console.log('Successfully loaded VCAP_SERVICES environment');
  } catch (err) {
    console.warn('Error loading VCAP_SERVICES:', err.message);
  }
}
```

### Check Dependencies

Ensure these dependencies are in your package.json:

```json
"dependencies": {
  "@sap/cds": "^7",
  "@sap/xsenv": "^3.4.0",
  "@sap/hana-client": "^2.15.19", 
  "express": "^4"
}
```

Run `npm install @sap/xsenv @sap/hana-client` to add the required BTP-specific packages.

## Step 4: Build and Deploy

### Build for Production

```bash
# Install dependencies
npm install

# Optional: Run build step if needed
npm run build
```

### Push to Cloud Foundry

```bash
# Deploy to Cloud Foundry
cf push
```

### Bind Service Instances

```bash
# Bind the services to your application
cf bind-service document-extractor aicore-credentials
cf bind-service document-extractor document-extractor-db

# Restart the application to apply changes
cf restart document-extractor
```

## Step 5: Test Your Deployment

1. Get the application URL:
   ```bash
   cf apps
   ```

2. Open the application URL in your browser, adding the path `/app/simple-ui5.html`:
   ```
   https://document-extractor.cfapps.eu10.hana.ondemand.com/app/simple-ui5.html
   ```

## Troubleshooting

### View Application Logs

```bash
# View recent logs
cf logs document-extractor --recent

# Stream live logs
cf logs document-extractor
```

### Check Service Bindings

```bash
cf services
```

### Scale the Application

If you need more memory or instances:

```bash
# Scale memory
cf scale document-extractor -m 512M

# Scale instances
cf scale document-extractor -i 2
```

## Additional Configuration

### Environment Variables

You can set additional environment variables using:

```bash
cf set-env document-extractor AI_CORE_RESOURCE_GROUP your-resource-group
cf restart document-extractor
```

### Configure CI/CD Pipeline

For automated deployments, you can use SAP Continuous Integration and Delivery service:

1. Configure a CI/CD pipeline in your SAP BTP cockpit
2. Connect to your Git repository
3. Configure build and deployment stages

## Customizing for Production

For a production environment, consider:

1. Securing your application with proper authorization
2. Configuring logging and monitoring
3. Setting up proper database backup procedures
4. Using a custom domain with SSL certificates

## Next Steps

1. Configure application router for user authentication
2. Set up roles and authorizations
3. Connect to S/4HANA for real purchase order creation
4. Implement proper error handling and monitoring