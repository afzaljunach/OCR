sap.ui.define([], function () {
    "use strict";
    
    return {
        /**
         * Formats a number as currency
         * @param {number} value The value to format
         * @returns {string} The formatted value
         */
        currency: function(value) {
            if (!value) {
                return "0.00";
            }
            
            return parseFloat(value).toFixed(2);
        },
        
        /**
         * Formats a status text
         * @param {string} status The status to format
         * @returns {string} The formatted status
         */
        statusText: function(status) {
            var resourceBundle = this.getView().getModel("i18n").getResourceBundle();
            
            switch (status) {
                case "UPLOADED":
                    return resourceBundle.getText("statusUploaded");
                case "PROCESSING":
                    return resourceBundle.getText("statusProcessing");
                case "COMPLETED":
                    return resourceBundle.getText("statusCompleted");
                case "ERROR":
                    return resourceBundle.getText("statusError");
                default:
                    return status;
            }
        },
        
        /**
         * Formats a status state
         * @param {string} status The status to format
         * @returns {sap.ui.core.ValueState} The status state
         */
        statusState: function(status) {
            switch (status) {
                case "UPLOADED":
                    return "Warning";
                case "PROCESSING":
                    return "Information";
                case "COMPLETED":
                    return "Success";
                case "ERROR":
                    return "Error";
                default:
                    return "None";
            }
        }
    };
});