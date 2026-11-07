import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { localGateway } from './localGateway.ts';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const modelIds = ['text', 'vision', 'audio', 'omni', 'd1', 'd1_omni'];
const assets = new Map<string, { source: string; type: string }>();
for (const id of modelIds) {
  assets.set(`/research/replays/${id}.json`, { source: `results/p6/public_replays/${id}.json`, type: 'application/json' });
  assets.set(`/research/p7/models/${id}_v2.html`, { source: `visuals/p7/models/${id}_v2.html`, type: 'text/html; charset=utf-8' });
  assets.set(`/research/mermaid/p7_execution_v1/p7_${id}.mmd`, { source: `visuals/mermaid/p7_execution_v1/p7_${id}.mmd`, type: 'text/plain; charset=utf-8' });
}
assets.set('/research/PrismLabs_Architecture_Extended_P7_NAV_v2.html', { source: 'visuals/PrismLabs_Architecture_Extended_P7_NAV_v2.html', type: 'text/html; charset=utf-8' });
for (const name of ['p7_03_phase_local_strict_success.png', 'p7_04_phase_local_latency.png', 'p7_05_p5_decision_evidence.png']) {
  assets.set(`/research/figures/${name}`, { source: `docs/p7/figures/${name}`, type: 'image/png' });
}

function canonicalResearchAssets(): Plugin {
  return {
    name: 'canonical-research-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const asset = assets.get(new URL(req.url || '/', 'http://local').pathname);
        if (!asset) return next();
        try {
          res.setHeader('Content-Type', asset.type);
          res.end(readFileSync(resolve(projectRoot, asset.source)));
        } catch { res.statusCode = 404; res.end('Research asset unavailable'); }
      });
    },
    generateBundle() {
      for (const [url, asset] of assets) {
        this.emitFile({ type: 'asset', fileName: url.slice(1), source: readFileSync(resolve(projectRoot, asset.source)) });
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), canonicalResearchAssets(), localGateway()],
  server: { port: Number(process.env.PRISMLAB_PLAYGROUND_PORT || 5173), host: '127.0.0.1', strictPort: true }
});
