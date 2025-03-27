// Load environment variables from .env file in development
try {
  require('dotenv').config();
  console.log('Environment variables loaded from .env file');
  // Print environment variables for debugging
  console.log('AI_CORE_AUTH_URL is ' + (process.env.AI_CORE_AUTH_URL ? 'set' : 'not set'));
  console.log('AI_CORE_CLIENT_ID is ' + (process.env.AI_CORE_CLIENT_ID ? 'set' : 'not set'));
  console.log('AI_CORE_CLIENT_SECRET is ' + (process.env.AI_CORE_CLIENT_SECRET ? 'set' : 'not set'));
  console.log('AI_CORE_DEPLOYMENT_URL is ' + (process.env.AI_CORE_DEPLOYMENT_URL ? 'set' : 'not set'));
  console.log('AI_CORE_RESOURCE_GROUP is ' + (process.env.AI_CORE_RESOURCE_GROUP ? 'set' : 'not set'));
} catch (err) {
  console.warn('Warning: dotenv package not found, environment variables must be set manually');
  console.error('Error loading .env:', err);
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

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const FormData = require('form-data');

// Create Express app
const app = express();
const port = process.env.PORT || 4004;

// Create required directories if they don't exist
const uploadsDir = path.join(__dirname, 'uploads');
const feedbackDir = path.join(__dirname, 'feedback');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`Created uploads directory: ${uploadsDir}`);
}

if (!fs.existsSync(feedbackDir)) {
  fs.mkdirSync(feedbackDir, { recursive: true });
  console.log(`Created feedback directory: ${feedbackDir}`);
}

// Load AI Core configuration
const aiCoreConfig = {
  auth_url: process.env.AI_CORE_AUTH_URL || "https://subdomainaicore.authentication.eu10.hana.ondemand.com/oauth/token",
  client_id: process.env.AI_CORE_CLIENT_ID || "sb-b8a7ae41-2697-4aa8-b7e0-77a0db961376!b537485|aicore!b540",
  client_secret: process.env.AI_CORE_CLIENT_SECRET,
  deployment_url: process.env.AI_CORE_DEPLOYMENT_URL || "https://api.ai.prod.eu-central-1.aws.ml.hana.ondemand.com/v2/inference/deployments/d429c1c3626932c4",
  resource_group: process.env.AI_CORE_RESOURCE_GROUP || "default"
};

