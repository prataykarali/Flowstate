import { createHmac } from 'node:crypto';

// In-memory rate limiting per serverless container instance (max 15 requests / 60 seconds per IP)
const ipBuckets = new Map();
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 15;

export default function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET' && request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });

  const secret = process.env.PRISMLAB_SESSION_SECRET;
  const ipHeader = request.headers['x-vercel-forwarded-for'] || request.headers['x-forwarded-for'];
  if (!secret || typeof ipHeader !== 'string' || !ipHeader.trim()) {
    return response.status(503).json({ error: 'Playground session service is unavailable' });
  }

  const clientIp = ipHeader.split(',')[0].trim();
  const now = Date.now();

  let bucket = ipBuckets.get(clientIp);
  if (!bucket || now - bucket.start > RATE_LIMIT_WINDOW_MS) {
    bucket = { count: 1, start: now };
    ipBuckets.set(clientIp, bucket);
  } else {
    bucket.count += 1;
    if (bucket.count > MAX_REQUESTS_PER_WINDOW) {
      response.setHeader('Retry-After', '60');
      return response.status(429).json({ error: 'Too many session requests. Please wait a moment.' });
    }
  }

  // Periodic cleanup of stale buckets
  if (ipBuckets.size > 1000) {
    for (const [key, val] of ipBuckets.entries()) {
      if (now - val.start > RATE_LIMIT_WINDOW_MS) {
        ipBuckets.delete(key);
      }
    }
  }

  const visitor = createHmac('sha256', secret).update(`ip:${clientIp}`).digest('hex').slice(0, 32);
  const expiresAt = Math.floor(Date.now() / 1000) + 600;
  const encoded = Buffer.from(JSON.stringify({ v: visitor, exp: expiresAt })).toString('base64url');
  const signature = createHmac('sha256', secret).update(encoded).digest('hex');
  return response.status(200).json({ token: `${encoded}.${signature}`, expires_at: expiresAt });
}

