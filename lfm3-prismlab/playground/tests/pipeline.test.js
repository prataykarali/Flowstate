import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';

const playground = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const project = resolve(playground, '..');
const source = readFileSync(resolve(playground, 'src/data/pipeline.ts'), 'utf8');
const compiled = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const pipeline = await import(`data:text/javascript,${encodeURIComponent(compiled)}`);
const ids = ['text','vision','audio','omni','d1','d1_omni'];

test('canonical README topology has all core stages, registry dependency, and six mascot paths', () => {
  const edges = new Set(pipeline.PIPELINE_EDGES.map(([a,b])=>`${a}:${b}`));
  for (const pair of ['request:engine','engine:router','registry:router','router:dispatcher','output:evaluation']) assert.ok(edges.has(pair));
  for (const id of ids) { assert.ok(edges.has(`dispatcher:${id}`)); assert.ok(edges.has(`${id}:output`)); }
  assert.equal(pipeline.PIPELINE_EDGES.length, 17);
});

test('browser route preview matches the canonical Python deterministic router', () => {
  const inputs = [];
  for (let bits=0;bits<8;bits++) inputs.push(['text',...['image','video','audio'].filter((_,index)=>bits&(1<<index))]);
  const cases = ['chat','speech','decision'].flatMap(task=>inputs.map(modalities=>({task,inputs:modalities})));
  const code = `import json,sys\nfrom prismlab.core.router import select_model\nrows=json.loads(sys.stdin.read())\nprint(json.dumps([select_model(row['task'],set(row['inputs'])) for row in rows]))`;
  const run = spawnSync('python3',['-c',code],{cwd:project,input:JSON.stringify(cases),encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  const expected = JSON.parse(run.stdout);
  assert.deepEqual(cases.map(row=>pipeline.predictRoute(row.task,row.inputs)),expected);
  assert.deepEqual(new Set(pipeline.ROUTE_EXAMPLES.map(row=>pipeline.predictRoute(row.task,row.inputs))),new Set(ids));
});

test('six public replay records contain only registered routes and preserved stages', () => {
  for (const id of ids) {
    const replay = JSON.parse(readFileSync(resolve(project,`results/p6/public_replays/${id}.json`),'utf8'));
    assert.equal(replay.mode,'recorded_replay');
    assert.equal(replay.slug,id);
    assert.deepEqual(replay.route,[id]);
    assert.ok(replay.trace.length>0);
    assert.ok(replay.trace.every(stage=>typeof stage.stage==='string' && typeof stage.status==='string'));
  }
});
