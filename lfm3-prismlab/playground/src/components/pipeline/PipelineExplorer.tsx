import type { LiveResult } from '../../lib/api.ts';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useExperience } from '../../app/ExperienceContext.tsx';
import { MODEL_LIST, MODELS, type CanonicalModelId } from '../../data/models.ts';
import { PIPELINE_EDGES, ROUTE_EXAMPLES, predictRoute, type InputModality, type TaskCategory } from '../../data/pipeline.ts';
import { loadRecordedReplays, type RecordedReplay } from '../../lib/replays.ts';
import { Mascot } from '../mascots/Mascot.tsx';

type Edge = { from: string; to: string; d: string };
const coreNodes = [
  { id: 'request', title: 'User request', note: 'Task + input modalities' },
  { id: 'engine', title: 'Python pipeline', note: 'Request and lifecycle' },
  { id: 'router', title: 'Deterministic router', note: 'Task + modality rules' },
  { id: 'dispatcher', title: 'Local dispatcher', note: 'Selected model path' }
];
const statusText = (replay: RecordedReplay | null, selected: boolean, routed: boolean, stage: number): string => {
  if (replay && routed && stage >= 0) return stage >= replay.trace.length - 1 ? 'Recorded replay' : 'Recorded trace';
  if (routed) return replay ? 'Recorded route' : 'Predicted route';
  return selected ? 'Selected for inspection' : 'Registered · historically tested';
};

