using com.docextractor.db as db from '../db/schema';

service DocumentService @(path:'/document') {
  entity Documents as projection on db.Documents;
  entity VendorInformation as projection on db.VendorInformation;
  entity CustomerInformation as projection on db.CustomerInformation;
  entity LineItems as projection on db.LineItems;
  entity PaymentInformation as projection on db.PaymentInformation;
  
  action uploadDocument(file: String) returns {
    message: String;
    documentId: UUID;
  };
  
  action processDocument(documentId: UUID) returns {
    success: Boolean;
    message: String;
    result: String;
  };
}