// Check for crucial environment variables
if (!aiCoreConfig.client_secret) {
  console.warn('WARNING: AI_CORE_CLIENT_SECRET environment variable is not set. AI Core integration will not work.');
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      console.log('Multer destination called:', uploadsDir);
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      console.log('Multer filename called for file:', file.originalname);
      const documentId = uuidv4();
      const extname = path.extname(file.originalname);
      const fileName = `document_${documentId}${extname}`;
      
      console.log('Generated documentId:', documentId);
      console.log('File extension:', extname);
      console.log('Generated filename:', fileName);
      
      // Attach values to the request
      req.documentId = documentId;
      req.fileName = fileName;
      
      cb(null, fileName);
    }
  }),
  fileFilter: (req, file, cb) => {
    console.log('Multer fileFilter called');
    console.log('File information:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      encoding: file.encoding,
      mimetype: file.mimetype
    });
    
    // Check file types - more flexible validation
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
    
    // Check by mimetype first
    if (allowedMimeTypes.includes(file.mimetype)) {
      console.log(`File accepted: MIME type ${file.mimetype} is allowed`);
      return cb(null, true);
    }
    
    // If mimetype check fails, try checking by file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      console.log(`File accepted: Extension ${ext} is allowed (despite MIME type ${file.mimetype})`);
      return cb(null, true);
    }
    
    console.log(`File rejected: mimetype=${file.mimetype}, filename=${file.originalname}`);
    console.log(`Allowed MIME types: ${allowedMimeTypes.join(', ')}`);
    console.log(`Allowed extensions: ${allowedExtensions.join(', ')}`);
    
    return cb(new Error(`Only PDF, JPEG, and PNG files are allowed. Got mimetype: ${file.mimetype}`), false);
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Feedback utility functions
const feedbackUtils = {
  // Get the feedback directory path
  getFeedbackDir() {
    return path.join(__dirname, 'feedback');
  },
  
  // Get the feedback index file path
  getFeedbackIndexPath() {
    return path.join(this.getFeedbackDir(), 'feedback_index.json');
  },
  
  // Load the feedback index
  async loadFeedbackIndex() {
    const indexPath = this.getFeedbackIndexPath();
    
    try {
      if (fs.existsSync(indexPath)) {
        const indexData = await fs.promises.readFile(indexPath, 'utf8');
        return JSON.parse(indexData);
      } else {
        return [];
      }
    } catch (error) {
      console.error('Error loading feedback index:', error.message);
      return [];
    }
  },
  
  // Find relevant feedback for a given document type
  async findRelevantFeedback(documentType) {
    try {
      // First try to use ChromaDB for vector-based similarity search
      try {
        console.log('Attempting to find similar documents in ChromaDB for type:', documentType);
        const chromaResults = await chromaDBService.findSimilarDocuments(documentType);
        
        // Check if we got any results
        if (chromaResults.ids && chromaResults.ids[0] && chromaResults.ids[0].length > 0) {
          console.log(`Found ${chromaResults.ids[0].length} relevant feedback entries in ChromaDB`);
          
          // Convert ChromaDB results to the format expected by the rest of the system
          const relevantFeedback = [];
          
          // Process results and create feedback entries
          for (let i = 0; i < chromaResults.ids[0].length; i++) {
            const feedbackId = chromaResults.ids[0][i];
            const metadata = chromaResults.metadatas[0][i];
            
            // Load the full feedback content
            const feedbackContent = await this.loadFeedbackContent(feedbackId);
            
            if (feedbackContent) {
              relevantFeedback.push({
                feedbackId,
                documentId: metadata.documentId || feedbackContent.documentId,
                timestamp: metadata.timestamp || new Date().toISOString(),
                documentType: metadata.documentType || feedbackContent.extractionData?.document_type,
                hasComments: !!feedbackContent.comments,
                hasCustomPrompt: !!feedbackContent.customPrompt,
                problemFields: feedbackContent.problemFields || []
              });
            }
          }
          
          // If we found relevant feedback, return it
          if (relevantFeedback.length > 0) {
            return relevantFeedback;
          }
        }
      } catch (error) {
        console.warn('Error with ChromaDB search, falling back to file-based search:', error.message);
        // Continue to fallback mechanism
      }
      
      // Fall back to traditional file-based search
      console.log('Using file-based search as fallback');
      return this.findRelevantFeedbackFromFiles(documentType);
    } catch (error) {
      console.error('Error finding relevant feedback:', error.message);
      return [];
    }
  },
  
  // Fallback method using file-based search with keyword matching
  async findRelevantFeedbackFromFiles(documentType) {
    try {
      const feedbackIndex = await this.loadFeedbackIndex();
      
      if (!feedbackIndex.length) {
        return [];
      }
      
      // Simple keyword-based matching
      const normalizedDocType = documentType.toLowerCase().trim();
      
      const relevantFeedback = feedbackIndex.filter(entry => {
        if (!entry.documentType) return false;
        
        // Check for exact match or partial match based on keywords
        const entryDocType = entry.documentType.toLowerCase().trim();
        return entryDocType === normalizedDocType || 
               entryDocType.includes(normalizedDocType) || 
               normalizedDocType.includes(entryDocType);
      });
      
      // Only return feedback that has comments or custom prompts
      const usefulFeedback = relevantFeedback.filter(entry => 
        entry.hasComments || entry.hasCustomPrompt
      );
      
      // Limit to the 5 most recent entries
      return usefulFeedback.slice(-5);
    } catch (error) {
      console.error('Error finding relevant feedback from files:', error.message);
      return [];
    }
  },
  
  // Load the full feedback content for a given feedback ID
  async loadFeedbackContent(feedbackId) {
    try {
      const feedbackDir = this.getFeedbackDir();
      
      // Find the feedback file
      const files = await fs.promises.readdir(feedbackDir);
      const feedbackFile = files.find(file => file.includes(feedbackId) && file.endsWith('.json'));
      
      if (!feedbackFile) {
        throw new Error(`Feedback file not found for ID ${feedbackId}`);
      }
      
      const feedbackPath = path.join(feedbackDir, feedbackFile);
      const feedbackData = await fs.promises.readFile(feedbackPath, 'utf8');
      return JSON.parse(feedbackData);
    } catch (error) {
      console.error('Error loading feedback content:', error.message);
      return null;
    }
  },
  
  // Generate an enhanced prompt based on previous feedback
  async generateEnhancedPrompt(basePrompt, documentType) {
    try {
      // Find relevant feedback
      const relevantFeedback = await this.findRelevantFeedback(documentType);
      
      if (!relevantFeedback.length) {
        return basePrompt; // No relevant feedback, return the base prompt
      }
      
      console.log(`Found ${relevantFeedback.length} relevant feedback entries for document type: ${documentType}`);
      
      // Load the full feedback contents
      const feedbackContents = await Promise.all(
        relevantFeedback.map(entry => this.loadFeedbackContent(entry.feedbackId))
      );
      
      // Extract useful information from the feedback
      const enhancementSuggestions = [];
      
      for (const feedback of feedbackContents.filter(Boolean)) {
        if (feedback.customPrompt) {
          enhancementSuggestions.push(`Consider this alternative extraction approach: ${feedback.customPrompt}`);
        }
        
        if (feedback.comments) {
          enhancementSuggestions.push(`Previous feedback noted: "${feedback.comments}"`);
        }
        
        if (feedback.problemFields && feedback.problemFields.length) {
          enhancementSuggestions.push(`Pay special attention to these fields that had previous extraction issues: ${feedback.problemFields.join(', ')}`);
        }
      }
      
      // If we have suggestions, add them to the prompt
      if (enhancementSuggestions.length) {
        const enhancementText = `
        
        PREVIOUS FEEDBACK TO INCORPORATE:
        ${enhancementSuggestions.map(s => `- ${s}`).join('\n')}
        
        Please use the above feedback to improve your extraction quality.
        `;
        
        return basePrompt + enhancementText;
      }
      
      return basePrompt;
    } catch (error) {
      console.error('Error generating enhanced prompt:', error.message);
      return basePrompt; // Return the original prompt on error
    }
  }
};

