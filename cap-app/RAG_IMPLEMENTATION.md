# Retrieval-Augmented Generation (RAG) Implementation Guide

This document outlines the steps to enhance the document extraction system with Retrieval-Augmented Generation (RAG) using Chroma DB.

## Overview

The current system already implements the foundation for a RAG approach:

1. **User Feedback Collection**: We collect user feedback on extraction quality, including:
   - Problem fields
   - User comments
   - Custom prompt suggestions

2. **Basic RAG Implementation**: We currently use a simple keyword-matching approach to find relevant feedback for similar document types.

3. **Prompt Enhancement**: We enhance the extraction prompt with relevant user feedback.

To fully implement RAG with vector similarity search using Chroma DB, follow the steps below.

## Step 1: Install Chroma DB

Add the required dependencies to your package.json:

```json
{
  "dependencies": {
    "chromadb": "^1.5.0"
  }
}
```

Then run:

```bash
npm install
```

## Step 2: Create Chroma DB Integration Module

Create a new file called `chroma-db.js` with the following content:

```javascript
const { ChromaClient } = require('chromadb');
const path = require('path');
const fs = require('fs');

class ChromaDBService {
  constructor() {
    this.client = new ChromaClient();
    this.collectionName = 'document_feedback';
    this.collection = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      console.log('Initializing Chroma DB service...');
      // Create or get the collection
      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
        metadata: { 
          description: 'Document extraction feedback and examples'
        }
      });
      this.initialized = true;
      console.log('Chroma DB service initialized successfully');
    } catch (error) {
      console.error('Error initializing Chroma DB:', error);
      throw error;
    }
  }

  async addFeedback(feedbackData) {
    if (!this.initialized) await this.initialize();

    try {
      const {
        feedbackId,
        documentId,
        comments,
        problemFields,
        customPrompt,
        extractionData
      } = feedbackData;

      // Create document text from extraction data for embedding
      const documentType = extractionData.document_type || 'Unknown';
      const documentText = `
        Document Type: ${documentType}
        Document Number: ${extractionData.document_number || ''}
        Date: ${extractionData.date || ''}
        Vendor: ${extractionData.vendor_information?.name || ''}
        Items Count: ${extractionData.line_items?.length || 0}
        User Feedback: ${comments || ''}
        Problem Fields: ${problemFields?.join(', ') || ''}
      `;

      // Add the document to the collection
      await this.collection.add({
        ids: [feedbackId],
        metadatas: [{
          documentId,
          documentType,
          timestamp: new Date().toISOString(),
          hasComments: !!comments,
          hasCustomPrompt: !!customPrompt,
          problemFields: problemFields || []
        }],
        documents: [documentText],
      });

      console.log(`Feedback ${feedbackId} added to Chroma DB`);
      return true;
    } catch (error) {
      console.error('Error adding feedback to Chroma DB:', error);
      return false;
    }
  }

  async findSimilarDocuments(documentType, limit = 5) {
    if (!this.initialized) await this.initialize();

    try {
      // Create a query text from document type
      const queryText = `Document Type: ${documentType}`;

      // Query the collection
      const results = await this.collection.query({
        queryTexts: [queryText],
        nResults: limit
      });

      return results;
    } catch (error) {
      console.error('Error querying Chroma DB:', error);
      return { ids: [], metadatas: [], documents: [] };
    }
  }

  async getFeedbackIds() {
    if (!this.initialized) await this.initialize();

    try {
      // Get all feedback IDs in the collection
      const results = await this.collection.get();
      return results.ids;
    } catch (error) {
      console.error('Error getting feedback IDs from Chroma DB:', error);
      return [];
    }
  }
}

// Export a singleton instance
const chromaDBService = new ChromaDBService();
module.exports = chromaDBService;
```

## Step 3: Update Feedback Utils with Chroma DB Integration

Update the `feedbackUtils` object in `express-server.js` to use Chroma DB:

