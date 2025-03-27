# Document Information Extractor

A Cloud Application Programming (CAP) application that uses SAP AI Core with Claude 3.5 to extract information from documents (PDF, JPEG, PNG) and optionally create purchase orders in S/4HANA. The application features confidence indicators for extracted fields and a feedback mechanism to continually improve extraction quality through Retrieval-Augmented Generation (RAG).

## Features

- Upload documents (PDF, JPEG, PNG)
- Extract structured information using AI Core with Claude 3.5
- Visual confidence indicators for extraction quality
- User feedback collection to improve extraction
- Retrieval-Augmented Generation (RAG) for improved extraction accuracy
- View and edit extracted information
- Create purchase orders in S/4HANA (mock integration)
- Editable fields for all extracted information
- Automatic calculation of line item amounts and totals
- Validation of data before creating purchase orders

## Architecture

This application follows a two-tier architecture:

1. **Backend**: SAP Cloud Application Programming (CAP) with Express.js fallback
2. **Frontend**: SAPUI5/Fiori-based user interface

The application has two server options:
- Standard CAP server using `cds run` (requires CAP CLI)
- Express.js server fallback for environments without CAP CLI

## Prerequisites

- Node.js 14+
- SAP AI Core account with Claude 3.5 deployment
- SAP Cloud Application Programming (CAP) CLI (optional)

## Configuration

Configuration is managed through environment variables or a `.env` file:

```
AI_CORE_AUTH_URL=https://your-ai-core-authentication-url/oauth/token
AI_CORE_CLIENT_ID=your-client-id
AI_CORE_CLIENT_SECRET=your-client-secret
AI_CORE_DEPLOYMENT_URL=https://your-ai-core-deployment-url
AI_CORE_RESOURCE_GROUP=default
```

Copy the `.env.example` file to `.env` and update it with your credentials.

## Running the Application Locally

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your SAP AI Core credentials (see Configuration section)

### Running with CAP CLI (Recommended)

If you have the CAP CLI installed:

```bash
# Start the application in development mode with auto-reload
npm run dev

# Start the application in normal mode
npm run start

# Start with debugging enabled
npm run debug
```

### Running without CAP CLI (Fallback)

If you don't have the CAP CLI or prefer Express:

```bash
# Run the Express.js server
npm run express

# Alternatively, use the server.js implementation
npm run server
```

### Accessing the Application

Once running, the application is available at:

- Main UI: http://localhost:4004/app/simple-ui5.html
- Feedback Debug: http://localhost:4004/app/feedback-debug.html
- Simple UI: http://localhost:4004/app/index.html
- Test page: http://localhost:4004/app/test.html
- OData Service: http://localhost:4004/odata/v4/document/

## Deploying to SAP BTP Cloud Foundry

### Prerequisites

1. **SAP BTP Account** with:
   - Cloud Foundry environment enabled
   - Entitlement for SAP AI Core services
   - Entitlement for SAP HANA Cloud (recommended for production)

