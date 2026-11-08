import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const playground=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const repo=resolve(playground,'..');
const charDir = resolve(repo, 'characters');
if (!existsSync(charDir)) {
  console.log('Characters source directory not present (e.g. Vercel deployment); keeping committed runner-prototype');
  process.exit(0);
}
const vite=resolve(playground,'node_modules/.bin/vite');
const run=spawnSync(vite,['build','--base','/runner-prototype/','--outDir',resolve(playground,'public/runner-prototype')],{cwd:resolve(repo,'characters'),stdio:'inherit'});
if(run.status!==0)process.exit(run.status||1);
for(const name of readdirSync(resolve(playground,'public/runner-prototype/assets'))){
 if(!/^index-.*\.(js|css)$/.test(name))continue;
 const path=resolve(playground,'public/runner-prototype/assets',name);
 const source=readFileSync(path,'utf8');
 writeFileSync(path,source.replaceAll('/media/backgrounds/','/runner-prototype/media/backgrounds/').replaceAll('/assets/runner-','/runner-prototype/assets/runner-'));
}
