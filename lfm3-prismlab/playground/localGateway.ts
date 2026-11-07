import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { closeSync, openSync, readFileSync, statSync } from 'node:fs';
import { spawn, type ChildProcess } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const loopback = new Set(['localhost','127.0.0.1','[::1]']);
const backend = process.env.PRISMLAB_BACKEND_URL || 'http://127.0.0.1:8000';
const textRouter = process.env.PRISMLAB_TEXT_ROUTER_URL || 'http://127.0.0.1:8080';
const textAlias = process.env.PRISMLAB_TEXT_MODEL_ALIAS || 'lfm3-1.7b';
const multiRouter = process.env.PRISMLAB_MULTIMODAL_ROUTER_URL || process.env.PRISMLAB_ROUTER_URL || 'http://127.0.0.1:8188';
const localTokenFile = resolve(dirname(fileURLToPath(import.meta.url)), '..', '.prismlab-local', 'token');
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function localToken(): string | null {
  try {
    const stat = statSync(localTokenFile);
    if (!stat.isFile() || (stat.mode & 0o077) !== 0 || stat.uid !== process.getuid?.()) return null;
    return readFileSync(localTokenFile, 'utf8').trim() || null;
  } catch { return null; }
}
function liveToken(): string | null {
  if (process.env.PRISMLAB_GATEWAY_ENABLED === '0') return null;
  if (process.env.PRISMLAB_GATEWAY_ENABLED === '1' && process.env.PRISMLAB_LIVE_TOKEN) return process.env.PRISMLAB_LIVE_TOKEN;
  return process.env.PRISMLAB_GATEWAY_ENABLED === undefined ? localToken() : null;
}
function localUrl(raw: string): URL {
  const url = new URL(raw);
  if (url.protocol !== 'http:' || !loopback.has(url.hostname) || url.username || url.password || url.search || url.hash || !url.port) throw new Error('Gateway upstream must be local HTTP with an explicit port.');
  return url;
}
function send(res: ServerResponse, code: number, data: unknown) { res.statusCode=code; res.setHeader('Content-Type','application/json; charset=utf-8'); res.setHeader('Cache-Control','no-store'); res.setHeader('X-Content-Type-Options','nosniff'); res.end(JSON.stringify(data)); }
function safeRequest(req: IncomingMessage): boolean {
  const local = req.socket.localAddress?.replace(/^::ffff:/,'');
  if (!local || !loopback.has(local) && local !== '::1') return false;
  const host = req.headers.host; if (!host) return false;
  let hostUrl: URL;
  try { hostUrl = new URL(`http://${host}`); } catch { return false; }
  if (!loopback.has(hostUrl.hostname)) return false;
  const origin = req.headers.origin;
  if (origin && origin !== hostUrl.origin) return false;
  const fetchSite = req.headers['sec-fetch-site'];
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') return false;
  return true;
}
async function probe(raw: string, expectedId?: string): Promise<boolean> {
  try {
    const url=localUrl(raw);
    const key = process.env.PRISMLAB_TEXT_RUNTIME_API_KEY || localToken();
    const headers=key && expectedId ? {Authorization:`Bearer ${key}`} : {};
    const response=await fetch(new URL('/health',url),{headers,signal:AbortSignal.timeout(900)});
    if (!response.ok) return false;
    if (!expectedId) return true;
    const models=await fetch(new URL('/v1/models',url),{headers,signal:AbortSignal.timeout(900)});
    if (!models.ok) return false;
    const payload=await models.json() as {data?: Array<{id?: string}>};
    return payload.data?.some(model=>model.id===expectedId)===true;
  } catch { return false; }
}
async function activeModel(raw: string): Promise<string | null> {
  try {
    const url=localUrl(raw);
    const key = process.env.PRISMLAB_TEXT_RUNTIME_API_KEY || localToken();
    const headers = key ? { Authorization: `Bearer ${key}` } : {};
    const health=await fetch(new URL('/health',url),{headers,signal:AbortSignal.timeout(900)});
    if (!health.ok) return null;
    const models=await fetch(new URL('/v1/models',url),{headers,signal:AbortSignal.timeout(900)});
    if (!models.ok) return null;
    const payload=await models.json() as {data?: Array<{id?: string}>};
    return payload.data?.find(model=>typeof model.id==='string')?.id || null;
  } catch { return null; }
}
export function localGateway(): Plugin {
  localUrl(backend); localUrl(textRouter); localUrl(multiRouter);
  return { name:'prismlab-local-gateway', apply:'serve', configureServer(server) {
    let busy = false;
    let ownedBackend: ChildProcess | null = null;
    let startingBackend: Promise<void> | null = null;
    const canAutoStart = (token: string | null) => !!token && localToken() === token && process.env.PRISMLAB_AUTO_START !== '0' && backend === 'http://127.0.0.1:8000';
    const ensureBackend = (token: string) => {
      if (startingBackend) return startingBackend;
      startingBackend = (async () => {
        try {
          const health = await fetch(new URL('/health',backend),{signal:AbortSignal.timeout(900)});
          if (health.ok) return;
        } catch { /* The local backend may need to start. */ }
        if (!canAutoStart(token)) throw new Error('Local backend is offline. Enable the on-demand runtime first.');
        const log = openSync(resolve(projectRoot,'.prismlab-local','backend-auto.log'),'a',0o600);
        try {
          ownedBackend = spawn(process.env.PRISMLAB_PYTHON || 'python3', ['-m','uvicorn','prismlab.api_server:app','--host','127.0.0.1','--port','8000','--no-access-log'], {
            cwd: projectRoot,
            env: {...process.env, PRISMLAB_LIVE_ENABLED:'1', PRISMLAB_ON_DEMAND:'1', PRISMLAB_LIVE_TOKEN:token, PRISMLAB_TEXT_RUNTIME_API_KEY:token, PRISMLAB_TEXT_RUNTIME_API_KEY_FILE:localTokenFile, PRISMLAB_TEXT_ROUTER_URL:textRouter, PRISMLAB_MULTIMODAL_ROUTER_URL:multiRouter},
            stdio:['ignore',log,log],
          });
        } finally { closeSync(log); }
        for (let i=0;i<100;i++) {
          if (ownedBackend?.exitCode !== null || ownedBackend?.signalCode) throw new Error('Local backend could not start; inspect its private log.');
          try {
            const response=await fetch(new URL('/health',backend),{signal:AbortSignal.timeout(900)});
            if (response.ok) {
              const state=await response.json() as {live_inference_enabled?:boolean;on_demand_enabled?:boolean};
              if (state.live_inference_enabled && state.on_demand_enabled) return;
              throw new Error('A different backend is running on the local port.');
            }
          } catch (error) { if (error instanceof Error && error.message.includes('different backend')) throw error; }
          await new Promise(resolve=>setTimeout(resolve,150));
        }
        throw new Error('Local backend startup timed out.');
      })().finally(()=>{startingBackend=null});
      return startingBackend;
    };
    server.httpServer?.once('close',()=>{if(ownedBackend && ownedBackend.exitCode===null) ownedBackend.kill();});
    server.middlewares.use('/local-api', async (req,res) => {
      if (!safeRequest(req)) return send(res,403,{detail:'Local same-origin requests only.'});
      const path=(req.url || '').split('?')[0];
      if (path === '/status' && req.method === 'GET') {
        let health: Record<string, unknown> | null=null;
        try { const response=await fetch(new URL('/health',backend),{signal:AbortSignal.timeout(900)}); if (response.ok) health=await response.json() as Record<string,unknown>; } catch { /* unavailable */ }
        const [textReady,multiAlias]=await Promise.all([probe(textRouter,textAlias),activeModel(multiRouter)]);
        const multiReady=!!multiAlias;
        const onDemandRoutes=Array.isArray(health?.on_demand_routes) ? health.on_demand_routes.filter((route): route is string => typeof route === 'string') : [];
        const enabled = !!liveToken();
        const autoStartAvailable=!health && canAutoStart(liveToken());
        return send(res,200,{gateway_enabled:enabled,backend_available:!!health,backend_live_enabled:health?.live_inference_enabled===true,auto_start_available:autoStartAvailable,inference_busy:busy,text_model_available:textReady,multimodal_model_available:multiReady,multimodal_model_alias:multiAlias,on_demand_routes:onDemandRoutes,backend_mode:health?.mode,reason:!enabled?'Operator has not enabled the local gateway and supplied a token.':autoStartAvailable?'The local backend and selected model start when you send.':!health?'FastAPI backend is offline.':health.live_inference_enabled!==true?'Backend live inference is disabled.':onDemandRoutes.length?'Models are ready to load when a request arrives.':!textReady && !multiReady?'No local model server responded.':'Local gateway ready; check the task route before submitting.'});
      }
      if (!['/text','/text/stream','/execute','/execute/stream'].includes(path) || req.method !== 'POST') return send(res,404,{detail:'Unknown local gateway endpoint.'});
      const token = liveToken();
      if (!token) return send(res,403,{detail:'Local gateway disabled by operator.'});
      if (busy) return send(res,409,{detail:'Another model is processing. Wait for it to finish.'});
      if (req.headers['content-type']?.split(';')[0] !== 'application/json') return send(res,415,{detail:'JSON required.'});
      const controller = new AbortController();
      const onClientClose = () => {
        if (!res.writableEnded) {
          try { controller.abort(); } catch {}
        }
      };
      res.once('close', onClientClose);
      busy = true;
      const chunks: Buffer[]=[]; let size=0;
      try {
        for await (const chunk of req) { size+=chunk.length; if (size>16_000_000) return send(res,413,{detail:'Request exceeds 16 MB.'}); chunks.push(chunk); }
        const body=Buffer.concat(chunks);
        JSON.parse(body.toString('utf8'));
        await ensureBackend(token);
        const target=path==='/text/stream'?'/api/v1/live/text/stream':path==='/text'?'/api/v1/live/text':path==='/execute/stream'?'/api/v1/live/execute/stream':'/api/v1/live/execute';
        const timeoutSignal = AbortSignal.timeout(180_000);
        const fetchSignal = (AbortSignal as any).any ? (AbortSignal as any).any([controller.signal, timeoutSignal]) : controller.signal;
        const response=await fetch(new URL(target,backend),{method:'POST',headers:{'Content-Type':'application/json','x-prismlab-token':token},body,signal:fetchSignal});
        res.statusCode=response.status;res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
        if((path==='/text/stream'||path==='/execute/stream')&&response.ok&&response.body){
          res.setHeader('Content-Type','text/event-stream; charset=utf-8');res.setHeader('X-Accel-Buffering','no');
          const reader=response.body.getReader();
          while(true){
            if (res.destroyed) {
              await reader.cancel().catch(() => {});
              break;
            }
            const {done,value}=await reader.read();
            if(done)break;
            if(!res.destroyed)res.write(Buffer.from(value));
          }
          if(!res.destroyed)res.end();
        }else{res.setHeader('Content-Type','application/json; charset=utf-8');res.end(await response.text());}
      } catch (error) { if(res.headersSent){if(!res.destroyed)res.end();}else send(res,error instanceof SyntaxError?400:502,{detail:error instanceof SyntaxError?'Invalid JSON.':error instanceof Error?error.message:'Local backend request failed or timed out.'}); }
      finally {
        res.off('close', onClientClose);
        busy = false;
      }
    });
  } };
}
