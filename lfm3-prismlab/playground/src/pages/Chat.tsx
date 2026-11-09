import React, { useEffect, useRef, useState } from 'react';
import { Mascot } from '../components/mascots/Mascot.tsx';
import { MascotAvatar } from '../components/mascots/MascotAvatar.tsx';
import { MODEL_LIST, MODELS, type CanonicalModelId } from '../data/models.ts';
import { useExperience } from '../app/ExperienceContext.tsx';
import { buildChatPrompt } from '../lib/chatPrompt.ts';
import { executeLocal, executeLocalStream, generateTextStream, getGatewayStatus, outputText, readMedia, getCurrentActivity, stopActivity, type GatewayStatus, type LiveResult, type LiveTask, type TextStreamUpdate, type ActivitySessionInfo } from '../lib/api.ts';
import { useInferenceLock, cancelActiveInference } from '../lib/inferenceLock.ts';
import { awardChatSession } from '../lib/leagueAdapters.ts';
import { AutoStoryShow, type AutoStoryView } from './AutoStoryShow.tsx';
import { showBeat } from '../lib/storyShow.ts';
import { DecisionStudio } from '../components/DecisionStudio.tsx';
import { parseNaturalDecision, formatDecisionSummary } from '../lib/decisionAdapter.ts';

interface Message { role: 'you' | 'model'; text: string; fullText?: string; speaker?: string; failed?: boolean; requestId?: string; route?: string; status?: string; mode?: string; metrics?: LiveResult['metrics']; trace?: LiveResult['trace']; decisionQuestion?: any; decisionOptions?: string[]; pointsEarned?: number }
const acceptsImage = (id: CanonicalModelId) => MODELS[id].inputModalities.includes('image');
const acceptsAudio = (id: CanonicalModelId) => MODELS[id].inputModalities.includes('audio');
const acceptsVideo = (id: CanonicalModelId) => MODELS[id].inputModalities.includes('video');
const taskFor = (id: CanonicalModelId): LiveTask => id === 'audio' ? 'audio_qa' : id === 'd1' || id === 'd1_omni' ? 'decision' : 'chat';
const runtimeAlias: Record<Exclude<CanonicalModelId, 'text'>, string> = { vision:'lfm3-vision', audio:'lfm3-audio', omni:'lfm3-omni', d1:'d1', d1_omni:'d1-omni' };
const roster = MODEL_LIST.map(item => item.id);
const MAX_REPLY_CHARS = 500;
const MAX_INPUT_CHARS = 900;
const STORAGE_KEY = 'prismlab_character_chats_v2';
const ARCHIVE_KEY = 'prismlab_character_chat_archives_v1';
const emptyChats = () => ({ text: [], vision: [], audio: [], omni: [], d1: [], d1_omni: [] }) as Record<CanonicalModelId, Message[]>;

function loadSavedChats(): Record<CanonicalModelId, Message[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {}
  return emptyChats();
}

function loadArchivedChats(): Record<CanonicalModelId, Message[][]> {
  try {
    const raw = localStorage.getItem(ARCHIVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return { ...emptyChats(), ...parsed };
    }
  } catch {}
  return { text: [], vision: [], audio: [], omni: [], d1: [], d1_omni: [] };
}

interface DecisionOutput {
  predicted_route?: string;
  confidence?: number;
  probabilities?: Record<string, number>;
  exploratory_gate_passed?: boolean;
  human_review_required?: boolean;
  external_action_executed?: boolean;
}

function tryParseDecision(text: string): DecisionOutput | null {
  try {
    const trimmed = text.trim();
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && ('predicted_route' in parsed || 'probabilities' in parsed)) {
      return parsed as DecisionOutput;
    }
  } catch {}
  return null;
}