// AI Core client integration
const aiCoreClient = {
  async getToken(config) {
    try {
      if (!config.client_secret) {
        throw new Error('AI Core client secret is not configured');
      }
      
      const response = await axios.post(config.auth_url, 
        new URLSearchParams({
          'grant_type': 'client_credentials',
          'client_id': config.client_id,
          'client_secret': config.client_secret
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      return response.data.access_token;
    } catch (error) {
      console.error('Error getting token:', error.message);
      throw new Error('Authentication failed');
    }
  },
  
  async processDocument(filePath, config) {
    try {
      // Get token
      const token = await this.getToken(config);
      
      // Read file
      const fileContent = await fs.promises.readFile(filePath);
      const fileBase64 = fileContent.toString('base64');
      
      // Determine mime type based on file extension
      const ext = path.extname(filePath).toLowerCase();
      let mimeType = 'application/octet-stream';
      if (ext === '.pdf') {
        mimeType = 'application/pdf';
      } else if (ext === '.jpg' || ext === '.jpeg') {
        mimeType = 'image/jpeg';
      } else if (ext === '.png') {
        mimeType = 'image/png';
      }
      
      console.log(`Processing file ${filePath} with MIME type: ${mimeType}`);
      
      // Create base prompt
      const basePrompt = `
      I have a business document that appears to be an invoice, purchase order, receipt, or similar document.
      
      Please extract all relevant information from this document and organize it into a structured JSON format with the following fields:
      - document_type: The type of document (invoice, purchase order, receipt, etc.)
      - document_number: Any reference or document numbers
      - date: Date on the document
      - vendor_information: Name, address, contact info of the vendor/supplier
      - customer_information: Name, address, contact info of the customer if present
      - amounts: All monetary amounts (subtotal, tax, total, etc.)
      - line_items: An array of items with these fields for each:
        * item_number: The exact item/product number as displayed. Be extremely precise with alphanumeric item codes - preserve exact characters. Beware of visual confusions: 8/B, 0/O, 5/S, 1/I, S/5, E/B, Z/2. Consecutive similar codes (like "HZ1048SS" followed by "HZ1048S8P") should be distinguished carefully.
        * quantity: The numerical quantity ordered
        * unit_measure: The unit of measure (e.g., EA, PCS, etc.)
        * description: The full item description exactly as shown
        * unit_cost: The cost per unit as a number
        * amount: The total amount for this line item as a number
      - payment_information: Terms, methods, etc.
      
      Additionally, I need you to include a confidence score for each extracted field. Add a parallel structure called "confidence" with the same hierarchy as the main data, where each field contains a value between 0.0 and 1.0 indicating your confidence in the extraction. For example:
      {
        "document_type": "Invoice",
        "document_number": "INV-12345", 
        "confidence": {
          "document_type": 0.95,
          "document_number": 0.85
        }
      }
      
      Important:
      - Pay extra attention to item numbers - they must be exact
      - Double-check all numerical values - ensure they match the document precisely
      - Ensure description fields capture full text exactly as shown
      - Do not omit any line items
      - Provide realistic confidence scores based on clarity/quality of the text in the document
      
      Format the response as clean, structured JSON only. No explanatory text.
      `;
      
      // First run a quick analysis to determine document type for RAG
      // This is a simplified approach; in a production system we might use a more 
      // efficient method to determine document type without a separate API call
      const analysisPayload = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 100,
        "messages": [
          {
            "role": "user",
            "content": [
              {
                "type": "text",
                "text": "What type of business document is this? Respond with just the document type (e.g., 'Invoice', 'Purchase Order', 'Receipt', etc.)."
              },
              {
                "type": "image",
                "source": {
                  "type": "base64",
                  "media_type": mimeType,
                  "data": fileBase64
                }
              }
            ]
          }
        ],
        "temperature": 0.0
      };
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'AI-Resource-Group': config.resource_group || 'default'
      };
      
      console.log(`Analyzing document type...`);
      let documentType = "Unknown";
      
      try {
        const analysisResponse = await axios.post(`${config.deployment_url}/invoke`, analysisPayload, { headers });
        if (analysisResponse.data && analysisResponse.data.content) {
          documentType = analysisResponse.data.content[0].text.trim();
          console.log(`Detected document type: ${documentType}`);
        }
      } catch (error) {
        console.error('Error analyzing document type:', error.message);
        // Continue with unknown document type
      }
      
      // Use feedback to enhance the prompt if available
      console.log(`Checking for relevant feedback for document type: ${documentType}`);
      const enhancedPrompt = await feedbackUtils.generateEnhancedPrompt(basePrompt, documentType);
      
      if (enhancedPrompt !== basePrompt) {
        console.log('Using enhanced prompt based on previous feedback');
      }
      
      // Create final payload with enhanced prompt
      const payload = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 4000,
        "messages": [
          {
            "role": "user",
            "content": [
              {
                "type": "text",
                "text": enhancedPrompt
              },
              {
                "type": "image",
                "source": {
                  "type": "base64",
                  "media_type": mimeType,
                  "data": fileBase64
                }
              }
            ]
          }
        ],
        "temperature": 0.0
      };
      
      console.log(`Sending request to ${config.deployment_url}/invoke`);
      
      try {
        // Send request to AI Core
        const response = await axios.post(`${config.deployment_url}/invoke`, payload, { headers });
        
        console.log('Got response from AI Core:', JSON.stringify(response.data, null, 2).substring(0, 500) + '...');
        
        // Extract content from the response
        if (response.data && response.data.content) {
          const content = response.data.content[0].text;
          
          // Try to extract JSON from the content
          try {
            // Look for JSON pattern in the response
            const jsonMatch = content.match(/```json\s*({[\s\S]*?})\s*```/) || content.match(/({[\s\S]*})/);
            
            if (jsonMatch) {
              const jsonStr = jsonMatch[1];
              return JSON.parse(jsonStr);
            } else {
              // If no JSON found, return the text
              return { text: content };
            }
          } catch (error) {
            console.error('Error parsing extraction result:', error);
            return { text: content };
          }
        } else {
          throw new Error('Invalid response from AI Core');
        }
      } catch (error) {
        console.error('Error calling AI Core:', error.message);
        console.error('Error details:', error);
        
        // If AI Core call fails, return mock data but indicate the error
        return {
          document_type: 'Invoice (MOCK DATA - AI Core call failed)',
          document_number: 'INV-12345',
          date: '2025-03-24',
          error: error.message,
          vendor_information: {
            name: 'Sample Vendor Inc. (MOCK DATA)',
            address: '123 Vendor St, City, Country',
            contact: 'info@vendor.example'
          },
          line_items: [
            {
              item_number: 'ITEM-001',
              quantity: 2,
              unit_measure: 'EA',
              description: 'Sample product description (MOCK DATA - AI Core call failed)',
              unit_cost: 100.00,
              amount: 200.00
            }
          ]
        };
      }
    } catch (error) {
      console.error('Error processing document:', error);
      throw new Error(`Document processing failed: ${error.message}`);
    }
  }
};

