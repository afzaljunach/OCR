sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageBox, MessageToast) {
    "use strict";

    return Controller.extend("com.docextractor.uploader.controller.Main", {
        onInit: function () {
            // Set up a model for upload settings
            var oUploadModel = new JSONModel({
                busy: false,
                uploadProgress: 0
            });
            this.getView().setModel(oUploadModel, "upload");
            
            // Initialize the upload set
            var oUploadSet = this.byId("uploadSet");
            oUploadSet.setFileTypes(["pdf", "jpg", "jpeg", "png"]);
        },

        /**
         * Handle document upload
         */
        onUploadButtonPress: function () {
            var oUploadSet = this.byId("uploadSet");
            var aIncompleteItems = oUploadSet.getIncompleteItems();
            
            if (aIncompleteItems.length === 0) {
                MessageToast.show("Please add at least one document to upload");
                return;
            }
            
            // Set busy state
            var oUploadModel = this.getView().getModel("upload");
            oUploadModel.setProperty("/busy", true);
            
            // Get the file from the upload set
            var oFile = aIncompleteItems[0].getFileObject();
            
            if (!oFile) {
                MessageToast.show("No file selected");
                oUploadModel.setProperty("/busy", false);
                return;
            }
            
            // Create form data
            var oFormData = new FormData();
            oFormData.append("file", oFile);
            
            // Send the file using the custom upload endpoint
            fetch("/upload", {
                method: "POST",
                body: oFormData
            })
            .then(function(response) {
                return response.json();
            })
            .then(function(data) {
                oUploadModel.setProperty("/busy", false);
                
                if (data.documentId) {
                    MessageToast.show("Document uploaded successfully");
                    
                    // Clear the upload set
                    oUploadSet.removeAllIncompleteItems();
                    
                    // Process the document
                    this._processDocument(data.documentId);
                    
                    // Refresh the documents list
                    this.getView().getModel().refresh();
                } else {
                    MessageBox.error("Upload failed: " + data.message);
                }
            }.bind(this))
            .catch(function(error) {
                oUploadModel.setProperty("/busy", false);
                MessageBox.error("Upload failed: " + error.message);
            });
        },
        
        /**
         * Process uploaded document
         * @private
         */
        _processDocument: function(sDocumentId) {
            var oModel = this.getView().getModel();
            var oUploadModel = this.getView().getModel("upload");
            
            oUploadModel.setProperty("/busy", true);
            
            // Call the process document action
            oModel.callFunction("/processDocument", {
                method: "POST",
                urlParameters: {
                    documentId: sDocumentId
                },
                success: function(oData) {
                    oUploadModel.setProperty("/busy", false);
                    
                    if (oData.success) {
                        MessageToast.show("Document processed successfully");
                        oModel.refresh();
                    } else {
                        MessageBox.error("Processing failed: " + oData.message);
                    }
                },
                error: function(oError) {
                    oUploadModel.setProperty("/busy", false);
                    MessageBox.error("Error processing document");
                }
            });
        },

        /**
         * Navigate to document details view
         */
        onDocumentPress: function (oEvent) {
            var oItem = oEvent.getSource();
            var oBindingContext = oItem.getBindingContext();
            var sDocumentId = oBindingContext.getProperty("ID");
            
            this.getOwnerComponent().getRouter().navTo("RouteDetail", {
                documentId: sDocumentId
            });
        },

        /**
         * Process document with AI Core
         */
        onProcessDocument: function (oEvent) {
            var oSource = oEvent.getSource();
            var oBindingContext = oSource.getBindingContext();
            var sDocumentId = oBindingContext.getProperty("ID");
            
            // Set busy state
            var oUploadModel = this.getView().getModel("upload");
            oUploadModel.setProperty("/busy", true);
            
            // Call the process document action
            var oModel = this.getView().getModel();
            oModel.callFunction("/processDocument", {
                method: "POST",
                urlParameters: {
                    documentId: sDocumentId
                },
                success: function (oData) {
                    oUploadModel.setProperty("/busy", false);
                    
                    if (oData.success) {
                        MessageToast.show("Document processed successfully");
                        
                        // Refresh the documents list
                        oModel.refresh();
                    } else {
                        MessageBox.error("Processing failed: " + oData.message);
                    }
                },
                error: function (oError) {
                    oUploadModel.setProperty("/busy", false);
                    MessageBox.error("Error processing document: " + oError.message);
                }
            });
        }
    });
});