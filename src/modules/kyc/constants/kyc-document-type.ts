export enum KycDocumentType {
  NATIONAL_ID = 'NATIONAL_ID',
  PASSPORT = 'PASSPORT',
  DRIVERS_LICENSE = 'DRIVERS_LICENSE',
  BUSINESS_REGISTRATION = 'BUSINESS_REGISTRATION',
}

export const KYC_DOCUMENT_TYPES = Object.values(KycDocumentType) as [
  KycDocumentType,
  ...KycDocumentType[],
];
