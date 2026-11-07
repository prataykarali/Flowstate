// Vercel Serverless API: /api/league/event
// Server-authoritative scoring endpoint for verified activities
import crypto from 'node:crypto';

const CANONICAL_MODEL_IDS = new Set(['text', 'vision', 'audio', 'omni', 'd1', 'd1_omni']);

const MODEL_MAP = {
  'lfm3-1.7b': 'text',
  'lfm3-text': 'text',
  'text': 'text',
  'lfm3-vl-2b': 'vision',
  'lfm3-vision': 'vision',
  'vision': 'vision',
  'lfm3-audio-2b': 'audio',
  'lfm3-audio': 'audio',
  'audio': 'audio',
  'lfm3-omni-2b': 'omni',
  'omni': 'omni',
  'd1-2b': 'd1',
  'd1': 'd1',
  'd1_omni-2b': 'd1_omni',
  'd1_omni': 'd1_omni',
};

const ACTIVITY_MAP = {
  ocr: 'chat',
  audio_qa: 'chat',
  video_qa: 'chat',
  transcribe: 'chat',
  summarize: 'chat',
  decision: 'chat',
};

const ALLOWED_ACTIVITY_POINTS = {
  chat: 4,
  ocr: 4,
  audio_qa: 4,
  video_qa: 4,
  transcribe: 4,
  summarize: 4,
  decision: 4,
  story_turn: 1,
  story_complete: 10,
  trivia_correct: 100,
  trivia_match: 0,
};

// In-memory event deduplication set
const processedEvents = new Set();
const processedReceipts = new Set();

