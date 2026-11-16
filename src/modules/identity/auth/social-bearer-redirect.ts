import { createAuthMiddleware } from 'better-auth/api';

/**
 * After OAuth, Better Auth redirects to callbackURL with a Set-Cookie session.
 * Our clients use Bearer tokens (mk.token), so append `set-auth-token` to the
 * redirect Location (same header name the bearer plugin exposes on JSON responses).
 */
export function socialBearerRedirect() {
  return {
    id: 'social-bearer-redirect',
    hooks: {
      after: [
        {
          matcher: () => true,
          handler: createAuthMiddleware((ctx) => {
            const token =
              ctx.context.responseHeaders?.get('set-auth-token') ?? undefined;
            const location =
              ctx.context.responseHeaders?.get('location') ?? undefined;
            if (!token || !location) {
              return;
            }

            let url: URL;
            try {
              url = new URL(location);
            } catch {
              return;
            }

            // sign-in/social may also set Location to Google's authorize URL — leave it alone.
            if (
              url.hostname.endsWith('google.com') ||
              url.hostname.endsWith('googleusercontent.com')
            ) {
              return;
            }

            url.searchParams.set('set-auth-token', token);
            ctx.setHeader('location', url.toString());
          }),
        },
      ],
    },
  };
}