export const PipelineExplorer: React.FC<{ compact?: boolean; routeInput?: { task: TaskCategory; inputs: InputModality[] }; liveResult?: LiveResult | null; livePending?: boolean }> = ({ compact = false, routeInput, liveResult, livePending = false }) => {
  const { selectedModelId, setSelectedModelId } = useExperience();
  const [exampleId, setExampleId] = useState('text');
  const [replays, setReplays] = useState<RecordedReplay[]>([]);
  const [replayError, setReplayError] = useState('');
  const [replayId, setReplayId] = useState('');
  const [step, setStep] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [canvas, setCanvas] = useState({ width: 1, height: 1 });
  const mapRef = useRef<HTMLDivElement>(null);
  const example = ROUTE_EXAMPLES.find(item => item.id === exampleId) || ROUTE_EXAMPLES[0];
  const replay = liveResult || livePending ? null : replays.find(item => item.slug === replayId) || null;
  const routeTask = routeInput?.task || example.task;
  const routeInputs = routeInput?.inputs || example.inputs;
  const routedId = (liveResult?.route?.[0] as CanonicalModelId | undefined) || replay?.route[0] || predictRoute(routeTask, routeInputs);
  const routeSupported = routeInputs.every(input => MODELS[routedId].inputModalities.includes(input));
  const selected = MODELS[selectedModelId];
  const traceStage = replay && step >= 0 ? replay.trace[step] : null;

  useEffect(() => { loadRecordedReplays().then(setReplays).catch(() => setReplayError('The local replay archive could not be loaded. Route previews still work.')); }, []);
  useEffect(() => { const media = window.matchMedia('(prefers-reduced-motion: reduce)'); const update = () => { setReducedMotion(media.matches); if (media.matches) setPlaying(false); }; media.addEventListener('change', update); return () => media.removeEventListener('change', update); }, []);
  useEffect(() => {
    if (!playing || !replay) return;
    const timer = window.setTimeout(() => {
      if (step >= replay.trace.length - 1) setPlaying(false);
      else setStep(current => current + 1);
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [playing, replay, step]);
  useEffect(() => { setPlaying(false); }, [replayId, exampleId]);

  useLayoutEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const measure = () => {
      const bounds = map.getBoundingClientRect();
      const rects = new Map<string, DOMRect>();
      map.querySelectorAll<HTMLElement>('[data-node]').forEach(node => rects.set(node.dataset.node || '', node.getBoundingClientRect()));
      const paths: Edge[] = [];
      for (const [from, to] of PIPELINE_EDGES) {
        const a = rects.get(from), b = rects.get(to);
        if (!a || !b) continue;
        const sameRow = Math.abs((a.top+a.bottom)/2 - (b.top+b.bottom)/2) < 35;
        const x1 = sameRow ? a.right - bounds.left : (a.left+a.right)/2-bounds.left;
        const y1 = sameRow ? (a.top+a.bottom)/2-bounds.top : a.bottom-bounds.top;
        const x2 = sameRow ? b.left - bounds.left : (b.left+b.right)/2-bounds.left;
        const y2 = sameRow ? (b.top+b.bottom)/2-bounds.top : b.top-bounds.top;
        const d = sameRow ? `M ${x1} ${y1} C ${(x1+x2)/2} ${y1}, ${(x1+x2)/2} ${y2}, ${x2} ${y2}` : `M ${x1} ${y1} C ${x1} ${(y1+y2)/2}, ${x2} ${(y1+y2)/2}, ${x2} ${y2}`;
        paths.push({from,to,d});
      }
      setCanvas({width: Math.max(bounds.width,1),height:Math.max(bounds.height,1)});
      setEdges(paths);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(map);
    map.querySelectorAll<HTMLElement>('[data-node]').forEach(node => observer.observe(node));
    measure();
    return () => observer.disconnect();
  }, [compact]);

  const chooseExample = (id: string) => {
    const next = ROUTE_EXAMPLES.find(item => item.id === id) || ROUTE_EXAMPLES[0];
    setExampleId(id); setReplayId(''); setStep(-1);
    setSelectedModelId(predictRoute(next.task, next.inputs));
  };
  const chooseReplay = (id: string) => {
    setReplayId(id); setStep(id ? 0 : -1);
    const next = replays.find(item => item.slug === id);
    if (next?.route[0]) setSelectedModelId(next.route[0]);
  };
  const isActive = (from: string, to: string) => {
    if (replay) {
      if (step < 0) return false;
      const stage = replay.trace[step]?.stage;
      const routing = ['routing','evidence','lifecycle','inference'].includes(stage);
      if (from === 'request' && to === 'engine') return routing;
      if (from === 'engine' && to === 'router') return routing;
      if (from === 'registry' && to === 'router') return routing;
      if (from === 'router' && to === 'dispatcher') return stage === 'lifecycle' || stage === 'inference';
      if (from === 'dispatcher' && to === routedId) return stage === 'lifecycle' || stage === 'inference';
      if (from === routedId && to === 'output') return stage === 'inference';
      return false;
    }
    if (!routeSupported && (from === 'dispatcher' || from === routedId || from === 'output')) return false;
    return ['request:engine','engine:router','registry:router','router:dispatcher',`dispatcher:${routedId}`].includes(`${from}:${to}`);
  };
  const shownOutput = !!replay && step === replay.trace.length - 1;

  return <section className={`pipeline-explorer ${compact ? 'pipeline-explorer--compact' : ''}`} aria-label="Interactive PrismLab execution pipeline">
    <div className="pipeline-intro">
      <div><p className="eyebrow">Living pipeline explorer</p><h2>Follow a request through PrismLab</h2><p>See how task and modality rules choose one of six specialists. Select a preserved P6 run to inspect its actual trace.</p></div>
      <span className="pipeline-mode">{liveResult ? 'Local live result' : livePending ? 'Awaiting local result' : replay ? 'Recorded P6 replay' : 'Route preview · no execution'}</span>
    </div>
    <div className="pipeline-controls">
      {!routeInput && <label>Try a route example<select aria-label="Route example" value={exampleId} onChange={event => chooseExample(event.target.value)}>{ROUTE_EXAMPLES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>}
      <label>Inspect a recorded run<select aria-label="Recorded run" value={replayId} onChange={event => chooseReplay(event.target.value)}><option value="">No recorded run selected</option>{replays.map(item => <option key={item.slug} value={item.slug}>{item.title} · {MODELS[item.route[0]].name}</option>)}</select></label>
    </div>
    {replayError && <p className="pipeline-error" role="status">{replayError}</p>}
    <div className="pipeline-facts" aria-live="polite"><span><strong>Input</strong>{replay ? 'Not in replay record' : routeInputs.join(' + ')}</span><span><strong>Task</strong>{replay ? 'Not in replay record' : routeTask}</span><span><strong>Route</strong>{MODELS[routedId].name}</span><span><strong>State</strong>{liveResult ? liveResult.status : livePending ? 'Awaiting result' : replay ? 'Historical run' : routeSupported ? 'Prediction only' : 'Registry mismatch'}</span></div>
    <div className="pipeline-map" ref={mapRef}>
      <svg className="pipeline-edges" viewBox={`0 0 ${canvas.width} ${canvas.height}`} preserveAspectRatio="none" aria-hidden="true"><defs><marker id="pipeline-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="none" stroke="#b9d8ee" strokeWidth="1.4" /></marker></defs>{edges.map(edge => <path key={`${edge.from}-${edge.to}`} d={edge.d} className={isActive(edge.from,edge.to) ? 'pipeline-edge is-active' : 'pipeline-edge'} markerEnd="url(#pipeline-arrow)" />)}</svg>
      <div className="pipeline-registry" data-node="registry"><strong>Model registry</strong><span>Six registered capabilities inform the router</span></div>
      <div className="pipeline-core-row">{coreNodes.map(node => <div className={`pipeline-node ${node.id === 'router' && (replay ? step >= 0 : true) ? 'is-route' : ''}`} data-node={node.id} key={node.id}><strong>{node.title}</strong><span>{node.note}</span></div>)}</div>
      <div className="pipeline-model-row" aria-label="Six model pathways">{MODEL_LIST.map(model => <div key={model.id} className={`pipeline-model-node ${routedId === model.id ? 'is-routed' : ''} ${selectedModelId === model.id ? 'is-inspected' : ''}`} data-node={model.id} style={{'--model-accent':model.themeColor} as React.CSSProperties}><Mascot model={model} isSelected={selectedModelId === model.id} onSelect={choice => setSelectedModelId(choice.id)} /><span className="pipeline-model-status">{statusText(replay,selectedModelId===model.id,routedId===model.id,step)}</span></div>)}</div>
      <div className="pipeline-end-row"><div className="pipeline-node" data-node="output"><strong>Output / stream</strong><span>{liveResult ? 'Live result available below' : livePending ? 'Awaiting result' : replay && shownOutput ? 'Recorded result available below' : 'Only after real inference'}</span></div><div className="pipeline-node" data-node="evaluation"><strong>Evaluation + logging</strong><span>Research records and limitations</span></div></div>
    </div>
    <div className="pipeline-bottom">
      <div className="pipeline-detail" aria-live="polite"><p className="eyebrow">Selected specialist</p><h3 style={{color:selected.themeColor}}>{selected.characterName} <span>{selected.name}</span></h3><p>{selected.specialty}</p><dl><div><dt>Input</dt><dd>{selected.inputModalities.join(' · ')}</dd></div><div><dt>Output</dt><dd>{selected.outputModalities.join(' · ')}</dd></div><div><dt>Evidence</dt><dd>Registered pathway; P6 historical validation</dd></div></dl><a href={`https://huggingface.co/${selected.repo}`} target="_blank" rel="noreferrer">Official model repository ↗</a></div>
      <div className="pipeline-trace"><p className="eyebrow">{liveResult ? 'Live execution trace' : livePending ? 'Pending local request' : replay ? 'Recorded trace' : 'Route preview'}</p>{liveResult ? <><h3>{liveResult.status} · {liveResult.request_id}</h3><p>Actual route: {liveResult.route?.join(' → ') || liveResult.model || 'not returned'}</p><div className="trace-steps">{liveResult.trace?.map((item,index)=><span key={index}>{index+1}. {item.stage} · {item.status}{item.model ? ` · ${item.model}` : ''}{item.latency_s != null ? ` · ${item.latency_s.toFixed(2)} s` : ''}{item.note ? ` · ${item.note}` : ''}</span>)}</div>{liveResult.warnings?.map((item,index)=><p key={index}>Warning: {item}</p>)}</> : livePending ? <p>Request sent. Stage timings and route will appear only if the backend returns them.</p> : replay ? <><h3>{replay.title}</h3><p className="pipeline-source">Source: <a href={`/research/replays/${replay.slug}.json`} target="_blank" rel="noreferrer">P6 preserved replay JSON ↗</a> · {replay.metrics.total_latency_s.toFixed(2)} s recorded total</p><div className="trace-controls"><button onClick={() => setPlaying(!playing)} disabled={reducedMotion} title={reducedMotion ? 'Use step controls with reduced motion' : undefined} aria-label={playing ? 'Pause trace' : 'Play trace'}>{playing ? 'Pause' : 'Play'}</button><button onClick={() => {setPlaying(false);setStep(0);}}>Restart</button><button onClick={() => {setPlaying(false);setStep(Math.max(0,step-1));}} disabled={step<=0} aria-label="Previous trace stage">← Step</button><button onClick={() => {setPlaying(false);setStep(Math.min(replay.trace.length-1,step+1));}} disabled={step>=replay.trace.length-1} aria-label="Next trace stage">Step →</button></div><div className="trace-steps">{replay.trace.map((item,index)=><button key={`${item.stage}-${index}`} className={step===index?'is-current':''} aria-current={step===index?'step':undefined} onClick={()=>{setPlaying(false);setStep(index);}}>{index+1}. {item.stage}</button>)}</div><div className="trace-inspector" aria-live="polite">{traceStage && <><strong>{traceStage.stage} · {traceStage.status}</strong><p>{traceStage.model ? `Model: ${MODELS[traceStage.model].name}` : 'No model field in this trace stage.'}{traceStage.latency_s !== null ? ` · Measured stage latency ${traceStage.latency_s.toFixed(2)} s` : ' · No stage latency recorded.'}</p></>}</div>{shownOutput && <div className="trace-output"><strong>Recorded output</strong><p>{replay.output}</p>{replay.evaluation && <small>Expected: {replay.evaluation.expected} · This single example was {replay.evaluation.correct ? 'correct' : 'incorrect'}. {replay.evaluation.scope}.</small>}</div>}<small className="trace-caveat">Step pacing is illustrative; use step controls when reduced motion is preferred. The preserved trace has stage durations but no per-stage start timestamps. This does not reconstruct neural execution. {replay.limitations}</small></> : <><h3>{MODELS[routedId].characterName} is the predicted route</h3><p>{routeInput ? 'Your task and modality choices determine this route. ' : example.detail + ' '}{routeSupported ? '' : 'The chosen inputs exceed this model’s registered capabilities, so the pipeline would reject the request. '}This browser preview mirrors the deterministic rules in <code>prismlab/core/router.py</code>; it does not call a model.</p><p className="pipeline-source">Source: <a href="https://github.com/prataykarali/Flowstate/blob/main/lfm3-prismlab/prismlab/core/router.py" target="_blank" rel="noreferrer">Router implementation ↗</a></p></>}</div>
    </div>
  </section>;
};
