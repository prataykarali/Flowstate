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
  rating_points: 0,
  other_eligible_points: 0,
  last_activity_at: null,
}));

let lastDbFetch = 0;
let cachedResponse = null;

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

      const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/championship_totals?select=*&order=total_points.desc`, {
        headers,
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const rows = await res.json();
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
    if (index > 0 && item.total_points < sorted[index - 1].total_points) {
      currentRank = index + 1;
    }
    return { ...item, rank: currentRank, unranked: item.total_points === 0 };
  });

  return response.status(200).json({
    standings: ranked,
    all_unranked: allZero,
    total_models: ranked.length,
    data_source: dataSource,
    updated_at: new Date().toISOString(),
  });
}
