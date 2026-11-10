import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../src/lib/league.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { scoreEvent, recordLeagueEvent, readLeagueEvents, leagueStandings } = await import(`data:text/javascript,${encodeURIComponent(compiled)}`);
const req = n => n.toString(16).padStart(32, '0');
const base = (activity, modelId='text', sessionId='session-1') => ({ activity, modelId, sessionId, completionStatus:'completed', validationStatus:'validated', evidenceRef:'verified-test-fixture', timestamp:'2026-11-04T10:00:00Z' });
const trivia = (id=1, model='text', session='quiz-a') => ({ ...base('trivia_correct',model,session), questionId:id, answerIndex:1, correctIndex:1, sourceUrl:'https://example.test/source' });
let serial=0;const id=()=>`event-${++serial}`;
test('validated trivia only; idempotent across retry, session, and character switch',()=>{
 const first=scoreEvent([],trivia(),id); assert.equal(first.event.pointsEarned,100);
 assert.equal(scoreEvent(first.events,trivia(),id).event,null);
 assert.equal(scoreEvent(first.events,trivia(1,'vision','quiz-b'),id).event,null);
 assert.equal(scoreEvent([], {...trivia(),answerIndex:0},id).event,null);
 assert.equal(scoreEvent([], {...trivia(),completionStatus:'failed'},id).event,null);
});
test('global trivia daily cap and fresh-day allowance',()=>{
 let events=[];for(let q=1;q<=4;q++)events=scoreEvent(events,trivia(q),id).events;
 assert.equal(scoreEvent(events,trivia(5),id).event,null);
 assert.ok(scoreEvent(events,{...trivia(1),timestamp:'2026-11-05T10:00:00Z'},id).event);
});
test('runner awards once at final tier and locks owner to starting character',()=>{
 const run={...base('runner_completed','vision','run-a'),score:155,started:true};
 const result=scoreEvent([],run,id);assert.equal(result.event.pointsEarned,100);assert.equal(result.event.modelId,'vision');
 assert.equal(scoreEvent(result.events,{...run,modelId:'omni'},id).event,null);
 assert.equal(scoreEvent([],{...run,started:false},id).event,null);
 assert.equal(scoreEvent([],{...run,score:24},id).event,null);
 assert.equal(scoreEvent([],{...run,score:75},id).event.pointsEarned,100);
 assert.equal(scoreEvent([],{...run,score:25},id).event.pointsEarned,100);
});
test('only distinct completed model request IDs qualify for chat or story',()=>{
 const chat={...base('chat_session'),requestIds:[req(1),req(2)]};
 assert.equal(scoreEvent([],chat,id).event.pointsEarned,100);
 assert.equal(scoreEvent([],{...chat,requestIds:[req(1),req(1)]},id).event,null);
 assert.equal(scoreEvent([],{...chat,requestIds:['fake',req(2)]},id).event,null);
 assert.equal(scoreEvent([],{...base('story_contribution'),requestId:req(3)},id).event.pointsEarned,100);
 assert.equal(scoreEvent([],{...base('story_session_complete'),requestIds:[req(3),req(4)]},id).event.pointsEarned,100);
 assert.equal(scoreEvent([],{...base('auto_story_participation')},id).event,null);
});
test('daily caps bound chat, story, and runner participation',()=>{
 let events=[];
 for(let n=1;n<=2;n++)events=scoreEvent(events,{...base('runner_completed','text',`run-${n}`),score:25,started:true},id).events;
 assert.equal(scoreEvent(events,{...base('runner_completed','text','run-3'),score:25,started:true},id).event,null);
 events=[];for(let n=1;n<=3;n++)events=scoreEvent(events,{...base('story_contribution'),requestId:req(n)},id).events;
 assert.equal(scoreEvent(events,{...base('story_contribution'),requestId:req(4)},id).event,null);
});
test('local event persistence, rank ties, breakdown, and tier transitions',()=>{
 const data=new Map();const storage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};
 const a=recordLeagueEvent(trivia(1,'text'),storage);assert.equal(a.event.pointsEarned,100);
 assert.equal(recordLeagueEvent(trivia(1,'text'),storage).event,null);
 assert.equal(readLeagueEvents(storage).length,1);
 const tied=scoreEvent(a.events,trivia(2,'vision'),id).events;
 let standings=leagueStandings(tied);
 assert.equal(standings[0].rank,1);assert.equal(standings[1].rank,1);assert.equal(standings[2].rank,null);
 assert.equal(standings.find(item=>item.modelId==='text').breakdown.trivia_correct,100);
 const boosted=scoreEvent(tied,{...base('runner_completed','text','run-tier'),score:150,started:true},id).events;
 standings=leagueStandings(boosted);
 assert.equal(standings[0].tier,'Prism Star');assert.equal(standings[0].rank,1);assert.ok(standings[0].progress>0);
});
test('chart values are exact report values and include phase-local cautions',()=>{
 const chartSource=readFileSync(new URL('../src/data/researchCharts.ts',import.meta.url),'utf8');
 const chartJs=ts.transpileModule(chartSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 return import(`data:text/javascript,${encodeURIComponent(chartJs)}`).then(({RESEARCH_CHARTS})=>{
  assert.deepEqual(RESEARCH_CHARTS.find(item=>item.id==='p2-ocr').bars.map(item=>item.value),[10,9]);
  assert.deepEqual(RESEARCH_CHARTS.find(item=>item.id==='p3-latency').bars.map(item=>item.value),[13.95,20.18]);
  assert.deepEqual(RESEARCH_CHARTS.find(item=>item.id==='p4-matched').bars.map(item=>item.value),[25,28]);
  assert.match(RESEARCH_CHARTS.find(item=>item.id==='p4-matched').note,/p=0\.25/);
  for(const chart of RESEARCH_CHARTS)assert.ok(chart.sourcePath.startsWith('docs/p'));
 });
});

test('Auto Story scores only actual attributed writer and support turns, once per evidence',()=>{
 const turn=(show,number,model,role)=>({...base('auto_story_turn',model,show),showId:show,turnId:`${show}:${number}`,requestId:req(number),role,liveExecution:true});
 const writer=turn('show-a',1,'text','writer');
 const first=scoreEvent([],writer,id);assert.equal(first.event.pointsEarned,100);assert.equal(first.event.ruleVersion,'s3b.1');
 assert.equal(scoreEvent(first.events,writer,id).event,null);
 assert.equal(scoreEvent(first.events,{...turn('show-b',1,'vision','support'),requestId:req(1)},id).event,null);
 assert.equal(scoreEvent([],turn('show-a',2,'vision','writer'),id).event,null);
 assert.equal(scoreEvent([],{...turn('show-a',2,'vision','support'),liveExecution:false},id).event,null);
 assert.equal(scoreEvent([],{...turn('show-a',2,'vision','support'),completionStatus:'failed'},id).event,null);
 assert.equal(scoreEvent([],{...turn('show-a',2,'vision','support'),requestId:'mock'},id).event,null);
 assert.equal(scoreEvent([],turn('show-a',2,'vision','support'),id).event.pointsEarned,100);
});
test('Auto Story daily turn and session caps, same-show evidence, and replay rejection',()=>{
 const turn=(show,number,model='text',role='writer')=>({...base('auto_story_turn',model,show),showId:show,turnId:`${show}:${number}`,requestId:req(number),role,liveExecution:true});
 let events=[];
 for(let n=1;n<=4;n++)events=scoreEvent(events,turn('show-a',n),id).events;
 assert.equal(scoreEvent(events,turn('show-a',5),id).event,null);
 const session={...base('auto_story_session','text','show-a'),showId:'show-a',requestIds:[req(1),req(2),req(3),req(4)],liveExecution:true};
 const awarded=scoreEvent(events,session,id);assert.equal(awarded.event.pointsEarned,100);
 assert.equal(scoreEvent(awarded.events,session,id).event,null);
 assert.equal(scoreEvent(awarded.events,{...session,showId:'show-b',sessionId:'show-b'},id).event,null);
 assert.equal(scoreEvent(events,{...session,liveExecution:false},id).event,null);
 assert.equal(scoreEvent(events,{...session,requestIds:[req(1),req(2),req(1)]},id).event,null);
});
