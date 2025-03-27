sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/ui/model/json/JSONModel",
    "../model/formatter"
], function (Controller, History, JSONModel, formatter) {
    "use strict";

    return Controller.extend("com.docextractor.uploader.controller.Detail", {
        formatter: formatter,
        
        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteDetail").attachPatternMatched(this._onPatternMatched, this);
        },
        
        _onPatternMatched: function (oEvent) {
            var sDocumentId = oEvent.getParameter("arguments").documentId;
            
            // Bind the view to the document
            var oView = this.getView();
            var sPath = "/Documents(" + sDocumentId + ")";
            oView.bindElement({
                path: sPath,
                parameters: {
                    expand: "vendorInfo,customerInfo,lineItems,paymentInfo"
                },
                events: {
                    dataRequested: function () {
                        oView.setBusy(true);
                    },
                    dataReceived: function () {
                        oView.setBusy(false);
                    }
                }
            });
            
            // Format raw extraction for display
            var oModel = oView.getModel();
            var oContext = oModel.createBindingContext(sPath);
            
            if (oContext) {
                var sRawExtraction = oContext.getProperty("rawExtraction");
                if (sRawExtraction) {
                    try {
                        var sPrettyJson = JSON.stringify(JSON.parse(sRawExtraction), null, 2);
                        if (this.byId("rawDataEditor")) {
                            this.byId("rawDataEditor").setValue(sPrettyJson);
                        }
                    } catch (e) {
                        // In case the JSON is invalid
                        if (this.byId("rawDataEditor")) {
                            this.byId("rawDataEditor").setValue(sRawExtraction);
                        }
                    }
                }
            }
        },
        
        onNavBack: function () {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();
            
            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                var oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("RouteMain", {}, true);
            }
        }
    });
});