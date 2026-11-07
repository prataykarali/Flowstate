import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../src/lib/chatPrompt.ts',import.meta.url),'utf8');
const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {buildChatPrompt} = await import(`data:text/javascript,${encodeURIComponent(compiled)}`);
test('chat prompt retains chronological turns and latest message',()=>{
 const result=buildChatPrompt([{role:'you',text:'One'},{role:'model',text:'Two'}],'Three');
 assert.equal(result.prompt,'Continue this conversation. Reply to the latest user message in 120 words or fewer.\nUser: One\nAssistant: Two\nUser: Three');
 assert.equal(result.truncated,false);
});
test('chat prompt drops oldest turns within the real endpoint limit',()=>{
 const result=buildChatPrompt([{role:'you',text:'A'.repeat(600)},{role:'model',text:'B'.repeat(400)}],'Latest');
 assert.equal(result.truncated,true);assert.ok(!result.prompt.includes('A'.repeat(600)));assert.ok(result.prompt.endsWith('User: Latest'));assert.ok(result.prompt.length<=1000);
});
test('chat prompt rejects an oversized latest message',()=>assert.throws(()=>buildChatPrompt([],'X'.repeat(1000)),/limit/));
test('chat prompt keeps a bounded part of the latest assistant answer',()=>{
 const result=buildChatPrompt([{role:'you',text:'What is memory?'},{role:'model',text:'A fixed recurrent state can bound memory use. '.repeat(30)}],'Summarize your answer.');
 assert.equal(result.truncated,true);
 assert.ok(result.prompt.includes('Assistant: A fixed recurrent state'));
 assert.ok(result.prompt.includes('[truncated]'));
 assert.ok(result.prompt.length<=1000);
});
test('research archive points at exact P1–P7 published paths',()=>{
 const research=readFileSync(new URL('../src/pages/Research.tsx',import.meta.url),'utf8');
 for(const [phase,path] of ['p1/README.md','p2/README.md','p3/README.md','p4/P4_FINAL_REPORT.md','p5/README.md','p6/README.md','p7/P7_FINAL_REPORT.md'].entries())assert.ok(research.includes(`docPath: 'docs/${path}'`),`P${phase+1}`);
 assert.ok(research.includes('Read full research'));
});

// S2 Verification Tests
test('S2: Character switching order follows canonical model roster', () => {
  const models = readFileSync(new URL('../src/data/models.ts', import.meta.url), 'utf8');
  const expectedOrder = ['text', 'vision', 'audio', 'omni', 'd1', 'd1_omni'];
  for (const id of expectedOrder) {
    assert.ok(models.includes(`id: '${id}'`), `Missing model ${id}`);
  }
  const chat = readFileSync(new URL('../src/pages/Chat.tsx', import.meta.url), 'utf8');
  assert.ok(chat.includes('const roster = MODEL_LIST.map(item => item.id);'), 'Chat uses MODEL_LIST roster');
  assert.ok(chat.includes('switchTo(roster[(roster.indexOf(model) + direction + roster.length) % roster.length])'), 'Step function cycles roster in order');
});

test('S2: Single active main mascot on stage with accessories intact', () => {
  const chat = readFileSync(new URL('../src/pages/Chat.tsx', import.meta.url), 'utf8');
  const mascotMounts = (chat.match(/<Mascot\s/g) || []).length;
  assert.equal(mascotMounts, 1, 'Chat page must mount exactly one primary Mascot component');
  assert.ok(chat.includes('key={model}'), 'Mascot must be keyed on model to preserve distinct instance and accessories');
  assert.ok(chat.includes('className={`chat-stage-mascot is-${phase}`}'), 'Active mascot wrapped in stage container');
});

test('S2: Interrupted transitions and rapid switching cancel prior timers', () => {
  const chat = readFileSync(new URL('../src/pages/Chat.tsx', import.meta.url), 'utf8');
  assert.ok(chat.includes('window.clearTimeout(switchTimer.current)'), 'Must cancel pending switch timer on new switch');
  assert.ok(chat.includes('target.current = id;'), 'Must track target model during rapid transitions');
  assert.ok(chat.includes("if (phaseRef.current === 'leaving') return;"), 'Prevents overlapping exit transitions');
});

test('S2: Animation state cleanup on unmount', () => {
  const chat = readFileSync(new URL('../src/pages/Chat.tsx', import.meta.url), 'utf8');
  assert.ok(chat.includes('window.clearTimeout(switchTimer.current)'), 'Effect cleanup must clear switchTimer');
  assert.ok(chat.includes('media.removeEventListener'), 'Effect cleanup removes media listeners');
  assert.ok(chat.includes('document.removeEventListener'), 'Effect cleanup removes visibility listener');
});

test('S2: Reduced-motion bypasses transitions cleanly', () => {
  const chat = readFileSync(new URL('../src/pages/Chat.tsx', import.meta.url), 'utf8');
  assert.ok(chat.includes("window.matchMedia('(prefers-reduced-motion: reduce)')"), 'Checks prefers-reduced-motion');
  assert.ok(chat.includes("setPhase('idle'); setModel(id)"), 'Instantly sets model and idle phase for reduced motion');
});

test('S2: Chat stage shows only a fresh reply with reduced-motion support', () => {
  const chat = readFileSync(new URL('../src/pages/Chat.tsx', import.meta.url), 'utf8');
  assert.ok(chat.includes('const latestReply = stageReply;'));
  assert.ok(chat.includes('setStageReply(null), 12000'));
  assert.ok(chat.includes('latestReply.text.slice(0, Math.min(visibleChars, 500))') || chat.includes('latestReply.text.slice(0, Math.min(visibleChars, 115))'));
  assert.ok(chat.includes('Full reply in history →'));
  assert.ok(chat.includes('if (reduced) { setVisibleChars(latestReply.text.length)'));
});

test('S2: Offline handling never fabricates model results', () => {
  const chat = readFileSync(new URL('../src/pages/Chat.tsx', import.meta.url), 'utf8');
  assert.ok(chat.includes('Local model offline'), 'Status indicator truthfully reflects offline');
  assert.ok(chat.includes('Starts when you send'), 'Local automatic startup is identified');
  assert.ok(chat.includes('disabled={!ready || pending || !canSend'), 'Send button strictly disabled when offline or missing required input');
});

test('S2: Responsive layout supports mobile without overflow', () => {
  const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  assert.ok(css.includes('.chat-world'), 'Contains .chat-world styles');
  assert.ok(css.includes('@media(max-width:700px)'), 'Contains mobile breakpoint');
  assert.ok(css.includes('env(safe-area-inset-bottom)'), 'Composer handles mobile safe area');
  assert.ok(css.includes('.chat-side-roster'), 'Provides compact switcher controls');
});

test('S2: GitHub source links and independent attribution', () => {
  const research = readFileSync(new URL('../src/pages/Research.tsx', import.meta.url), 'utf8');
  const appShell = readFileSync(new URL('../src/components/AppShell.tsx', import.meta.url), 'utf8');
  assert.ok(research.includes('https://github.com/prataykarali/Flowstate/blob/main/lfm3-prismlab/docs/p7/P7_FINAL_REPORT.md'), 'Links to P7 final report');
  assert.ok(research.includes('https://github.com/prataykarali/Flowstate/blob/main/lfm3-prismlab/'), 'Links to phase documentation');
  assert.ok(appShell.includes('Not affiliated with Liquid AI'), 'Explicit non-affiliation notice present');
  assert.ok(appShell.includes('https://github.com/prataykarali/Flowstate'), 'Footer links to project repository');
});