export const Chat: React.FC = () => {
  const { videoEnabled } = useExperience();
  const [model, setModel] = useState<CanonicalModelId>('text');
  const [phase, setPhase] = useState<'idle' | 'leaving' | 'entering'>('idle');
  const target = useRef<CanonicalModelId>('text');
  const phaseRef = useRef<'idle' | 'leaving' | 'entering'>('idle');
  const switchTimer = useRef<number | null>(null);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [conversations, setConversations] = useState<Record<CanonicalModelId, Message[]>>(loadSavedChats);
  const [archives, setArchives] = useState<Record<CanonicalModelId, Message[][]>>(loadArchivedChats);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const historyBodyRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [gateway, setGateway] = useState<GatewayStatus | null>(null);
  const [pending, setPending] = useState(false);
  const lock = useInferenceLock();
  const isBusy = pending || lock.busy;
  const [error, setError] = useState('');
  const [contextNote, setContextNote] = useState('');
  const [reaction, setReaction] = useState(0);
  const [reactionState, setReactionState] = useState<'happy'|'sad'|'thinking'|'idle'>('idle');
  const [focused, setFocused] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [visibleChars, setVisibleChars] = useState(0);
  const [videoFailed, setVideoFailed] = useState(false);
  const [visible, setVisible] = useState(() => !document.hidden);
  const [stageReply, setStageReply] = useState<Message | null>(null);
  const [streamDraft, setStreamDraft] = useState('');
  const [streamStatus, setStreamStatus] = useState('');
  const [storyMode, setStoryMode] = useState(false);
  const [showAdvancedStudio, setShowAdvancedStudio] = useState(false);
  const [storyView, setStoryView] = useState<AutoStoryView>({show:null,phase:'configuring',preview:'',message:'',pending:false});
  const [chapterCue,setChapterCue]=useState('');
  const lastChapterRef=useRef('');
  const stageReplyRef = useRef<HTMLElement>(null);
  const storySpeakerCount = storyView.show?.turns.length ?? 0;
  // Story stage: start each new speaker at the top, then follow the streaming reply so nothing is cropped.
  useEffect(() => { if (stageReplyRef.current) stageReplyRef.current.scrollTop = 0; }, [storySpeakerCount]);
  useEffect(() => {
    const el = stageReplyRef.current;
    if (el && storyView.preview) el.scrollTop = el.scrollHeight;
  }, [storyView.preview]);

  useEffect(() => {
    const checkStoryStorage = () => {
      if (sessionStorage.getItem('prismlab_open_story') === 'true') {
        sessionStorage.removeItem('prismlab_open_story');
        setStoryMode(true);
      }
    };
    checkStoryStorage();
    const handleOpenStory = () => setStoryMode(true);
    window.addEventListener('prismlab_open_story', handleOpenStory);
    window.addEventListener('hashchange', checkStoryStorage);
    return () => {
      window.removeEventListener('prismlab_open_story', handleOpenStory);
      window.removeEventListener('hashchange', checkStoryStorage);
    };
  }, []);

  const [activeActivity, setActiveActivity] = useState<ActivitySessionInfo | null>(null);

  useEffect(() => {
    let mounted = true;
    const pollActivity = async () => {
      if (document.hidden) return;
      try {
        const res = await getCurrentActivity();
        if (mounted) {
          if (res.active && res.activity && (res.activity.activity_type === 'STORY' || res.activity.activity_type === 'TRIVIA')) {
            setActiveActivity(res.activity);
          } else {
            setActiveActivity(null);
          }
        }
      } catch {}
    };
    void pollActivity();
    const interval = setInterval(pollActivity, 15_000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);


  const messages = conversations[model] || [];
  const historyCount = messages.length + (archives[model] || []).reduce((count, session) => count + session.length, 0);
  useEffect(() => {
    if (!historyDrawerOpen) return;
    const frame = requestAnimationFrame(() => {
      const body = historyBodyRef.current;
      if (body) body.scrollTop = body.scrollHeight;
    });
    return () => cancelAnimationFrame(frame);
  }, [historyDrawerOpen, model, messages.length]);

  const setMessages = (updater: Message[] | ((prev: Message[]) => Message[])) => {
    setConversations(prev => {
      const current = prev[model] || [];
      const next = typeof updater === 'function' ? updater(current) : updater;
      const updated = { ...prev, [model]: next };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  };
  const setArchived = (next: Record<CanonicalModelId, Message[][]>) => {
    setArchives(next);
    try { localStorage.setItem(ARCHIVE_KEY, JSON.stringify(next)); } catch {}
  };
  const newConversation = () => {
    if (messages.length) setArchived({ ...archives, [model]: [messages, ...(archives[model] || [])] });
    setMessages([]); setStageReply(null); setDraft(''); setError(''); setContextNote('');
  };
  const restoreConversation = (index: number) => {
    const saved = archives[model]?.[index];
    if (!saved) return;
    setArchived({ ...archives, [model]: [...(messages.length ? [messages] : []), ...archives[model].filter((_, i) => i !== index)] });
    setMessages(saved); setStageReply(null); setError(''); setContextNote('');
  };

  useEffect(() => {
    void getGatewayStatus(true).then(setGateway);
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotion = () => setReduced(media.matches);
    const onVisibility = () => { setVisible(!document.hidden); if (!document.hidden) void getGatewayStatus(true).then(setGateway); };
    const poll = window.setInterval(() => { if (!document.hidden) void getGatewayStatus(false).then(setGateway); }, 30_000);
    media.addEventListener('change', onMotion);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { media.removeEventListener('change', onMotion); document.removeEventListener('visibilitychange', onVisibility); window.clearInterval(poll); if (switchTimer.current !== null) window.clearTimeout(switchTimer.current); };
  }, []);

  const selectedModelReady = gateway?.on_demand_routes?.includes(model) || (model === 'text' ? !!gateway?.text_model_available : !!gateway?.multimodal_model_available && gateway.multimodal_model_alias === runtimeAlias[model]);
  const ready = !!gateway?.gateway_enabled && ((!!gateway.backend_live_enabled && (selectedModelReady || !!gateway.on_demand_routes?.length)) || !!gateway.auto_start_available);
  const unavailableReason = !gateway ? 'Checking local runtime…' : !gateway.gateway_enabled || !gateway.backend_available || !gateway.backend_live_enabled ? gateway.reason : gateway.inference_busy ? 'Another model is processing; your request can enter the queue.' : model === 'text' && !gateway.text_model_available ? 'Local text model is offline or its identity does not match.' : model !== 'text' && !selectedModelReady ? 'The selected multimodal model is not loaded.' : gateway.reason;
  const switchTo = (id: CanonicalModelId) => {
    if (pending) return;
    void getGatewayStatus().then(setGateway);
    target.current = id;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { if (switchTimer.current !== null) window.clearTimeout(switchTimer.current); phaseRef.current = 'idle'; setPhase('idle'); setModel(id); setStageReply(null); setDraft(''); setImage(null); setAudio(null); setVideo(null); setError(''); setContextNote(''); return; }
    if (phaseRef.current === 'leaving') return;
    if (id === model && phaseRef.current === 'idle') return;
    if (switchTimer.current !== null) window.clearTimeout(switchTimer.current);
    phaseRef.current = 'leaving'; setPhase('leaving');
    switchTimer.current = window.setTimeout(() => {
      setModel(target.current); setStageReply(null); setDraft(''); setImage(null); setAudio(null); setVideo(null); setError(''); setContextNote(''); setMediaOpen(false);
      phaseRef.current = 'entering'; setPhase('entering');
      switchTimer.current = window.setTimeout(() => { phaseRef.current = 'idle'; setPhase('idle'); switchTimer.current = null; }, 420);
    }, 280);
  };
  const step = (direction: number) => switchTo(roster[(roster.indexOf(model) + direction + roster.length) % roster.length]);
  const storyShow=storyView.show;
  const storyLast=storyShow?.turns.at(-1);
  const storyCurrent=storyShow?.turnOrder[Math.min(storyShow.turns.length,storyShow.turnOrder.length-1)];
  const storySpeaker=['presenting_turn','paused','completed','stopped'].includes(storyView.phase)?storyLast?.modelId||storyCurrent:storyCurrent;
  useEffect(()=>{if(storyMode&&storySpeaker&&storySpeaker!==model)switchTo(storySpeaker);},[storyMode,storySpeaker]);
  useEffect(()=>{
    if(!storyMode||!storyShow||!['preparing','loading_model','requesting'].includes(storyView.phase))return;
    const key=`${storyShow.showId}:${storyShow.turns.length}`;
    if(lastChapterRef.current===key)return;
    lastChapterRef.current=key;
    const beat=showBeat(storyShow,Math.min(storyShow.turns.length,storyShow.turnOrder.length-1));
    setChapterCue(({opening:'The Story Begins',development:'The Plot Thickens',climax:'The Climax',ending:'The Ending','support contribution':'A New Clue','support conclusion':'The Final Clues'} as Record<string,string>)[beat]);
    window.setTimeout(()=>setChapterCue(''),2200);
    // The cue keeps its short on-screen lifetime even as the request changes phase.
  },[storyMode,storyShow?.showId,storyShow?.turns.length,storyView.phase]);
  useEffect(()=>{
    if(!storyMode)return;
    const next=storyView.pending?'thinking':storyView.phase==='failed'?'sad':storyView.phase==='presenting_turn'||storyView.phase==='completed'?'happy':'idle';
    setReactionState(next);setReaction(value=>value+1);
  },[storyMode,storyView.pending,storyView.phase]);

  const attachSample = async (kind: 'image' | 'audio' | 'video') => {
    try {
      const url = kind === 'image' ? '/samples/sample.png' : kind === 'audio' ? '/samples/sample.wav' : '/samples/sample.mp4';
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], kind === 'image' ? 'sample.png' : kind === 'audio' ? 'sample.wav' : 'sample.mp4', { type: kind === 'image' ? 'image/png' : kind === 'audio' ? 'audio/wav' : 'video/mp4' });
      if (kind === 'image') setImage(file);
      else if (kind === 'audio') setAudio(file);
      else setVideo(file);
    } catch {}
  };

  const send = async () => {
    if (pending || !ready || !canSend) return;
    let built: ReturnType<typeof buildChatPrompt> | null = null;
    try { if (model === 'text') built = buildChatPrompt(messages.filter(item => !item.failed), draft.trim()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Prompt too long.'); return; }
    const userText = draft.trim();
    setPending(true); setStageReply(null); setStreamDraft(''); setStreamStatus(''); setError(''); setContextNote(built?.truncated ? 'Older context was shortened to fit the 1,000-character text request.' : model === 'text' ? 'Text history is formatted into each single-turn request, up to 1,000 characters.' : 'This pathway receives the latest message and attached media.');
    setReactionState('thinking'); setReaction(n => n + 1);
    const isDecisionModel = model === 'd1' || model === 'd1_omni';
    let parsedDecision: ReturnType<typeof parseNaturalDecision> | null = null;
    if (isDecisionModel) {
      parsedDecision = parseNaturalDecision(userText, model, {
        hasImage: !!image,
        hasAudio: !!audio,
        hasVideo: !!video,
      }, messages);

      if (parsedDecision.kind === 'conversational' || parsedDecision.kind === 'generative_redirect' || parsedDecision.kind === 'clarification') {
        const reply: Message = {
          role: 'model',
          text: parsedDecision.message || '',
          speaker: character.characterName,
          route: parsedDecision.kind === 'generative_redirect' ? 'Generative Recommendation' : parsedDecision.kind === 'clarification' ? 'Decision Clarification' : 'Role Overview',
          status: 'completed',
        };
        setMessages(list => [...list, reply]); setStageReply(reply);
        setReactionState('happy'); setReaction(n => n + 1);
        setPending(false);
        return;
      }
    }
    const activeImage = image;
    const activeAudio = audio;
    const activeVideo = video;
    const attachmentLabel = [activeImage?.name && `Image: ${activeImage.name}`, activeAudio?.name && `Audio: ${activeAudio.name}`, activeVideo?.name && `Video: ${activeVideo.name}`].filter(Boolean).join(' · ');
    setMessages(list => [...list, { role: 'you', text: [userText, attachmentLabel].filter(Boolean).join('\n') }]); setDraft('');

    try {
      const modelPrompt = model === 'd1' || model === 'd1_omni' ? userText : `${userText || 'Describe the attached media.'}\nReply in 120 words or fewer.`;
      const selectedMedia = [activeImage && 'image', activeAudio && 'audio', activeVideo && 'video'].filter((item): item is 'image' | 'audio' | 'video' => !!item);
      const task = model === 'd1' || model === 'd1_omni' ? 'decision' : activeVideo ? 'video_qa' : (model === 'audio' && !activeAudio ? 'chat' : taskFor(model));
      const onStream = (update: TextStreamUpdate) => {
        if (update.kind === 'token') setStreamDraft(value => value + update.text);
        else setStreamStatus(update.message);
      };
      const result: LiveResult = model === 'text'
        ? await generateTextStream(built!.prompt, onStream, 80)
        : (model === 'd1' || model === 'd1_omni')
        ? await executeLocal({
            model,
            task,
            prompt: modelPrompt,
            image: activeImage ? await readMedia(activeImage, 'image') : undefined,
            audio: activeAudio ? await readMedia(activeAudio, 'audio') : undefined,
            video: activeVideo ? await readMedia(activeVideo, 'video') : undefined,
            required_media: selectedMedia.length ? selectedMedia : undefined,
            decision_question: parsedDecision?.question,
            max_tokens: 48,
          })
        : await executeLocalStream({
            model,
            task,
            prompt: modelPrompt,
            image: activeImage ? await readMedia(activeImage, 'image') : undefined,
            audio: activeAudio ? await readMedia(activeAudio, 'audio') : undefined,
            video: activeVideo ? await readMedia(activeVideo, 'video') : undefined,
            required_media: selectedMedia.length ? selectedMedia : undefined,
            max_tokens: 80,
          }, onStream);
      if (result.status === 'completed' && result.output != null) {
        const rawOutput = typeof result.output === 'object' ? JSON.stringify(result.output, null, 2) : outputText(result.output).trim();
        const isDecision = model === 'd1' || model === 'd1_omni';
        const displaySummary = isDecision && typeof result.output === 'object'
          ? formatDecisionSummary({ ...(result.output as any), category: parsedDecision?.category })
          : rawOutput;
        const cleanText = isDecision || displaySummary.length <= MAX_REPLY_CHARS ? displaySummary : `${displaySummary.slice(0, MAX_REPLY_CHARS).trimEnd()}…`;
        const reply: Message = { role: 'model', text: cleanText, fullText: rawOutput, speaker: character.characterName, requestId: result.request_id, route: result.route?.join(' → ') || result.model || 'Local model', status: result.status, mode: result.mode, metrics: result.metrics, trace: result.trace, decisionQuestion: parsedDecision?.question, decisionOptions: parsedDecision?.options, pointsEarned: 4 };
        setMessages(list => [...list, reply]); setStageReply(reply);
        awardChatSession(model, [result.request_id || crypto.randomUUID().replace(/-/g, '')], result.activity_receipt);
        setReactionState('happy'); setReaction(n => n + 1); setImage(null); setAudio(null); setVideo(null);
      } else {
        setError(result.error || `Local request returned ${result.status}; no answer was added.`);
        setMessages(list => list.map((item,index) => index === list.length - 1 && item.role === 'you' ? {...item, failed:true} : item));
        setReactionState(result.status === 'review' ? 'thinking' : 'sad'); setReaction(n => n + 1);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Local request failed.'); setMessages(list => list.map((item,index) => index === list.length - 1 && item.role === 'you' ? {...item, failed:true} : item)); setReactionState('sad'); setReaction(n => n + 1); }
    finally { setPending(false); void getGatewayStatus().then(setGateway); }
  };

  const handleDecisionDone = (result: LiveResult, rawDisplay: string) => {
    const rawOutput = outputText(result.output).trim();
    const reply: Message = {
      role: 'model',
      text: rawOutput || rawDisplay,
      fullText: rawDisplay,
      speaker: character.characterName,
      requestId: result.request_id,
      route: result.route?.join(' → ') || result.model || 'd1',
      status: result.status,
      mode: result.mode,
      metrics: result.metrics,
      trace: result.trace,
      pointsEarned: 4,
    };
    setMessages(list => [...list, reply]);
    setStageReply(reply);
    awardChatSession(model, [result.request_id || crypto.randomUUID().replace(/-/g, '')], result.activity_receipt);
    setReactionState('happy');
    setReaction(n => n + 1);
  };
  const character = MODELS[model];
  const otherCharacters = MODEL_LIST.filter(item => item.id !== model);
  const supported = [acceptsImage(model) ? 'PNG/JPEG image' : null, acceptsAudio(model) ? 'WAV audio' : null, acceptsVideo(model) ? 'MP4 video' : null].filter(Boolean).join(', ');
  const canSend = !lock.busy && (!!draft.trim() || !!image || !!audio || !!video);
  const saveData = (navigator as Navigator & {connection?: {saveData?: boolean}}).connection?.saveData === true;
  const latestReply = stageReply;
  useEffect(() => {
    if (!latestReply) { setVisibleChars(0); return; }
    if (reduced) { setVisibleChars(latestReply.text.length); return; }
    setVisibleChars(0);
    const started = performance.now();
    const duration = Math.min(100, Math.max(30, latestReply.text.length));
    let frame = 0;
    const reveal = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      setVisibleChars(Math.min(latestReply.text.length, Math.ceil(progress * latestReply.text.length)));
      if (progress < 1) frame = requestAnimationFrame(reveal);
    };
    frame = requestAnimationFrame(reveal);
    return () => cancelAnimationFrame(frame);
  }, [latestReply?.requestId, latestReply?.text, reduced]);
  useEffect(() => {
    if (!stageReply) return;
    const timer = window.setTimeout(() => setStageReply(null), 12000);
    return () => window.clearTimeout(timer);
  }, [stageReply?.requestId]);

  const renderDecisionCard = (decision: DecisionOutput, rawText: string) => (
    <div className="chat-decision-card">
      {decision.predicted_route && <p className="chat-decision-summary">Suggested destination: <strong>{decision.predicted_route}</strong>{decision.human_review_required ? '. Human review is required.' : '.'}</p>}
      <div className="chat-decision-top">
        <div className="chat-decision-route-badge">
          <span className="chat-decision-kicker">Predicted Route</span>
          <strong className="chat-decision-val">{decision.predicted_route ? decision.predicted_route.toUpperCase() : 'DECISION'}</strong>
        </div>
        {decision.confidence != null && (
          <div className="chat-decision-conf-badge">
            <span className="chat-decision-kicker">Confidence</span>
            <strong>{(decision.confidence * 100).toFixed(1)}%</strong>
          </div>
        )}
      </div>
      {decision.probabilities && (
        <div className="chat-decision-probs">
          {Object.entries(decision.probabilities)
            .sort(([, a], [, b]) => b - a)
            .map(([cls, prob]) => {
              const pct = Math.round(prob * 100);
              const isBest = cls === decision.predicted_route;
              return (
                <div key={cls} className={`chat-decision-bar-item ${isBest ? 'is-best' : ''}`}>
                  <div className="chat-decision-bar-label">
                    <span>{cls}</span>
                    <span>{(prob * 100).toFixed(1)}%</span>
                  </div>
                  <div className="chat-decision-bar-track">
                    <div className="chat-decision-bar-fill" style={{ width: `${Math.max(4, pct)}%` }} />
                  </div>
                </div>
              );
            })}
        </div>
      )}
      <div className="chat-decision-tags">
        <span className={`chat-decision-tag ${decision.exploratory_gate_passed ? 'is-pass' : 'is-default'}`}>
          Gate: {decision.exploratory_gate_passed ? 'Passed ✓' : 'Standard'}
        </span>
        <span className={`chat-decision-tag ${decision.human_review_required ? 'is-warn' : 'is-ok'}`}>
          Review: {decision.human_review_required ? 'Required ⚠' : 'Auto'}
        </span>
        <span className="chat-decision-tag is-default">
          Action: {decision.external_action_executed ? 'Executed' : 'Held'}
        </span>
      </div>
      <details className="chat-decision-details">
        <summary>View raw JSON</summary>
        <pre>{rawText}</pre>
      </details>
    </div>
  );

  const activeDecision = latestReply ? tryParseDecision(latestReply.text) : null;

  return <div className={`page-chat ${storyMode?'is-story':''}`}><section className="chat-world" aria-label="Conservatory conversation" style={{'--chat-accent': character.themeColor} as React.CSSProperties}>
    {videoEnabled && !reduced && !saveData && visible && !videoFailed && <video className="chat-scene-video" src="/assets/chat_loop.mp4" poster="/assets/chat-stage-v2.webp" muted loop autoPlay playsInline preload="metadata" aria-hidden="true" onError={() => setVideoFailed(true)} />}
    <div className="chat-scene-shade" aria-hidden="true" />
    {lock.busy && (
      <div className="chat-global-lock-banner" role="status">
        <span>
          <strong>{MODELS[lock.modelId || model]?.characterName || 'A model'}</strong> is currently {lock.phase}… Model switching and other AI actions are locked until it completes.
        </span>
        <button type="button" className="chat-cancel-btn" onClick={() => cancelActiveInference()}>Cancel</button>
      </div>
    )}
    <div className="chat-topline">
      <div className="chat-switcher" role="group" aria-label="Choose visual companion; use left and right arrow keys" tabIndex={0} onKeyDown={event => { if (isBusy || storyMode) return; if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); step(event.key === 'ArrowRight' ? 1 : -1); } }}>
        <button type="button" aria-label="Previous character" onClick={() => step(-1)} disabled={isBusy||storyMode}>‹</button>
        <span className="chat-switcher-current">{character.characterName} · {character.name}</span>
        <button type="button" aria-label="Next character" onClick={() => step(1)} disabled={isBusy||storyMode}>›</button>
      </div>
      <div className="chat-topline-right">
        <button type="button" className="chat-story-toggle" onClick={() => { setHistoryDrawerOpen(false);setChapterCue('');setStoryMode(value=>!value); }} disabled={pending||storyView.pending||(storyMode&&storyShow?.status==='active'&&storyView.phase!=='paused')} title={storyMode&&storyShow?.status==='active'&&storyView.phase!=='paused'?'Pause or stop the story before returning to Normal Chat.':undefined} aria-pressed={storyMode}>{storyMode?'← Normal Chat':'✦ Auto Story'}</button>
        <span className={`chat-runtime ${ready ? 'is-ready' : ''}`} role="status">
          {ready ? gateway?.inference_busy ? '◐ AI busy (in queue)' : gateway?.auto_start_available && !gateway.backend_live_enabled ? '● Starts when you send' : gateway?.on_demand_routes?.includes(model) ? '● Ready on request' : '● Local model ready' : '○ Local model offline'}
        </span>
      </div>
    </div>
    <nav className="chat-side-roster" aria-label="Other companions">
      {otherCharacters.map(item => {
        const count = (conversations[item.id] || []).length;
        const isSpeaking = storyMode && storySpeaker === item.id;
        return (
          <button key={item.id} type="button" onClick={() => switchTo(item.id)} disabled={isBusy||storyMode} className={isSpeaking ? 'is-story-speaker' : ''} aria-label={`${isSpeaking ? 'Speaking: ' : ''}Switch to ${item.characterName}, ${item.name}`}>
            <span className="chat-avatar-frame"><MascotAvatar model={item} /></span>
            <span>{item.characterName}</span>
            {isSpeaking && <small className="chat-roster-speaking">♦ Speaking</small>}
            {!isSpeaking && count > 0 && <small className="chat-roster-msg-count">{count}</small>}
          </button>
        );
      })}
    </nav>
    <button
      type="button"
      className="chat-history-side-toggle"
      onClick={() => setHistoryDrawerOpen(v => !v)}
      aria-expanded={historyDrawerOpen}
      aria-label={storyMode?'Toggle story history':`Toggle ${character.characterName} chat history`}
      title={storyMode?'Open full story history':`Open ${character.characterName} chat history (${historyCount} messages)`}
    >
      <span className="chat-history-side-icon" aria-hidden="true">💬</span>
      <span className="chat-history-side-label">{storyMode?'Story History':`${character.characterName} History`}</span>
      {storyMode ? storyShow&&<span className="chat-history-side-badge">{storyShow.turns.length}</span> : historyCount > 0 && <span className="chat-history-side-badge">{historyCount}</span>}
    </button>
    <div className="chat-character-caption"><strong>{character.characterName}</strong><span>{storyMode&&storyShow?`${storyShow.config.theme} · ${showBeat(storyShow,Math.min(storyShow.turns.length,storyShow.turnOrder.length-1))}`:`${character.name} · ${character.inputModalities.join(' + ')}`}</span></div>
    {storyMode&&chapterCue&&<div className="chat-story-cue" role="status">{chapterCue}</div>}
    <div className={`chat-stage-mascot is-${phase}`} data-phase={phase} data-inference-state={storyMode?(storyView.pending?'thinking':storyLast?.status==='completed'?'response-ready':'idle'):pending ? 'thinking' : error ? 'error' : messages.at(-1)?.role === 'model' ? 'response-ready' : 'idle'}><Mascot key={model} model={character} isSelected reactionSignal={reaction} reactionState={reactionState} motion={storyMode?(storyView.pending?'switching':storyView.phase==='presenting_turn'?'celebrating':'idle'):pending ? 'switching' : 'idle'} showAuthoredLine={false} /></div>
    <div className="chat-conversation"><section ref={stageReplyRef} className="chat-history" aria-label="Current character reply" aria-live="polite">
      {storyMode ? storyView.preview ? (
        <article className="chat-message chat-message--model chat-message--story-stream">
          <p>
            {storyView.preview.replace(/<\/?think>/g, '')}
            <span className="chat-typing-caret" aria-hidden="true">▍</span>
          </p>
          <div className="chat-bubble-footer">
            <span className="chat-bubble-speaker">{character.characterName}</span>
            <span className="chat-bubble-char-count">{storyShow ? showBeat(storyShow, Math.min(storyShow.turns.length, storyShow.turnOrder.length - 1)) : 'Story Show'}</span>
          </div>
        </article>
      ) : storyView.pending ? (
        <article className="chat-message chat-message--model chat-message--story-thinking">
          <p>
            {storyView.message || `Loading ${character.characterName} and composing scene…`}
            <span className="chat-typing-caret" aria-hidden="true">▍</span>
          </p>
          <div className="chat-bubble-footer">
            <span className="chat-bubble-speaker">{character.characterName}</span>
            <span className="chat-bubble-char-count">{storyShow ? showBeat(storyShow, Math.min(storyShow.turns.length, storyShow.turnOrder.length - 1)) : 'Thinking…'}</span>
          </div>
        </article>
      ) : storyLast?.status === 'completed' ? (
        <article className="chat-message chat-message--model chat-message--story-completed">
          <p>{storyLast.stageText || storyLast.output || ''}</p>
          <div className="chat-bubble-footer">
            <span className="chat-bubble-speaker">{MODELS[storyLast.modelId]?.characterName || storyLast.modelId}</span>
            <span className="chat-bubble-char-count">{storyShow ? showBeat(storyShow, storyLast.index) : ''} · {(storyLast.stageText || storyLast.output || '').length} chars</span>
          </div>
          <button type="button" className="chat-read-history" onClick={() => setHistoryDrawerOpen(true)}>Story history →</button>
        </article>
      ) : (
        <p className="chat-waiting" role="status">{storyView.message || 'Start a story below to watch the models perform.'}</p>
      ) : pending ? (
        <p className="chat-waiting" role="status">{streamDraft ? <><span className="chat-stream-label">{character.characterName} · streaming live</span>{streamDraft.slice(0, 500)}{streamDraft.length > 500 ? '…' : ''}</> : streamStatus || `Loading ${character.characterName} and answering…`}</p>
      ) : error ? (
        <p className="chat-error" role="alert">{error}</p>
      ) : latestReply ? (
        <article className="chat-message chat-message--model">
          <p style={{ whiteSpace: 'pre-line' }}>{latestReply.text.slice(0, Math.min(visibleChars, 500))}{latestReply.text.length > 500 ? '…' : visibleChars < latestReply.text.length ? <span className="chat-typing-caret" aria-hidden="true">▍</span> : ''}</p>
          <div className="chat-bubble-footer">
            <span className="chat-bubble-speaker">{character.characterName}</span>
            <span className="chat-bubble-char-count">{activeDecision ? 'Structured decision' : `${latestReply.text.length} / ${MAX_REPLY_CHARS} chars`}</span>
            {latestReply.pointsEarned && <span className="chat-bubble-points-badge" style={{ marginLeft: 'auto', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }}>+{latestReply.pointsEarned} pts</span>}
          </div>
          <button type="button" className="chat-read-history" onClick={() => setHistoryDrawerOpen(true)} aria-label={`Open ${character.characterName} chat history to read the full reply`}>{latestReply.text.length > 500 ? 'Full reply in history →' : 'Chat history →'}</button>
        </article>
      ) : null}
    </section></div>
    <div className="chat-dock"><div hidden={!storyMode}><AutoStoryShow onState={setStoryView} onHistory={()=>setHistoryDrawerOpen(true)}/></div>{!storyMode&&<>
      {activeActivity && (
        <div style={{ margin: '0.75rem 1rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid rgba(245, 158, 11, 0.4)', background: 'rgba(245, 158, 11, 0.1)', color: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
              ⚠️ Active {activeActivity.activity_type === 'STORY' ? 'Auto Story' : 'Live Trivia'} Session in Progress
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>
              Visitor activity lock is held. Finish or stop the session to chat with {character.characterName}.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => {
                if (activeActivity.activity_type === 'STORY') setStoryMode(true);
                else window.location.href = '#trivia';
              }}
              style={{ padding: '0.35rem 0.75rem', borderRadius: '0.5rem', background: '#d97706', color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', border: 'none' }}
            >
              Return to {activeActivity.activity_type === 'STORY' ? 'Story' : 'Trivia'}
            </button>
            <button
              type="button"
              onClick={async () => {
                await stopActivity(activeActivity.session_id);
                setActiveActivity(null);
              }}
              style={{ padding: '0.35rem 0.75rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', border: 'none' }}
            >
              Stop Session
            </button>
          </div>
        </div>
      )}
      <div className="chat-dock-actions">
        <button type="button" onClick={newConversation} disabled={pending}>＋ New conversation</button>
        <button type="button" onClick={() => void getGatewayStatus(true).then(setGateway)}>↻ Check runtime</button>
        {(model === 'd1' || model === 'd1_omni') && (
          <button
            type="button"
            onClick={() => setShowAdvancedStudio(v => !v)}
            style={{ fontWeight: 600, color: showAdvancedStudio ? '#fef08a' : '#93c5fd' }}
          >
            {showAdvancedStudio ? '← Simple Chat Mode' : '✦ Advanced Decision Studio'}
          </button>
        )}
        <details>
          <summary>How this route works</summary>
          <p>{model === 'text' ? 'The text endpoint handles one request at a time. Previous turns are included as plain text until the 1,000-character limit; oldest turns are omitted first.' : (model === 'd1' || model === 'd1_omni') ? 'Ask naturally in plain English (e.g. "Should we pick A or B?"). The input adapter translates your prompt into candidate options and evaluates forward probabilities.' : 'Attach the media shown below to run this character. Sample files are available if you choose them.'}</p>
          <p>{character.specialty}</p>
          <a href="#playground">Recorded traces in Playground ↗</a>
        </details>
      </div>
      {(model === 'd1' || model === 'd1_omni') && showAdvancedStudio ? (
        <DecisionStudio
          model={model}
          isBusy={isBusy}
          onSwitchToPure={() => switchTo('text')}
          onDecisionCompleted={handleDecisionDone}
        />
      ) : (
        <>
          <div className="chat-compose">
            <button className="chat-attach-button" type="button" aria-label="Attachments" aria-expanded={mediaOpen} onClick={() => setMediaOpen(v => !v)}>＋</button>
            <label className="sr-only" htmlFor="chat-draft">Your message</label>
            <textarea
              id="chat-draft"
              rows={1}
              maxLength={MAX_INPUT_CHARS}
              value={draft}
              disabled={pending || !!activeActivity}
              onFocus={() => { setFocused(true); if (!pending) { setReactionState('thinking'); setReaction(n => n + 1); } }}
              onBlur={() => { setFocused(false); if (!pending) { setReactionState('idle'); setReaction(n => n + 1); } }}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }}
              placeholder={activeActivity ? `Chat paused while ${activeActivity.activity_type === 'STORY' ? 'Auto Story' : 'Live Trivia'} is active…` : isBusy ? `${MODELS[lock.modelId || model]?.characterName || 'A model'} is busy…` : (model === 'd1' || model === 'd1_omni') ? `Ask ${character.characterName} anything (e.g. "Should I choose X or Y?")...` : `Message ${character.characterName}…`}
            />
            <span className="chat-input-count">{draft.length}/{MAX_INPUT_CHARS}</span>
            <button className="chat-send-button" type="button" aria-label="Send message" disabled={!ready || pending || !canSend || !!activeActivity} onClick={() => void send()}>{pending ? '···' : '➤'}</button>
          </div>
          {(mediaOpen || image || audio || video) && <div className="chat-media-row">
            {acceptsImage(model) && <div className="chat-media-slot"><label>Image <input type="file" accept="image/png,image/jpeg" onChange={e => setImage(e.target.files?.[0] || null)} /></label>{image ? <span>{image.name}</span> : <button type="button" className="chat-sample-btn" onClick={() => void attachSample('image')}>+ Use sample PNG</button>}</div>}
            {acceptsAudio(model) && <div className="chat-media-slot"><label>WAV audio <input type="file" accept="audio/wav,audio/x-wav,.wav" onChange={e => setAudio(e.target.files?.[0] || null)} /></label>{audio ? <span>{audio.name}</span> : <button type="button" className="chat-sample-btn" onClick={() => void attachSample('audio')}>+ Use sample WAV</button>}</div>}
            {acceptsVideo(model) && <div className="chat-media-slot"><label>Short MP4 video <input type="file" accept="video/mp4,.mp4" onChange={e => setVideo(e.target.files?.[0] || null)} /></label>{video ? <span>{video.name}</span> : <button type="button" className="chat-sample-btn" onClick={() => void attachSample('video')}>+ Use sample MP4</button>}</div>}
            <span>{supported ? `Accepts text, ${supported}.` : 'Accepts text.'}</span>
          </div>}
          {(contextNote || !ready) && <p className="chat-runtime-note">{!ready ? unavailableReason : contextNote}{focused && ready ? ' · Listening' : ''}</p>}
        </>
      )}
    </>}</div>

    {/* Staged character chat sidebar (no backdrop blur) */}
    <aside className={`chat-history-drawer ${historyDrawerOpen ? 'is-open' : ''}`} aria-label={`${character.characterName} chat history`} inert={!historyDrawerOpen||storyMode}>
      <div className="chat-sidebar-hero">
        <button type="button" className="chat-drawer-close" onClick={() => setHistoryDrawerOpen(false)} aria-label="Close chat history">✕</button>
        <div className="chat-sidebar-avatar-wrapper">
          <MascotAvatar model={character} />
        </div>
        <h3 className="chat-sidebar-title">{character.characterName}</h3>
        <p className="chat-sidebar-sub">{character.name} · {character.specialty}</p>
        <div className="chat-sidebar-meta-row">
          <span className="chat-sidebar-pill">{historyCount} message{historyCount === 1 ? '' : 's'}</span>
          <span className="chat-sidebar-pill">{character.inputModalities.join(' + ')}</span>
        </div>
      </div>

      <div className="chat-drawer-body" ref={historyBodyRef}>
        {(archives[model] || []).length > 0 && <div className="chat-drawer-archive"><h4>Earlier conversations</h4>{archives[model].map((session, index) => <button key={index} type="button" onClick={() => restoreConversation(index)} disabled={pending}>Conversation {archives[model].length - index} · {session.length} messages</button>)}</div>}
        {messages.length === 0 ? (
          <div className="chat-drawer-empty">
            <p>No messages in this conversation with <strong>{character.characterName}</strong> yet.</p>
            <span>{historyCount ? 'Choose an earlier conversation above or send a new message.' : `Ask a question below to begin conversation history with ${character.characterName}.`}</span>
          </div>
        ) : (
          <div className="chat-drawer-turns">
            {messages.map((item, index) => {
              const turnDecision = item.role === 'model' ? tryParseDecision(item.text) : null;
              return (
                <div key={index} className={`chat-drawer-turn chat-drawer-turn--${item.role}`}>
                  <div className="chat-drawer-turn-meta">
                    <strong>{item.role === 'you' ? 'You' : (item.speaker || character.characterName)}</strong>
                    {item.metrics?.total_latency_s != null && <span> · {item.metrics.total_latency_s.toFixed(2)}s</span>}
                    {item.role === 'model' && <span className="chat-drawer-char-badge"> · {item.text.length} chars</span>}
                    {item.role === 'model' && <span style={{ marginLeft: '0.4rem', color: '#34d399', fontWeight: 600, fontSize: '0.75rem' }}>+{item.pointsEarned || 4} pts</span>}
                  </div>
                  <div className="chat-drawer-turn-text">
                    {turnDecision ? renderDecisionCard(turnDecision, item.text) : <><p>{item.text}</p>{item.fullText && <details className="chat-full-reply"><summary>Show full reply</summary><p>{item.fullText}</p></details>}</>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="chat-drawer-footer">
        <button
          type="button"
          className="chat-drawer-action"
          onClick={() => { setMessages([]); setArchived({ ...archives, [model]: [] }); }}
          disabled={pending || (messages.length === 0 && (archives[model] || []).length === 0)}
        >
          Clear {character.characterName} History
        </button>
        <button
          type="button"
          className="chat-drawer-action"
          onClick={() => setHistoryDrawerOpen(false)}
        >
          Close Sidebar
        </button>
      </div>
    </aside>
    {storyMode&&<aside className={`chat-history-drawer chat-story-history-drawer ${historyDrawerOpen?'is-open':''}`} aria-label="Full Auto Story history" inert={!historyDrawerOpen}><div className="chat-sidebar-hero"><button type="button" className="chat-drawer-close" onClick={()=>setHistoryDrawerOpen(false)}>✕</button><h2>Story history</h2><p>{storyShow?.config.theme||'No story started'}</p></div><div className="chat-drawer-body">{storyShow?.turns.map(turn=><React.Fragment key={turn.turnId}><article className="chat-story-history-turn"><div className="chat-story-history-speaker"><span className="chat-avatar-frame"><MascotAvatar model={MODELS[turn.modelId]}/></span><strong>{turn.index+1}. {MODELS[turn.modelId].characterName} · {showBeat(storyShow,turn.index)}</strong></div><p>{(turn.stageText||turn.output||turn.error||'No output').slice(0,500)}</p></article>{storyShow?.humanTurns?.filter(h=>h.afterTurn===turn.index).map(h=><article key={h.id} className="chat-story-human-line"><div className="chat-story-history-speaker"><strong>👤 You (Director Note)</strong></div><p>{h.text}</p></article>)}</React.Fragment>)}</div><div className="chat-drawer-footer"><button type="button" className="chat-drawer-action" onClick={()=>setHistoryDrawerOpen(false)}>Close History</button></div></aside>}</section></div>;
};