```javascript
// Import the Chroma DB service
const chromaDBService = require('./chroma-db');

// Update the findRelevantFeedback method in feedbackUtils
async findRelevantFeedback(documentType) {
  try {
    // First, try to find similar documents using Chroma DB
    const results = await chromaDBService.findSimilarDocuments(documentType);
    
    if (results.ids && results.ids.length > 0) {
      console.log(`Found ${results.ids.length} relevant feedback entries in Chroma DB for document type: ${documentType}`);
      
      // Convert results to the format expected by the rest of the system
      const relevantFeedback = [];
      
      for (let i = 0; i < results.ids.length; i++) {
        const feedbackId = results.ids[i];
        const metadata = results.metadatas[i];
        
        relevantFeedback.push({
          feedbackId,
          documentId: metadata.documentId,
          timestamp: metadata.timestamp,
          documentType: metadata.documentType,
          hasComments: metadata.hasComments,
          hasCustomPrompt: metadata.hasCustomPrompt,
          problemFields: metadata.problemFields
        });
      }
      
      return relevantFeedback;
    }
    
    // Fallback to the existing file-based search if Chroma DB has no results
    console.log('No Chroma DB results, falling back to file-based search');
    return this.findRelevantFeedbackFromFiles(documentType);
  } catch (error) {
    console.error('Error finding relevant feedback with Chroma DB:', error);
    // Fallback to the existing file-based search
    return this.findRelevantFeedbackFromFiles(documentType);
  }
},

// Rename the current method to be the fallback option
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
    console.error('Error finding relevant feedback from files:', error);
    return [];
  }
}
```

## Step 4: Update Feedback Submission to Add to Chroma DB

Update the feedback endpoint in `express-server.js`:

```javascript
// Feedback endpoint
app.post('/document/feedback', express.json({limit: '50mb'}), async (req, res) => {
  console.log('=== Feedback Request Received ===');
  
  try {
    const feedbackData = req.body;
    
    // Log the received feedback
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
    
    // Update a feedback index JSON file
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
    
    // Add to Chroma DB if available
    try {
      await chromaDBService.addFeedback(feedbackData);
    } catch (error) {
      console.warn('Could not add feedback to Chroma DB:', error.message);
      // Continue even if Chroma DB fails, as we already saved to the file system
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
```

## Step 5: Initialize Chroma DB on App Startup

Add this to your application startup code in `express-server.js`:

```javascript
// Initialize Chroma DB
(async () => {
  try {
    await chromaDBService.initialize();
    console.log('Chroma DB initialized successfully');
    
    // Optionally migrate existing feedback to Chroma DB
    const feedbackIndex = await feedbackUtils.loadFeedbackIndex();
    
    if (feedbackIndex.length > 0) {
      console.log(`Found ${feedbackIndex.length} existing feedback entries to migrate to Chroma DB`);
      
      for (const entry of feedbackIndex) {
        try {
          const feedbackContent = await feedbackUtils.loadFeedbackContent(entry.feedbackId);
          if (feedbackContent) {
            await chromaDBService.addFeedback(feedbackContent);
            console.log(`Migrated feedback ${entry.feedbackId} to Chroma DB`);
          }
        } catch (error) {
          console.error(`Error migrating feedback ${entry.feedbackId} to Chroma DB:`, error.message);
        }
      }
    }
  } catch (error) {
    console.error('Error initializing Chroma DB:', error);
    console.warn('The application will continue without Chroma DB support');
  }
})();
```

## Step 6: Update the Feedback Debug Page

Update the feedback debug page to show the Chroma DB status:

1. Add a section to show if Chroma DB is connected
2. Add a button to manually migrate feedback to Chroma DB

## Benefits of Using Chroma DB for RAG

1. **Semantic Search**: Find similar documents based on meaning, not just keywords
2. **Speed**: Vector searches are faster for large datasets
3. **Scalability**: Can handle thousands of feedback entries
4. **Improved Relevance**: Better matching of similar documents
5. **Multi-modal**: Could be extended to match based on document images, not just text

## Next Steps After Chroma DB Implementation

1. **Document Embeddings**: Generate embeddings for entire documents, not just the extraction results
2. **Fine-tuning**: Use feedback to create datasets for fine-tuning extraction models
3. **Feedback Analytics**: Create dashboards to analyze extraction quality over time
4. **Active Learning**: Prioritize getting feedback on documents where the system is uncertain

## Technical Requirements

- Node.js v16+
- 16GB+ RAM recommended for Chroma DB with embeddings
- SSD storage for the vector database (faster query performance)