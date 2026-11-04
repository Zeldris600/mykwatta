import { extensionForContentType } from './upload.util';

export function listingTitleDocumentObjectKey(input: {
  listingId: string;
  documentId: string;
  contentType: string;
}): string {
  const ext = extensionForContentType(input.contentType);
  return `listings/${input.listingId}/title-documents/${input.documentId}.${ext}`;
}

export function listingMediaObjectKey(input: {
  listingId: string;
  mediaId: string;
  contentType: string;
}): string {
  const ext = extensionForContentType(input.contentType);
  return `listings/${input.listingId}/media/${input.mediaId}.${ext}`;
}

export function kycDocumentObjectKey(input: {
  userId: string;
  kycId: string;
  contentType: string;
}): string {
  const ext = extensionForContentType(input.contentType);
  return `kyc/${input.userId}/${input.kycId}.${ext}`;
}
