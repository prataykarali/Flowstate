// Vercel Serverless API: /api/league/rating
// Submits model rating (1-5 stars); updates existing rating rather than stacking

const CANONICAL_MODEL_IDS = new Set(['text', 'vision', 'audio', 'omni', 'd1', 'd1_omni']);

// Transient ratings map per visitor: `${visitor_id}:${model_id}` -> stars
const memoryRatings = new Map();

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const body = request.body || {};
  const { visitor_id, model_id, stars } = body;

  if (!visitor_id || typeof visitor_id !== 'string') {
    return response.status(422).json({ error: 'Missing or invalid visitor_id' });
  }
  if (!model_id || !CANONICAL_MODEL_IDS.has(model_id)) {
    return response.status(422).json({ error: `Invalid model_id: ${model_id}` });
  }
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return response.status(422).json({ error: 'Stars must be an integer between 1 and 5' });
  }

  const ratingKey = `${visitor_id}:${model_id}`;
  const oldStars = memoryRatings.get(ratingKey) || 0;
  const deltaPoints = (stars * 2) - (oldStars * 2);
  memoryRatings.set(ratingKey, stars);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const headers = {
        apikey: supabaseKey,
        'Content-Type': 'application/json',
      };
      if (supabaseKey.startsWith('eyJ')) {
        headers.Authorization = `Bearer ${supabaseKey}`;
      }

      const rpcRes = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/record_championship_rating`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          p_visitor_id: visitor_id,
          p_model_id: model_id,
          p_stars: stars,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (rpcRes.ok) {
        const result = await rpcRes.json();
        return response.status(200).json({ status: 'success', data: result, persisted: true });
      } else {
        const errBody = await rpcRes.text();
        return response.status(502).json({
          error: 'Database transaction rejected by Supabase',
          detail: errBody,
          persisted: false,
        });
      }
    } catch (err) {
      return response.status(503).json({
        error: 'Database transaction failed: ' + (err.message || String(err)),
        persisted: false,
      });
    }
  }

  return response.status(200).json({
    status: 'recorded',
    visitor_id,
    model_id,
    stars,
    delta_points: deltaPoints,
    persisted: false,
  });
}
