export enum OrgDocumentType {
  LICENCE = 'LICENCE',
  NUI = 'NUI',
}

export const ORG_DOCUMENT_TYPES = Object.values(OrgDocumentType) as [
  OrgDocumentType,
  ...OrgDocumentType[],
];