function verifyReceipt(receipt, secret) {
  if (!receipt || typeof receipt !== 'string') return null;
  const parts = receipt.split('.');
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  if (signature.length !== 64) return null;
  try {
    const canonicalJson = Buffer.from(encoded, 'base64url');
    const expected = crypto.createHmac('sha256', secret)
      .update(Buffer.concat([Buffer.from('prismlab:receipt:v1:', 'utf-8'), canonicalJson]))
      .digest('hex');
    const sigBuf = Buffer.from(signature, 'hex');
    const expBuf = Buffer.from(expected, 'hex');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    const payload = JSON.parse(canonicalJson.toString('utf-8'));
    const now = Date.now() / 1000;
    if (payload.exp < now || payload.iat > now + 60) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const body = request.body || {};
  let { event_id, visitor_id, activity_receipt, source_receipt_id } = body;

  if (!event_id || typeof event_id !== 'string') {
    return response.status(422).json({ error: 'Missing or invalid event_id' });
  }
  if (!visitor_id || typeof visitor_id !== 'string') {
    return response.status(422).json({ error: 'Missing or invalid visitor_id' });
  }

  // Session secret for receipt verification
  const sessionSecret = process.env.PRISMLAB_SESSION_SECRET;
  let verifiedModelId = MODEL_MAP[body.model_id] || body.model_id;
  let verifiedActivityType = body.activity_type;
  let verifiedReceiptId = source_receipt_id;

  if (sessionSecret) {
    if (!activity_receipt) {
      return response.status(403).json({ error: 'Proof of inference required: missing activity_receipt' });
    }
    const verified = verifyReceipt(activity_receipt, sessionSecret);
    if (!verified) {
      return response.status(403).json({ error: 'Invalid, forged, or expired activity receipt' });
    }

    // 1. Authorize authentic visitor ownership from cryptographically verified receipt
    if (body.visitor_id && body.visitor_id !== verified.vis) {
      return response.status(403).json({
        error: `Visitor identity mismatch: receipt issued to ${verified.vis}, cannot score for ${body.visitor_id}`
      });
    }
    visitor_id = verified.vis;

    // 2. Authorize authentic model identity from cryptographically verified receipt
    const receiptModel = MODEL_MAP[verified.mod] || verified.mod;
    if (body.model_id) {
      const clientModel = MODEL_MAP[body.model_id] || body.model_id;
      if (clientModel && clientModel !== receiptModel) {
        return response.status(403).json({
          error: `Model mismatch: receipt was issued for model '${receiptModel}', cannot score for '${clientModel}'`
        });
      }
    }
    verifiedModelId = receiptModel;

    // 3. Strict domain separation and activity eligibility
    const reqAct = body.activity_type || ACTIVITY_MAP[verified.act] || verified.act || 'chat';
    if (reqAct === 'trivia_correct' || reqAct === 'trivia_match') {
      if (verified.act !== 'trivia') {
        return response.status(403).json({
          error: `Forbidden: Receipt for activity '${verified.act}' is not eligible for trivia scoring`
        });
      }
      verifiedActivityType = reqAct;
    } else if (reqAct === 'story_turn') {
      if (verified.act !== 'story') {
        return response.status(403).json({
          error: `Forbidden: Receipt for activity '${verified.act}' is not eligible for story turns`
        });
      }
      verifiedActivityType = 'story_turn';
    } else if (reqAct === 'story_complete') {
      if (verified.act !== 'story' && verified.act !== 'story_complete') {
        return response.status(403).json({
          error: `Forbidden: Receipt for activity '${verified.act}' is not eligible for story completion`
        });
      }
      verifiedActivityType = 'story_complete';
    } else if (reqAct === 'chat') {
      if (verified.act === 'trivia' || verified.act === 'story' || verified.act === 'story_complete') {
        return response.status(403).json({
          error: `Forbidden: Activity receipt for '${verified.act}' cannot be claimed as general chat`
        });
      }
      verifiedActivityType = 'chat';
    } else if (reqAct in ALLOWED_ACTIVITY_POINTS) {
      if (verified.act !== reqAct && verified.act !== 'chat') {
        return response.status(403).json({
          error: `Forbidden: Receipt for activity '${verified.act}' cannot be claimed for '${reqAct}'`
        });
      }
      verifiedActivityType = reqAct;
    } else {
      return response.status(422).json({ error: `Unsupported activity_type: ${reqAct}` });
    }

    // 4. Cryptographic receipt idempotency binding
    verifiedReceiptId = `${verified.req}:${verifiedActivityType}`;
  }

  if (!verifiedModelId || !CANONICAL_MODEL_IDS.has(verifiedModelId)) {
    return response.status(422).json({ error: `Invalid model_id: ${verifiedModelId}` });
  }
  if (!verifiedActivityType || !(verifiedActivityType in ALLOWED_ACTIVITY_POINTS)) {
    return response.status(422).json({ error: `Unsupported activity_type: ${verifiedActivityType}` });
  }

  // Server-authoritative point calculation (strictly server enforced)
  const awardedPoints = ALLOWED_ACTIVITY_POINTS[verifiedActivityType];
  verifiedActivityType = ACTIVITY_MAP[verifiedActivityType] || verifiedActivityType;

  // Idempotency check
  if (processedEvents.has(event_id)) {
    return response.status(200).json({ status: 'duplicate', message: 'Event already processed' });
  }
  if (verifiedReceiptId && processedReceipts.has(verifiedReceiptId)) {
    return response.status(200).json({ status: 'duplicate', message: 'Receipt already processed' });
  }

  processedEvents.add(event_id);
  if (verifiedReceiptId) processedReceipts.add(verifiedReceiptId);

  // Attempt database persistence
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

      const rpcRes = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/record_championship_event`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          p_event_id: event_id,
          p_visitor_id: visitor_id,
          p_model_id: verifiedModelId,
          p_activity_type: verifiedActivityType,
          p_points: awardedPoints,
          p_source_receipt_id: verifiedReceiptId || null,
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
    status: 'recorded_transient',
    event_id,
    model_id: verifiedModelId,
    activity_type: verifiedActivityType,
    points: awardedPoints,
    persisted: false,
    warning: 'Database unlinked; recorded transiently',
  });
}
