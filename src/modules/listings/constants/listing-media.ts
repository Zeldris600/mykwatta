export const LISTING_MEDIA_MAX_BYTES = 8 * 1024 * 1024;
export const LISTING_VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const LISTING_MEDIA_MAX_PER_LISTING = 12;
export const LISTING_VIDEO_MAX_PER_LISTING = 3;
export const LISTING_MEDIA_SIGNED_URL_TTL_SECONDS = 60 * 60;

export const LISTING_MEDIA_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const LISTING_VIDEO_ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/webm',
] as const;

export const LISTING_MEDIA_ALL_ALLOWED_MIME_TYPES = [
  ...LISTING_MEDIA_ALLOWED_MIME_TYPES,
  ...LISTING_VIDEO_ALLOWED_MIME_TYPES,
] as const;

export type ListingMediaMimeType =
  (typeof LISTING_MEDIA_ALL_ALLOWED_MIME_TYPES)[number];
