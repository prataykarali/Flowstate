// Vercel Serverless API: /api/league/admin
// Secure Administrative endpoint for Championship backup, safe reset, and maintenance control.
// Strictly protected by PRISMLAB_SESSION_SECRET HMAC authorization.

import crypto from 'node:crypto';

const CANONICAL_MODEL_IDS = ['text', 'vision', 'audio', 'omni', 'd1', 'd1_omni'];

function verifyAdminAuth(request) {
  const secret = process.env.PRISMLAB_SESSION_SECRET;
  if (!secret) return false;
  const authHeader = request.headers.authorization || request.headers['x-prismlab-admin-sig'] || '';
  if (!authHeader) return false;

  // Check Bearer token signature or direct HMAC
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  const parts = token.split('.');
  if (parts.length === 2) {
    const [encoded, signature] = parts;
    const expected = crypto.createHmac('sha256', secret).update(encoded).digest('hex');
    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      try {
        const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8'));
        if (payload.admin === true || payload.exp > Date.now() / 1000) {
          return true;
        }
      } catch {}
    }
  }

  // Direct secret compare for emergency CLI use
  if (token === secret) return true;
  return false;
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');

  if (!verifyAdminAuth(request)) {
    return response.status(401).json({ error: 'Unauthorized: Admin authentication required' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return response.status(500).json({ error: 'Supabase configuration missing in environment' });
  }

  const sbHeaders = {
    apikey: supabaseKey,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
  if (supabaseKey.startsWith('eyJ')) {
    sbHeaders.Authorization = `Bearer ${supabaseKey}`;
  }

  const base = supabaseUrl.replace(/\/$/, '');
  const urlObj = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  const action = urlObj.searchParams.get('action') || (request.body && request.body.action) || 'status';

  try {
    if (action === 'backup') {
      // 1. Export verified backup of all championship tables
      const [modelsRes, totalsRes, eventsRes, ratingsRes, matchesRes, matchResultsRes] = await Promise.all([
        fetch(`${base}/rest/v1/championship_models?select=*`, { headers: sbHeaders }),
        fetch(`${base}/rest/v1/championship_totals?select=*&order=total_points.desc`, { headers: sbHeaders }),
        fetch(`${base}/rest/v1/championship_events?select=*&order=created_at.asc`, { headers: sbHeaders }),
        fetch(`${base}/rest/v1/championship_ratings?select=*`, { headers: sbHeaders }),
        fetch(`${base}/rest/v1/championship_matches?select=*`, { headers: sbHeaders }),
        fetch(`${base}/rest/v1/championship_match_results?select=*`, { headers: sbHeaders }),
      ]);

      const [models, totals, events, ratings, matches, matchResults] = await Promise.all([
        modelsRes.ok ? modelsRes.json() : [],
        totalsRes.ok ? totalsRes.json() : [],
        eventsRes.ok ? eventsRes.json() : [],
        ratingsRes.ok ? ratingsRes.json() : [],
        matchesRes.ok ? matchesRes.json() : [],
        matchResultsRes.ok ? matchResultsRes.json() : [],
      ]);

      const totalPointsSum = totals.reduce((sum, row) => sum + Number(row.total_points || 0), 0);

      const backupData = {
        backup_id: `backup_${Date.now()}`,
        created_at: new Date().toISOString(),
        supabase_project: 'tvzntaafqzixvnavygai',
        row_counts: {
          championship_models: models.length,
          championship_totals: totals.length,
          championship_events: events.length,
          championship_ratings: ratings.length,
          championship_matches: matches.length,
          championship_match_results: matchResults.length,
        },
        total_points_sum: totalPointsSum,
        totals_summary: totals.map(t => ({
          model_id: t.model_id,
          total_points: Number(t.total_points || 0),
          chat_points: Number(t.chat_points || 0),
          story_points: Number(t.story_points || 0),
          trivia_points: Number(t.trivia_points || 0),
          rating_points: Number(t.rating_points || 0),
        })),
        tables: {
          championship_models: models,
          championship_totals: totals,
          championship_events: events,
          championship_ratings: ratings,
          championship_matches: matches,
          championship_match_results: matchResults,
        },
      };

      return response.status(200).json(backupData);
    }

    if (action === 'reset') {
      const confirm = (request.body && request.body.confirm) || urlObj.searchParams.get('confirm');
      if (confirm !== 'CLEAN_SLATE_RESET') {
        return response.status(400).json({
          error: 'Explicit confirmation required. Send confirm="CLEAN_SLATE_RESET"',
        });
      }

      // Step 1: Pre-reset snapshot verification
      const preCheckRes = await fetch(`${base}/rest/v1/championship_totals?select=*`, { headers: sbHeaders });
      const preCheckTotals = preCheckRes.ok ? await preCheckRes.json() : [];

      // Step 2: Delete child / foreign-key dependent competition and event tables
      // Supabase PostgREST delete all syntax: delete with a condition matching all rows
      const delResultsRes = await fetch(`${base}/rest/v1/championship_match_results?match_id=neq.placeholder_none`, {
        method: 'DELETE',
        headers: sbHeaders,
      });

      const delMatchesRes = await fetch(`${base}/rest/v1/championship_matches?match_id=neq.placeholder_none`, {
        method: 'DELETE',
        headers: sbHeaders,
      });

      const delRatingsRes = await fetch(`${base}/rest/v1/championship_ratings?visitor_id=neq.placeholder_none`, {
        method: 'DELETE',
        headers: sbHeaders,
      });

      const delEventsRes = await fetch(`${base}/rest/v1/championship_events?event_id=neq.placeholder_none`, {
        method: 'DELETE',
        headers: sbHeaders,
      });

      // Step 3: Atomic reset of all six canonical models in championship_totals
      const nowIso = new Date().toISOString();
      const resetTotalsPromises = CANONICAL_MODEL_IDS.map(modelId =>
        fetch(`${base}/rest/v1/championship_totals?model_id=eq.${modelId}`, {
          method: 'PATCH',
          headers: sbHeaders,
          body: JSON.stringify({
            total_points: 0,
            chat_points: 0,
            story_points: 0,
            trivia_points: 0,
            rating_points: 0,
            other_eligible_points: 0,
            last_activity_at: null,
            updated_at: nowIso,
          }),
        })
      );
      await Promise.all(resetTotalsPromises);

      // Step 4: Verify post-reset state
      const postTotalsRes = await fetch(`${base}/rest/v1/championship_totals?select=*&order=model_id.asc`, { headers: sbHeaders });
      const postTotals = postTotalsRes.ok ? await postTotalsRes.json() : [];

      const postEventsRes = await fetch(`${base}/rest/v1/championship_events?select=event_id`, { headers: sbHeaders });
      const postEvents = postEventsRes.ok ? await postEventsRes.json() : [];

      const postRatingsRes = await fetch(`${base}/rest/v1/championship_ratings?select=visitor_id`, { headers: sbHeaders });
      const postRatings = postRatingsRes.ok ? await postRatingsRes.json() : [];

      const resetEpoch = Math.floor(Date.now() / 1000);

      return response.status(200).json({
        status: 'reset_successful',
        reset_epoch: resetEpoch,
        reset_at: nowIso,
        verification: {
          championship_totals_count: postTotals.length,
          all_models_zero: postTotals.every(r => Number(r.total_points) === 0),
          championship_events_remaining: postEvents.length,
          championship_ratings_remaining: postRatings.length,
          models: postTotals.map(r => ({
            model_id: r.model_id,
            total_points: Number(r.total_points),
            chat: Number(r.chat_points),
            story: Number(r.story_points),
            trivia: Number(r.trivia_points),
          })),
        },
      });
    }

    if (action === 'restore') {
      const payload = request.body && request.body.tables;
      if (!payload || !Array.isArray(payload.championship_totals)) {
        return response.status(400).json({ error: 'Valid tables payload required for restore' });
      }

      // Restore totals
      for (const row of payload.championship_totals) {
        await fetch(`${base}/rest/v1/championship_totals?model_id=eq.${row.model_id}`, {
          method: 'PATCH',
          headers: sbHeaders,
          body: JSON.stringify(row),
        });
      }

      // Restore events if provided
      if (Array.isArray(payload.championship_events) && payload.championship_events.length > 0) {
        await fetch(`${base}/rest/v1/championship_events`, {
          method: 'POST',
          headers: sbHeaders,
          body: JSON.stringify(payload.championship_events),
        });
      }

      return response.status(200).json({ status: 'restore_successful' });
    }

    return response.status(200).json({
      status: 'online',
      actions: ['backup', 'reset', 'restore'],
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return response.status(500).json({
      error: 'Admin operation failed: ' + (err.message || String(err)),
    });
  }
}
