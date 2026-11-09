// Vercel Serverless API: /api/league/standings
// Returns global six-model Championship standings with cached snapshot fallback

const CANONICAL_MODELS = [
  { id: 'text', name: 'Prism Pure', family: 'LFM3-1.7B' },
  { id: 'vision', name: 'Spectra', family: 'LFM3-VL-2B' },
  { id: 'audio', name: 'Echo', family: 'LFM3-Audio-2B' },
  { id: 'omni', name: 'Omni Pup', family: 'LFM3-Omni-2B' },
  { id: 'd1', name: 'Prism Thinker', family: 'd1-2B' },
  { id: 'd1_omni', name: 'Sherlock Omni', family: 'd1-Omni-2B' },
];

// Fallback in-memory state if database is pending or unreachable
let memoryStandings = CANONICAL_MODELS.map(m => ({
  model_id: m.id,
  display_name: m.name,
  model_family: m.family,
  total_points: 0,
  chat_points: 0,
  story_points: 0,
  trivia_points: 0,
  arcade_points: 0,
  rating_points: 0,
  other_eligible_points: 0,
  last_activity_at: null,
}));

let lastDbFetch = 0;
let cachedResponse = null;
let memoryVisitorCount = 42;
let memoryEventsCount = 0;

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=15');
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  let standingsData = memoryStandings;
  let dataSource = 'unconnected';

  if (supabaseUrl && supabaseKey) {
    try {
      const headers = {
        apikey: supabaseKey,
        'Content-Type': 'application/json',
      };
      if (supabaseKey.startsWith('eyJ')) {
        headers.Authorization = `Bearer ${supabaseKey}`;
      }

      const [totalsRes, eventsRes, ratingsRes] = await Promise.all([
        fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/championship_totals?select=*&order=total_points.desc`, {
          headers,
          signal: AbortSignal.timeout(4000),
        }),
        fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/championship_events?select=visitor_id`, {
          headers,
          signal: AbortSignal.timeout(4000),
        }).catch(() => null),
        fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/championship_ratings?select=visitor_id`, {
          headers,
          signal: AbortSignal.timeout(4000),
        }).catch(() => null),
      ]);

      if (totalsRes && totalsRes.ok) {
        const rows = await totalsRes.json();
        if (Array.isArray(rows) && rows.length > 0) {
          standingsData = CANONICAL_MODELS.map(m => {
            const found = rows.find(r => r.model_id === m.id);
            return {
              model_id: m.id,
              display_name: m.name,
              model_family: m.family,
              total_points: found ? Number(found.total_points || 0) : 0,
              chat_points: found ? Number(found.chat_points || 0) : 0,
              story_points: found ? Number(found.story_points || 0) : 0,
              trivia_points: found ? Number(found.trivia_points || 0) : 0,
              arcade_points: found ? Number(found.arcade_points || found.other_eligible_points || 0) : 0,
              rating_points: found ? Number(found.rating_points || 0) : 0,
              other_eligible_points: found ? Number(found.other_eligible_points || 0) : 0,
              last_activity_at: found?.last_activity_at || null,
            };
          });
          memoryStandings = standingsData;
          dataSource = 'supabase_postgres';
          lastDbFetch = Date.now();
        } else {
          dataSource = 'supabase_empty';
        }
      } else {
        dataSource = 'database_query_error';
      }

      const visitorSet = new Set();
      if (eventsRes && eventsRes.ok) {
        try {
          const events = await eventsRes.json();
          if (Array.isArray(events)) {
            memoryEventsCount = events.length;
            events.forEach(e => { if (e && e.visitor_id) visitorSet.add(e.visitor_id); });
          }
        } catch {}
      }
      if (ratingsRes && ratingsRes.ok) {
        try {
          const ratings = await ratingsRes.json();
          if (Array.isArray(ratings)) {
            ratings.forEach(r => { if (r && r.visitor_id) visitorSet.add(r.visitor_id); });
          }
        } catch {}
      }
      if (visitorSet.size > 0) {
        memoryVisitorCount = visitorSet.size;
      }
    } catch (err) {
      dataSource = 'database_unreachable';
    }
  }

  // Compute ranks: sort descending by total_points
  const allZero = standingsData.every(s => s.total_points === 0);
  const sorted = [...standingsData].sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points;
    return a.model_id.localeCompare(b.model_id);
  });

  let currentRank = 1;
  const ranked = sorted.map((item, index) => {
    if (allZero) {
      return { ...item, rank: null, unranked: true };
    }
    if (item.total_points === 0) {
      return { ...item, rank: null, unranked: true };
    }
    if (index > 0 && item.total_points < sorted[index - 1].total_points) {
      currentRank = index + 1;
    }
    return { ...item, rank: currentRank, unranked: false };
  });

  const totalPointsSum = standingsData.reduce((sum, s) => sum + (s.total_points || 0), 0);

  return response.status(200).json({
    standings: ranked,
    all_unranked: allZero,
    total_models: ranked.length,
    total_visitors: memoryVisitorCount,
    total_points_awarded: totalPointsSum,
    total_events: memoryEventsCount,
    data_source: dataSource,
    updated_at: new Date().toISOString(),
  });
}
