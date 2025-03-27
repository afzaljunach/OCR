const cds = require('@sap/cds');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const axios = require('axios');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const express = require('express');

// AI Core client integration
const aiCoreClient = {
  async getToken(config) {
    try {
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
  
  async extractDocumentInfo(filePath, mimeType, config) {
    try {
      // Get token
      const token = await this.getToken(config);
      
      // Read file content
      const fileContent = await readFile(filePath);
      const fileBase64 = fileContent.toString('base64');
      
      // Set up headers
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'AI-Resource-Group': config.resource_group || 'default'
      };
      
      // Create detailed prompt
      const prompt = `
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
      
      // Create payload depending on file type
      const payload = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 4000,
        "messages": [
          {
            "role": "user",
            "content": [
              {
                "type": "text",
                "text": prompt
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
      
      // Send request to AI Core
      const endpoint = `${config.deployment_url}/invoke`;
      console.log(`Sending request to ${endpoint}`);
      
      const response = await axios.post(endpoint, payload, { headers });
      
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
      console.error('Error in document extraction:', error);
      throw new Error(`Document extraction failed: ${error.message}`);
    }
  }
};

module.exports = cds.service.impl(async function() {
  const { Documents, VendorInformation, CustomerInformation, LineItems, PaymentInformation } = this.entities;
  
  // Load AI Core configuration
  const config = {
    auth_url: process.env.AI_CORE_AUTH_URL || "https://subdomainaicore.authentication.eu10.hana.ondemand.com/oauth/token",
    client_id: process.env.AI_CORE_CLIENT_ID || "sb-b8a7ae41-2697-4aa8-b7e0-77a0db961376!b537485|aicore!b540",
    client_secret: process.env.AI_CORE_CLIENT_SECRET || "14739ea1-4086-4d68-91cb-4ab17431570a$4-OXza2NtQiAOqr0ZUC0-6LHIiJlLq61Ch7DNAjbxK8=",
    deployment_url: process.env.AI_CORE_DEPLOYMENT_URL || "https://api.ai.prod.eu-central-1.aws.ml.hana.ondemand.com/v2/inference/deployments/d429c1c3626932c4",
    resource_group: process.env.AI_CORE_RESOURCE_GROUP || "default"
  };
  
  // Create upload directory if it doesn't exist
  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  // Set up file upload handler
  this.on('bootstrap', app => {
    // Create a custom endpoint for file uploads
    const upload = multer({
      storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadsDir),
        filename: (req, file, cb) => {
          const documentId = uuidv4();
          const extname = path.extname(file.originalname);
          const fileName = `document_${documentId}${extname}`;
          
          // Attach the values to the request to be used later
          req.documentId = documentId;
          req.fileName = fileName;
          req.fileType = extname.toLowerCase().substring(1);
          
          cb(null, fileName);
        }
      })
    });
    
    // Handle file upload
    app.post('/document/upload', upload.single('file'), async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: 'No file uploaded', documentId: null });
        }
        
        // Get values from the request
        const documentId = req.documentId;
        const fileName = req.fileName;
        const fileType = req.fileType;
        
        // Insert into database
        await INSERT.into(Documents).entries({
          ID: documentId,
          fileName: fileName,
          fileType: fileType,
          uploadDate: new Date().toISOString(),
          status: 'UPLOADED'
        });
        
        res.json({
          message: 'Document uploaded successfully',
          documentId: documentId
        });
      } catch (error) {
        console.error('Error uploading document:', error);
        res.status(500).json({
          message: `Error uploading document: ${error.message}`,
          documentId: null
        });
      }
    });
  });
  
  // Handle document upload action (simplified for OData compatibility)
  this.on('uploadDocument', async (req) => {
    const { file } = req.data;
    return {
      message: 'Please use the /upload endpoint for file uploads',
      documentId: null
    };
  });
  
  // Handle document processing
  this.on('processDocument', async (req) => {
    const { documentId } = req.data;
    
    if (!documentId) {
      return { success: false, message: 'No document ID provided', result: null };
    }
    
    try {
      // Get document details
      const document = await SELECT.one.from(Documents).where({ ID: documentId });
      
      if (!document) {
        return { success: false, message: 'Document not found', result: null };
      }
      
      // Update status to PROCESSING
      await UPDATE(Documents).set({ status: 'PROCESSING' }).where({ ID: documentId });
      
      // In a real app, you'd read the actual file
      // This is just for demonstration
      const filePath = path.join(uploadsDir, document.fileName);
      // Determine mime type based on file extension
      const mimeType = document.fileType === 'pdf' ? 'application/pdf' : 'image/jpeg';
      
      // Call AI Core to extract information
      let extractionResult;
      try {
        extractionResult = await aiCoreClient.extractDocumentInfo(filePath, mimeType, config);
      } catch (error) {
        // Update status to ERROR
        await UPDATE(Documents).set({ 
          status: 'ERROR',
          processedDate: new Date().toISOString(),
          rawExtraction: JSON.stringify({ error: error.message })
        }).where({ ID: documentId });
        
        return { 
          success: false, 
          message: `Error processing document: ${error.message}`,
          result: null
        };
      }
      
      // Store the extraction result
      // In a real application, you would properly parse and store each entity
      
      // Create vendor information
      const vendorId = uuidv4();
      await INSERT.into(VendorInformation).entries({
        ID: vendorId,
        name: extractionResult.vendor_information?.name || '',
        address: extractionResult.vendor_information?.address || '',
        contactInfo: JSON.stringify(extractionResult.vendor_information || {})
      });
      
      // Create customer information
      const customerId = uuidv4();
      await INSERT.into(CustomerInformation).entries({
        ID: customerId,
        name: extractionResult.customer_information?.name || '',
        address: extractionResult.customer_information?.address || '',
        contactInfo: JSON.stringify(extractionResult.customer_information || {})
      });
      
      // Create payment information
      const paymentId = uuidv4();
      await INSERT.into(PaymentInformation).entries({
        ID: paymentId,
        terms: extractionResult.payment_information?.terms || '',
        dateRequired: extractionResult.payment_information?.date_required || '',
        additionalInfo: JSON.stringify(extractionResult.payment_information || {})
      });
      
      // Update the document
      await UPDATE(Documents).set({
        status: 'COMPLETED',
        processedDate: new Date().toISOString(),
        documentType: extractionResult.document_type || '',
        documentNumber: extractionResult.document_number || '',
        documentDate: extractionResult.date || '',
        rawExtraction: JSON.stringify(extractionResult),
        vendorInfo_ID: vendorId,
        customerInfo_ID: customerId,
        paymentInfo_ID: paymentId
      }).where({ ID: documentId });
      
      // Insert line items
      if (Array.isArray(extractionResult.line_items)) {
        for (const item of extractionResult.line_items) {
          await INSERT.into(LineItems).entries({
            ID: uuidv4(),
            document_ID: documentId,
            itemNumber: item.item_number || '',
            quantity: item.quantity || 0,
            unitMeasure: item.unit_measure || '',
            description: item.description || '',
            unitCost: item.unit_cost || 0,
            amount: item.amount || 0
          });
        }
      }
      
      return {
        success: true,
        message: 'Document processed successfully',
        result: JSON.stringify(extractionResult)
      };
    } catch (error) {
      console.error('Error processing document:', error);
      return {
        success: false,
        message: `Error processing document: ${error.message}`,
        result: null
      };
    }
  });
});