// Add detailed request logging middleware
app.use(['/upload', '/document/upload'], (req, res, next) => {
  console.log('=== Upload Request Details ===');
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Method:', req.method);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Content-Length:', req.headers['content-length']);
  
  // Log completion of request handling
  const originalEnd = res.end;
  res.end = function(...args) {
    console.log('=== Upload Response ===');
    console.log('Status:', res.statusCode);
    console.log('Headers:', JSON.stringify(res._headers, null, 2));
    return originalEnd.apply(this, args);
  };
  
  next();
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// Serve static files from app directory to match CAP paths
app.use('/app', express.static('app'));
// Also serve root files for convenience
app.use(express.static('app'));

// Upload route with comprehensive error handling - support both paths
app.post(['/upload', '/document/upload'], (req, res) => {
  console.log('Upload request received');
  
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
      
      return res.status(400).json({ 
        success: false,
        message: err.message,
        documentId: null,
        error: err.toString()
      });
    }
    
    if (!req.file) {
      console.error('Upload error: No file in request');
      console.log('Request body:', req.body);
      console.log('Request params:', req.params);
      
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded or file not recognized', 
        documentId: null,
        debug: {
          hasRequestBody: !!req.body,
          contentType: req.headers['content-type']
        }
      });
    }
    
    console.log(`File uploaded successfully:`, req.file);
    console.log(`Document ID: ${req.documentId}, Filename: ${req.fileName}`);
    
    return res.json({
      success: true,
      message: 'Document uploaded successfully',
      documentId: req.documentId,
      fileName: req.fileName,
      fileDetails: {
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      }
    });
  });
});

