export const KYC_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
export const KYC_DOCUMENT_SIGNED_URL_TTL_SECONDS = 15 * 60;

export const KYC_DOCUMENT_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export type KycDocumentMimeType =
  (typeof KYC_DOCUMENT_ALLOWED_MIME_TYPES)[number];
