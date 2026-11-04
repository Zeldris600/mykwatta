export enum TitleDocumentType {
  TITRE_FONCIER = 'TITRE_FONCIER',
  ACTE_DE_VENTE = 'ACTE_DE_VENTE',
  PLAN_DE_BORNAGE = 'PLAN_DE_BORNAGE',
  CERTIFICAT_DE_PROPRIETE = 'CERTIFICAT_DE_PROPRIETE',
  OTHER = 'OTHER',
}

export const TITLE_DOCUMENT_TYPES = Object.values(TitleDocumentType) as [
  TitleDocumentType,
  ...TitleDocumentType[],
];

export enum TitleDocumentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export const TITLE_DOCUMENT_STATUSES = Object.values(TitleDocumentStatus) as [
  TitleDocumentStatus,
  ...TitleDocumentStatus[],
];

/** Deed types a buyer should see on a SALE listing. */
export const SALE_TITLE_CHECKLIST_TYPES: readonly TitleDocumentType[] = [
  TitleDocumentType.TITRE_FONCIER,
  TitleDocumentType.ACTE_DE_VENTE,
  TitleDocumentType.PLAN_DE_BORNAGE,
  TitleDocumentType.CERTIFICAT_DE_PROPRIETE,
];

export const TITLE_DOCUMENT_MAX_BYTES = 8 * 1024 * 1024;

export const TITLE_DOCUMENT_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;
