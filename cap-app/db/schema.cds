namespace com.docextractor.db;

entity Documents {
  key ID          : UUID;
  fileName        : String;
  fileType        : String;
  uploadDate      : Timestamp;
  processedDate   : Timestamp;
  status          : String; // UPLOADED, PROCESSING, COMPLETED, ERROR
  documentType    : String;
  documentNumber  : String;
  documentDate    : String;
  rawExtraction   : LargeString;
  vendorInfo      : Association to VendorInformation;
  customerInfo    : Association to CustomerInformation;
  lineItems       : Association to many LineItems on lineItems.document = $self;
  paymentInfo     : Association to PaymentInformation;
}

entity VendorInformation {
  key ID        : UUID;
  documents     : Association to many Documents on documents.vendorInfo = $self;
  name          : String;
  address       : String;
  contactInfo   : String;
}

entity CustomerInformation {
  key ID        : UUID;
  documents     : Association to many Documents on documents.customerInfo = $self;
  name          : String;
  address       : String;
  contactInfo   : String;
}

entity LineItems {
  key ID        : UUID;
  document      : Association to Documents;
  itemNumber    : String;
  quantity      : Decimal;
  unitMeasure   : String;
  description   : String;
  unitCost      : Decimal;
  amount        : Decimal;
}

entity PaymentInformation {
  key ID        : UUID;
  documents     : Association to many Documents on documents.paymentInfo = $self;
  terms         : String;
  dateRequired  : String;
  additionalInfo : String;
}