2. **Tools**:
   - [Cloud Foundry CLI](https://github.com/cloudfoundry/cli/wiki/V8-CLI-Installation-Guide)
   - Git

### Deployment Steps

#### 1. Login to Cloud Foundry

```bash
# Login to your Cloud Foundry environment
cf login -a <API-ENDPOINT> -o <ORG> -s <SPACE>

# Example
# cf login -a https://api.cf.eu10.hana.ondemand.com -o my-org -s dev
```

#### 2. Create Required Services

First, create a user-provided service for AI Core credentials:

```bash
cf create-user-provided-service aicore-credentials -p '{"auth_url":"https://your-auth-url.com","client_id":"your-client-id","client_secret":"your-secret","deployment_url":"your-deployment-url"}'
```

Then, create an SAP HANA service instance (for production):

```bash
cf create-service hana-cloud hana document-extractor-db
```

#### 3. Deploy the Application

Push the application to Cloud Foundry:

```bash
cf push
```

#### 4. Bind Services to Application

Bind the services to your application:

```bash
# Bind the AI Core credentials service
cf bind-service document-extractor aicore-credentials

# Bind the HANA database service
cf bind-service document-extractor document-extractor-db

# Restart the application to apply changes
cf restart document-extractor
```

#### 5. Access Your Application

Get the application URL:

```bash
cf apps
```

Open the application URL in your browser, adding the path `/app/simple-ui5.html`:
```
https://document-extractor.cfapps.eu10.hana.ondemand.com/app/simple-ui5.html
```

### Troubleshooting Deployment

#### View Application Logs

```bash
# View recent logs
cf logs document-extractor --recent

# Stream live logs
cf logs document-extractor
```

#### Check Service Bindings

```bash
cf services
```

#### Scale the Application

If you need more memory or instances:

```bash
# Scale memory
cf scale document-extractor -m 512M

# Scale instances
cf scale document-extractor -i 2
```

## Database Schema

The application uses the following entities:
- `Documents`: Core entity containing document information
- `VendorInformation`: Vendor details extracted from documents
- `CustomerInformation`: Customer details extracted from documents
- `LineItems`: Line items extracted from documents
- `PaymentInformation`: Payment terms and details

## Development

### Project Structure

- `/app` - Frontend UI files and static resources
- `/db` - Database schema definitions
- `/srv` - Service implementations
- `/express-server.js` - Express.js server implementation (fallback)
- `/server.js` - Alternative server implementation
- `/uploads` - Directory for uploaded documents
- `/feedback` - Directory for stored user feedback (created at runtime)
- `/RAG_IMPLEMENTATION.md` - Guide for implementing Chroma DB for the RAG system

### Adding New Fields

1. Update the database schema in `/db/schema.cds`
2. Update the service in `/srv/document-service.cds`
3. Update the extraction prompt in `aiCoreClient.extractDocumentInfo`
4. Add the new fields to the UI in `simple-ui5.html`

### Customizing the AI Prompt

The prompt sent to Claude 3.5 can be modified in:
- `/srv/document-service.js` for the CAP service
- `/express-server.js` for the Express fallback server

## Feedback and RAG System

The application includes a feedback collection system that allows users to:

1. Provide comments on extraction quality
2. Mark problematic fields (Document Type, Document Number, Date, etc.)
3. Suggest improved extraction prompts

This feedback is stored in the `/feedback` directory as JSON files and is used to enhance future extractions through Retrieval-Augmented Generation (RAG). The system:

1. Analyzes document type during extraction
2. Finds relevant historical feedback for similar document types
3. Enhances the extraction prompt with previous user feedback
4. Improves extraction accuracy over time

### ChromaDB Integration

The application includes a simple ChromaDB integration for vector-based similarity search:

- Mock ChromaDB implementation is included for development
- The system will attempt to use ChromaDB for similarity search
- Falls back to keyword-based matching if ChromaDB is not available

#### Current Implementation:

- `chroma-db.js`: A mock implementation of ChromaDB interface
- Feedback is stored both in JSON files and in the ChromaDB mock
- The system tries ChromaDB first, then falls back to file-based search
- ChromaDB can be initialized via `/admin/init-chromadb` endpoint

#### Upgrading to Full Vector Search:

For better performance and more advanced retrieval capabilities, install the full ChromaDB package:

```bash
npm install chromadb
```

Then update the `chroma-db.js` file based on the implementation in `RAG_IMPLEMENTATION.md`.

The full ChromaDB implementation will enable:
- Semantic similarity search (not just keyword matching)
- Better performance with larger feedback datasets
- More relevant prompt enhancements

## Advanced Deployment Options

For more detailed deployment instructions, including CI/CD pipelines, custom domains, and other advanced topics, see the `DEPLOY_TO_BTP.md` file in this repository.

## License

This project is licensed under the UNLICENSED license.