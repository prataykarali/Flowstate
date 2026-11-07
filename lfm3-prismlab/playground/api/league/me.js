// Vercel Serverless API: /api/league/me
// Returns personal contribution summary for visitor

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const visitorId = request.query.visitor_id || 'anonymous';
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey && visitorId !== 'anonymous') {
    try {
      const headers = {
        apikey: supabaseKey,
        'Content-Type': 'application/json',
      };
      if (supabaseKey.startsWith('eyJ')) {
        headers.Authorization = `Bearer ${supabaseKey}`;
      }

      const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/championship_events?visitor_id=eq.${encodeURIComponent(visitorId)}&select=*`, {
        headers,
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const events = await res.json();
        return response.status(200).json({
          visitor_id: visitorId,
          total_contributions: events.length,
          events,
        });
      }
    } catch (err) {
      // Fallback
    }
  }

  return response.status(200).json({
    visitor_id: visitorId,
    total_contributions: 0,
    events: [],
  });
}
