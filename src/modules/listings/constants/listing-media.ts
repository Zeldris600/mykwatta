export const LISTING_MEDIA_MAX_BYTES = 8 * 1024 * 1024;
export const LISTING_MEDIA_MAX_PER_LISTING = 12;
export const LISTING_MEDIA_SIGNED_URL_TTL_SECONDS = 60 * 60;

export const LISTING_MEDIA_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type ListingMediaMimeType =
  (typeof LISTING_MEDIA_ALLOWED_MIME_TYPES)[number];