// Process route with enhanced error handling - support both paths
app.post(['/process', '/document/processDocument'], express.json(), async (req, res) => {
  const { documentId } = req.body;
  
  console.log('=== Process Request Received ===');
  console.log('Document ID:', documentId);
  
  if (!documentId) {
    console.error('Process error: No document ID provided');
    return res.status(400).json({ 
      success: false, 
      message: 'No document ID provided' 
    });
  }
  
  try {
    // Find the file in uploads directory
    const files = fs.readdirSync(uploadsDir);
    const documentFile = files.find(file => file.includes(documentId));
    
    if (!documentFile) {
      console.error('Process error: Document not found:', documentId);
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    const filePath = path.join(uploadsDir, documentFile);
    console.log('Document found:', filePath);
    
    // Check if we have proper credentials - client secret should be a real value, not the example value
    const missingSecretOrDefault = !process.env.AI_CORE_CLIENT_SECRET || 
                                  process.env.AI_CORE_CLIENT_SECRET === 'your-client-secret';
    
    if (missingSecretOrDefault) {
      console.warn('Using mock data because AI_CORE_CLIENT_SECRET is not set or is the default value');
      // Return mock data with a warning
      return res.json({
        success: true,
        message: 'Document processed with mock data (AI Core credentials not set or misconfigured)',
        result: JSON.stringify({
          document_type: 'Invoice',
          document_number: 'INV-12345',
          date: '2025-03-24',
          note: 'This is mock data because AI Core credentials are not configured correctly. Please update your .env file with valid credentials.'
        })
      });
    }
    
    // Process document with AI Core
    let result;
    try {
      console.log('Calling AI Core for processing...');
      result = await aiCoreClient.processDocument(filePath, aiCoreConfig);
      console.log('AI Core processing complete');
    } catch (error) {
      console.error('AI Core processing error:', error);
      // Return error with descriptive message
      return res.status(500).json({
        success: false,
        message: `AI Core processing error: ${error.message}`,
        error: error.toString()
      });
    }
    
    console.log('Processing successful, returning result');
    res.json({
      success: true,
      message: 'Document processed successfully',
      result: JSON.stringify(result, null, 2)
    });
    
  } catch (error) {
    console.error('Error during document processing:', error);
    res.status(500).json({
      success: false,
      message: `Processing error: ${error.message}`
    });
  }
});

// Import ChromaDB service
const chromaDBService = require('./chroma-db');

// Feedback endpoint
app.post('/document/feedback', express.json({limit: '50mb'}), async (req, res) => {
  console.log('=== Feedback Request Received ===');
  
  try {
    const feedbackData = req.body;
    
    // Log the headers and request information
    console.log('Request headers:', req.headers);
    console.log('Content-Length:', req.headers['content-length']);
    console.log('Content-Type:', req.headers['content-type']);
    
    // Check if we received any data
    if (!feedbackData) {
      console.error('No feedback data received in request body');
      return res.status(400).json({
        success: false,
        message: 'No feedback data provided'
      });
    }
    
    // Log the received feedback (excluding the full extraction data to keep logs manageable)
    console.log('Document ID:', feedbackData.documentId);
    console.log('Comments:', feedbackData.comments);
    console.log('Problem Fields:', feedbackData.problemFields);
    console.log('Custom Prompt:', feedbackData.customPrompt ? 'Provided' : 'Not provided');
    
    // Create a path for storing feedback
    const feedbackDir = path.join(__dirname, 'feedback');
    if (!fs.existsSync(feedbackDir)) {
      fs.mkdirSync(feedbackDir, { recursive: true });
    }
    
    // Generate a unique filename for this feedback
    const feedbackId = uuidv4();
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const feedbackFilename = `feedback_${timestamp}_${feedbackId}.json`;
    const feedbackPath = path.join(feedbackDir, feedbackFilename);
    
    // Add the feedbackId to the data
    feedbackData.feedbackId = feedbackId;
    
    // Store the feedback as JSON
    await fs.promises.writeFile(
      feedbackPath, 
      JSON.stringify(feedbackData, null, 2),
      'utf8'
    );
    
    console.log(`Feedback saved to ${feedbackPath}`);
    
    // Create a simpler version without the full extraction data for indexing
    const feedbackSummary = {
      feedbackId,
      documentId: feedbackData.documentId,
      timestamp: new Date().toISOString(),
      problemFields: feedbackData.problemFields,
      hasComments: !!feedbackData.comments,
      hasCustomPrompt: !!feedbackData.customPrompt,
      documentType: feedbackData.extractionData?.document_type || 'Unknown'
    };
    
    // Update a feedback index JSON file - this will be useful for building a RAG system later
    const indexPath = path.join(feedbackDir, 'feedback_index.json');
    let feedbackIndex = [];
    
    try {
      if (fs.existsSync(indexPath)) {
        const indexData = await fs.promises.readFile(indexPath, 'utf8');
        feedbackIndex = JSON.parse(indexData);
      }
    } catch (error) {
      console.error('Error reading feedback index, creating new one:', error.message);
    }
    
    // Add the new feedback summary to the index
    feedbackIndex.push(feedbackSummary);
    
    // Write the updated index
    await fs.promises.writeFile(
      indexPath,
      JSON.stringify(feedbackIndex, null, 2),
      'utf8'
    );
    
    // Store in ChromaDB if available
    try {
      console.log('Adding feedback to ChromaDB...');
      await chromaDBService.addFeedback(feedbackData);
    } catch (error) {
      console.warn('Error storing feedback in ChromaDB:', error.message);
      console.warn('Continuing with file-based storage only');
    }
    
    res.json({ 
      success: true, 
      message: 'Feedback received and stored',
      feedbackId
    });
    
  } catch (error) {
    console.error('Error handling feedback:', error);
    res.status(500).json({
      success: false,
      message: `Error processing feedback: ${error.message}`
    });
  }
});

// Feedback index endpoint - returns summary of feedback entries
app.get('/feedback/index', async (req, res) => {
  try {
    const feedbackIndex = await feedbackUtils.loadFeedbackIndex();
    res.json(feedbackIndex);
  } catch (error) {
    console.error('Error loading feedback index:', error);
    res.status(500).json({
      error: 'Error loading feedback index',
      message: error.message
    });
  }
});

// Feedback detail endpoint - returns the full content of a feedback entry
app.get('/feedback/detail/:feedbackId', async (req, res) => {
  try {
    const { feedbackId } = req.params;
    
    if (!feedbackId) {
      return res.status(400).json({
        error: 'Missing feedback ID'
      });
    }
    
    const feedbackContent = await feedbackUtils.loadFeedbackContent(feedbackId);
    
    if (!feedbackContent) {
      return res.status(404).json({
        error: 'Feedback not found',
        feedbackId
      });
    }
    
    res.json(feedbackContent);
  } catch (error) {
    console.error('Error loading feedback detail:', error);
    res.status(500).json({
      error: 'Error loading feedback detail',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Initialize ChromaDB and migrate existing feedback
app.get('/admin/init-chromadb', async (req, res) => {
  try {
    console.log('Initializing ChromaDB...');
    await chromaDBService.initialize();
    
    res.json({
      success: true,
      message: 'ChromaDB initialized successfully'
    });
  } catch (error) {
    console.error('Error initializing ChromaDB:', error);
    res.status(500).json({
      success: false,
      message: `Error initializing ChromaDB: ${error.message}`
    });
  }
});

// Add a redirect from the root to the index page
app.get('/', (req, res) => {
  res.redirect('/index.html');
});

// Start server
app.listen(port, () => {
  console.log(`Express server running at http://localhost:${port}`);
  console.log(`- Direct UI: http://localhost:${port}/index.html`);
  console.log(`- CAP-style UI: http://localhost:${port}/app/index.html`);
  console.log(`- Simple UI5: http://localhost:${port}/app/simple-ui5.html`);
  console.log(`- Feedback Debug: http://localhost:${port}/app/feedback-debug.html`);
  console.log(`- Test page: http://localhost:${port}/app/test.html`);
  console.log(`- Health check: http://localhost:${port}/health`);
  console.log(`- ChromaDB initialization: http://localhost:${port}/admin/init-chromadb`);
  console.log('');
  console.log('NOTE: ChromaDB is currently implemented as a mock module. Install chromadb package');
  console.log('and update the chroma-db.js file for full vector similarity search capabilities.');
});