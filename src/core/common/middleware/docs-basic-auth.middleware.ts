import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

/**
 * HTTP Basic Auth for Swagger UI / OpenAPI JSON and Better Auth Scalar reference.
 */
export function createDocsBasicAuthMiddleware(
  username: string,
  password: string,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    if (header?.startsWith('Basic ')) {
      let decoded = '';
      try {
        decoded = Buffer.from(header.slice(6).trim(), 'base64').toString(
          'utf8',
        );
      } catch {
        decoded = '';
      }
      const sep = decoded.indexOf(':');
      if (sep >= 0) {
        const user = decoded.slice(0, sep);
        const pass = decoded.slice(sep + 1);
        if (safeEqual(user, username) && safeEqual(pass, password)) {
          next();
          return;
        }
      }
    }

    res.setHeader('WWW-Authenticate', 'Basic realm="MYKWATTA API Docs"');
    res.status(401).send('Authentication required');
  };
}
