import type { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { prisma } from './db';

// Augment Express's Request so handlers can read the authenticated user.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; email?: string };
    }
  }
}

// Lazily build the JWKS resolver so the module can be imported without SUPABASE_URL
// (e.g. when AUTH_DISABLED=true for local review). jose caches keys and handles rotation.
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks() {
  if (!jwks) {
    const url = process.env.SUPABASE_URL;
    if (!url) throw new Error('SUPABASE_URL is not set — cannot verify auth tokens');
    jwks = createRemoteJWKSet(new URL(`${url}/auth/v1/.well-known/jwks.json`));
  }
  return jwks;
}

/**
 * Verifies the Supabase access token on the Authorization header and attaches req.user.
 * Rejects with 401 when the token is missing/invalid, 403 when the email is outside the
 * ALLOWED_EMAIL_DOMAIN allowlist. Set AUTH_DISABLED=true for local dev ONLY.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (process.env.AUTH_DISABLED === 'true') {
    return next();
  }

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }
  const token = header.slice('Bearer '.length);

  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: `${process.env.SUPABASE_URL}/auth/v1`,
      audience: 'authenticated',
    });

    const email = typeof payload.email === 'string' ? payload.email : undefined;

    // Optional allowlist: only permit users from your organization's email domain.
    const domain = process.env.ALLOWED_EMAIL_DOMAIN;
    if (domain && (!email || !email.toLowerCase().endsWith(`@${domain.toLowerCase()}`))) {
      return res.status(403).json({ error: 'Account not permitted' });
    }

    const id = String(payload.sub);
    req.user = { id, email };

    // Keep the local user roster in sync (owners/assignees reference it). Best-effort:
    // a roster hiccup must never block an otherwise-authenticated request.
    if (email) {
      const meta = (payload.user_metadata ?? {}) as Record<string, unknown>;
      const name =
        (typeof meta.name === 'string' && meta.name) ||
        (typeof meta.full_name === 'string' && meta.full_name) ||
        null;
      try {
        await prisma.user.upsert({
          where: { id },
          create: { id, email, name },
          update: { email, lastSeenAt: new Date(), ...(name ? { name } : {}) },
        });
      } catch {
        /* ignore roster write failures */
      }
    }

    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
