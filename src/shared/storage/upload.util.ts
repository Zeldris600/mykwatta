import { AppException } from '@mykwatta/core/common/exceptions/app.exception';

export type UploadedFileLike = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
};

export function assertUploadedFile(
  file: UploadedFileLike | undefined,
  options: {
    field: string;
    maxBytes: number;
    allowedMimeTypes: readonly string[];
  },
): UploadedFileLike {
  if (!file?.buffer?.length) {
    throw AppException.badRequest(`File field "${options.field}" is required`);
  }

  if (file.size > options.maxBytes) {
    throw AppException.badRequest(
      `File exceeds maximum size of ${options.maxBytes} bytes`,
      { field: options.field, size: file.size },
    );
  }

  const mime = file.mimetype?.trim().toLowerCase();
  if (!mime || !options.allowedMimeTypes.includes(mime)) {
    throw AppException.badRequest(
      `Unsupported content type for "${options.field}"`,
      {
        contentType: mime,
        allowed: options.allowedMimeTypes,
      },
    );
  }

  return file;
}

export function extensionForContentType(contentType: string): string {
  switch (contentType.trim().toLowerCase()) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'application/pdf':
      return 'pdf';
    case 'video/mp4':
      return 'mp4';
    case 'video/webm':
      return 'webm';
    default:
      throw AppException.badRequest(`No extension mapping for ${contentType}`);
  }
}
