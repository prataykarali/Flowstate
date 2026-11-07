import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { MODELS, type CanonicalModelId, type ModelMeta } from '../data/models.ts';
import { useExperience } from '../app/ExperienceContext.tsx';
import {
  executeLocalStream,
  getGatewayStatus,
  outputText,
  readMedia,
  validateRequest,
  type GatewayStatus,
  type LiveResult,
  type LiveTask,
  type TextStreamUpdate
} from '../lib/api.ts';
import { loadRecordedReplays, type RecordedReplay } from '../lib/replays.ts';
import { predictRoute, type InputModality, type TaskCategory } from '../data/pipeline.ts';
import { useInferenceLock, cancelActiveInference } from '../lib/inferenceLock.ts';

// Conversational Subcomponents
import { MascotSelectorStrip } from '../components/playground/MascotSelectorStrip.tsx';
import { MascotStage } from '../components/playground/MascotStage.tsx';
import {
  PlaygroundConversation,
  type PlaygroundMessage,
  type DecisionPayload
} from '../components/playground/PlaygroundConversation.tsx';
import { PlaygroundComposer } from '../components/playground/PlaygroundComposer.tsx';
import { InferenceInspectorModal } from '../components/playground/InferenceInspectorModal.tsx';
import { PipelineExplorer } from '../components/pipeline/PipelineExplorer.tsx';

// Curated model prompt presets
const PROMPT_PRESETS: Record<CanonicalModelId, { default: string; suggestions: string[] }> = {
  text: {
    default: 'Explain the LFM3 hybrid attention schedule in two sentences.',
    suggestions: [
      'Explain the LFM3 hybrid attention schedule in two sentences.',
      'Compare convolution recurrence with full attention memory complexity.',
      'Draft a high-throughput Python inference benchmark loop.'
    ]
  },
  vision: {
    default: 'Read the heading in this image.',
    suggestions: [
      'Read the heading in this image.',
      'Extract all visible labels, tables, and numerical values.',
      'Analyze the spatial layout and composition of the visual elements.'
    ]
  },
  audio: {
    default: 'Transcribe this WAV audio recording.',
    suggestions: [
      'Transcribe this WAV audio recording.',
      'Analyze speech cadence and background acoustic environment.',
      'Identify the speaker intent and extract key entities.'
    ]
  },
  omni: {
    default: 'Describe the image and audio together.',
    suggestions: [
      'Describe the image and audio together.',
      'Does the spoken statement match the visible visual evidence?',
      'Synthesize multimodal context and formulate a joint summary.'
    ]
  },
  d1: {
    default: 'Classify this request into a documented category.',
    suggestions: [
      'Classify this request into a documented category.',
      'Estimate the confidence score and risk level for this decision.',
      'Perform a deterministic policy and safety classification.'
    ]
  },
  d1_omni: {
    default: 'Classify the audio and image evidence for human review.',
    suggestions: [
      'Classify the audio and image evidence for human review.',
      'Cross-examine acoustic speech cues against visual scene context.',
      'Output categorical slot distribution and flag uncertainty.'
    ]
  }
};

export const Playground: React.FC = () => {
  const { selectedModelId, setSelectedModelId } = useExperience();

  // Mode and Routing State
  const [routingMode, setRoutingMode] = useState<'auto' | 'manual'>('auto');
  const [executionMode, setExecutionMode] = useState<'recorded' | 'live'>('recorded');
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus | null>(null);
  const [isRefreshingGateway, setIsRefreshingGateway] = useState(false);

  // Composer Input State
  const [task, setTask] = useState<LiveTask>('chat');
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);

  // Generation & Streaming State
  const [isGenerating, setIsGenerating] = useState(false);
  const lock = useInferenceLock();
  const isBusy = isGenerating || lock.busy;
  const [streamingText, setStreamingText] = useState('');
  const [streamingModelId, setStreamingModelId] = useState<CanonicalModelId | undefined>(undefined);
  const abortControllerRef = useRef<AbortController | null>(null);
  const replayTimerRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);

  // Conversation & Telemetry
  const [messages, setMessages] = useState<PlaygroundMessage[]>([]);
  const [latestResult, setLatestResult] = useState<LiveResult | null>(null);
  const [activeInspectorResult, setActiveInspectorResult] = useState<LiveResult | null>(null);

  // Mascot Stage State
  const [reactionSignal, setReactionSignal] = useState(0);
  const [reactionState, setReactionState] = useState<'happy' | 'sad' | 'thinking' | 'idle'>('idle');
  const [currentSpeechLine, setCurrentSpeechLine] = useState<string | undefined>(undefined);

  // Modal Open State
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);

  // Replay Archive Cache
  const [replays, setReplays] = useState<RecordedReplay[]>([]);

  // Refresh Gateway Status
  const refreshGateway = useCallback(async (force = false) => {
    setIsRefreshingGateway(true);
    try {
      const s = await getGatewayStatus(force);
      setGatewayStatus(s);
    } finally {
      setIsRefreshingGateway(false);
    }
  }, []);

  useEffect(() => {
    void refreshGateway(true);
    loadRecordedReplays().then(setReplays).catch(() => {});
    const poll = window.setInterval(() => { if (!document.hidden) void refreshGateway(true); }, 15_000);
    const onVisibility = () => { if (!document.hidden) void refreshGateway(true); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { window.clearInterval(poll); document.removeEventListener("visibilitychange", onVisibility); };
  }, [refreshGateway]);

  // Object URLs for uploaded files
  useEffect(() => {
    if (!image) {
      setImagePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(image);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  useEffect(() => {
    if (!audio) {
      setAudioPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(audio);
    setAudioPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audio]);

  // Modalities & Route Prediction
  const inputs: InputModality[] = useMemo(() => [
    ...(prompt.trim() ? (['text'] as const) : []),
    ...(image ? (['image'] as const) : []),
    ...(audio ? (['audio'] as const) : [])
  ], [prompt, image, audio]);

  const taskCategory: TaskCategory = task === 'decision' ? 'decision' : task === 'transcribe' ? 'speech' : 'chat';
  const predictedModelId = useMemo(() => predictRoute(taskCategory, inputs), [taskCategory, inputs]);

  // Active Model based on routing mode
  const activeModelId = routingMode === 'auto' ? predictedModelId : selectedModelId;
  const activeModel: ModelMeta = MODELS[activeModelId];

  useEffect(() => {
    if (routingMode === 'manual') setTask(selectedModelId === 'd1' || selectedModelId === 'd1_omni' ? 'decision' : 'chat');
  }, [routingMode, selectedModelId]);

  // Model selection handler
  const handleSelectModel = (id: CanonicalModelId) => {
    setSelectedModelId(id);
    setTask(id === 'd1' || id === 'd1_omni' ? 'decision' : 'chat');
    setCurrentSpeechLine(MODELS[id].dialogueLines[0]);
    setReactionState('happy');
    setReactionSignal(n => n + 1);
  };

  // Preset prompt handler
  const handleSelectPromptPreset = (p: string, t?: LiveTask) => {
    setPrompt(p);
    if (t) setTask(t);
  };

  // Safe cancellation
  const handleStopGeneration = () => {
    requestIdRef.current += 1;
    if (replayTimerRef.current !== null) window.clearInterval(replayTimerRef.current);
    replayTimerRef.current = null;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setStreamingText('');
    setReactionState('idle');
  };

  useEffect(() => () => {
    abortControllerRef.current?.abort();
    if (replayTimerRef.current !== null) window.clearInterval(replayTimerRef.current);
  }, []);

  // Primary Submission Handler
  const handleSend = async () => {
    if (isGenerating) return;
    const requestId = ++requestIdRef.current;
    const currentPrompt = prompt.trim() || (image ? 'Analyze this image.' : audio ? 'Analyze this audio.' : 'Hello!');
    const currentImage = image;
    const currentAudio = audio;
    const currentTask = task;

    // Determine target model
    const targetModelId: CanonicalModelId = routingMode === 'auto' ? predictedModelId : selectedModelId;
    const targetModel = MODELS[targetModelId];

    // Capability check for manual mode
    const hasImage = !!currentImage;
    const hasAudio = !!currentAudio;
    const modelSupportsImage = targetModel.inputModalities.includes('image') || targetModel.inputModalities.includes('video');
    const modelSupportsAudio = targetModel.inputModalities.includes('audio');

    // Incompatibility check in Manual Mode
    if (routingMode === 'manual') {
      const unsupportedMedia: string[] = [];
      if (hasImage && !modelSupportsImage) unsupportedMedia.push('image');
      if (hasAudio && !modelSupportsAudio) unsupportedMedia.push('audio');

      if (unsupportedMedia.length > 0) {
        // Create user message
        const userMsgId = `user_${Date.now()}`;
        const userMsg: PlaygroundMessage = {
          id: userMsgId,
          role: 'user',
          text: currentPrompt,
          modelId: targetModelId,
          task: currentTask,
          imagePreview: imagePreviewUrl || undefined,
          imageName: currentImage?.name,
          audioPreview: audioPreviewUrl || undefined,
          audioName: currentAudio?.name,
          timestamp: Date.now()
        };

        // Create polite companion response explaining incompatibility
        const assistantMsgId = `asst_${Date.now() + 1}`;
        const suggestedCompanion = hasImage && hasAudio ? 'Omni Pup' : hasImage ? 'Spectra or Omni Pup' : 'Echo or Omni Pup';
        const advisoryText = `I specialize in ${targetModel.specialty.toLowerCase()} I cannot process ${unsupportedMedia.join(' or ')} attachments. Please select ${suggestedCompanion}, or enable Smart Auto routing to let PrismLab dispatch this request automatically!`;

        const assistantMsg: PlaygroundMessage = {
          id: assistantMsgId,
          role: 'assistant',
          text: advisoryText,
          modelId: targetModelId,
          task: currentTask,
          incompatibilityNotice: `${targetModel.characterName} is locked in Manual mode but cannot process ${unsupportedMedia.join(' or ')} files.`,
          timestamp: Date.now() + 1
        };

        setMessages(prev => [...prev, userMsg, assistantMsg]);
        setReactionState('thinking');
        setReactionSignal(n => n + 1);
        setCurrentSpeechLine(advisoryText.slice(0, 80) + '…');
        return;
      }
    }

    // Prepare Request Object
    const userMsgId = `user_${Date.now()}`;
    const userMsg: PlaygroundMessage = {
      id: userMsgId,
      role: 'user',
      text: currentPrompt,
      modelId: targetModelId,
      task: currentTask,
      imagePreview: imagePreviewUrl || undefined,
      imageName: currentImage?.name,
      audioPreview: audioPreviewUrl || undefined,
      audioName: currentAudio?.name,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setPrompt('');
    setImage(null);
    setAudio(null);
    setIsGenerating(true);
    setStreamingText('');
    setStreamingModelId(targetModelId);
    setReactionState('thinking');
    setReactionSignal(n => n + 1);

    // ==========================================
    // EXECUTION: LIVE vs RECORDED
    // ==========================================
    if (executionMode === 'live') {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      try {
        const executeReq = {
          task: currentTask,
          prompt: currentPrompt,
          model: routingMode === 'manual' ? targetModelId : undefined,
          image: currentImage ? await readMedia(currentImage, 'image') : undefined,
          audio: currentAudio ? await readMedia(currentAudio, 'audio') : undefined,
          required_media: currentImage && currentAudio ? (['image', 'audio'] as ('image' | 'audio')[]) : undefined
        };

        const validationErr = validateRequest(executeReq);
        if (validationErr) throw new Error(validationErr);
        if (controller.signal.aborted || requestId !== requestIdRef.current) return;

        let liveRes: LiveResult;
        let accumulatedTokens = '';
        liveRes = await executeLocalStream(executeReq, (update: TextStreamUpdate) => {
          if (requestId !== requestIdRef.current) return;
          if (update.kind === 'token') {
            accumulatedTokens += update.text;
            setStreamingText(accumulatedTokens);
          } else if (update.stage === 'queued' || update.stage === 'loading_model') {
            setCurrentSpeechLine(update.message);
          }
        }, controller.signal);
        if (requestId !== requestIdRef.current) return;

        const outStr = outputText(liveRes.output);
        const isStructured = targetModelId === 'd1' || targetModelId === 'd1_omni' || currentTask === 'decision';
        let decisionData: DecisionPayload | undefined;

        if (typeof liveRes.output === 'object' && liveRes.output !== null) {
          const rawObj = liveRes.output as Record<string, unknown>;
          if (typeof rawObj.predicted_route === 'string' && typeof rawObj.confidence === 'number') {
            decisionData = {
              predicted_route: rawObj.predicted_route,
              confidence: rawObj.confidence,
              probabilities: (rawObj.probabilities as Record<string, number>) || undefined,
              human_review_required: Boolean(rawObj.human_review_required),
              exploratory_gate_passed: Boolean(rawObj.exploratory_gate_passed),
              external_action_executed: Boolean(rawObj.external_action_executed)
            };
          }
        }

        const asstMsg: PlaygroundMessage = {
          id: `asst_${Date.now()}`,
          role: 'assistant',
          text: outStr,
          modelId: (liveRes.route?.[0] as CanonicalModelId) || targetModelId,
          task: currentTask,
          isStructuredDecision: isStructured && !!decisionData,
          decisionData,
          result: liveRes,
          isReplay: false,
          timestamp: Date.now()
        };

        setMessages(prev => [...prev, asstMsg]);
        setLatestResult(liveRes);
        setReactionState(liveRes.status === 'failed' ? 'sad' : 'happy');
        setReactionSignal(n => n + 1);
        setCurrentSpeechLine(outStr.slice(0, 90) + (outStr.length > 90 ? '…' : ''));
      } catch (err) {
        if (requestId !== requestIdRef.current || controller.signal.aborted) return;
        const errorText = err instanceof Error ? err.message : 'Local live inference encountered an error.';
        const errResult: LiveResult = {
          mode: 'live_local_inference',
          request_id: `err_${Date.now().toString(16)}`,
          status: 'failed',
          task: currentTask,
          model: targetModelId,
          route: [targetModelId],
          metrics: { total_latency_s: null, ttft_s: null, tokens_per_second: null },
          trace: [{ stage: 'request', status: 'error', model: targetModelId, latency_s: null, ttft_s: null, note: errorText }],
          output: errorText,
          error: errorText
        };

        const asstMsg: PlaygroundMessage = {
          id: `asst_err_${Date.now()}`,
          role: 'assistant',
          text: `Inference Error: ${errorText}`,
          modelId: targetModelId,
          task: currentTask,
          result: errResult,
          isReplay: false,
          timestamp: Date.now()
        };

        setMessages(prev => [...prev, asstMsg]);
        setLatestResult(errResult);
        setReactionState('sad');
        setReactionSignal(n => n + 1);
        setCurrentSpeechLine('I encountered an error executing that request.');
      } finally {
        if (requestId === requestIdRef.current) {
          setIsGenerating(false);
          setStreamingText('');
        }
        if (abortControllerRef.current === controller) abortControllerRef.current = null;
      }
    } else {
      // ==========================================
      // RECORDED REPLAY MODE
      // ==========================================
      const matchedReplay = replays.find(r => r.slug === targetModelId);
      if (!matchedReplay) {
        setMessages(prev => [...prev, {
          id: `asst_replay_missing_${Date.now()}`, role: 'assistant', modelId: targetModelId,
          text: `No prerecorded replay is available for ${targetModel.characterName}. Choose Local Live when your gateway is ready.`,
          isReplay: true, timestamp: Date.now()
        }]);
        setIsGenerating(false);
        setReactionState('idle');
        return;
      }

      // Build genuine LiveResult structure from the canonical replay
      const replayResult: LiveResult = {
            mode: 'recorded_replay',
            request_id: matchedReplay.source_request_id,
            status: matchedReplay.status === 'completed' ? 'completed' : 'review',
            task: currentTask,
            model: targetModelId,
            requested_model: targetModelId,
            route: matchedReplay.route,
            output: matchedReplay.output,
            metrics: {
              total_latency_s: matchedReplay.metrics.total_latency_s,
              ttft_s: matchedReplay.metrics.ttft_s,
              tokens_per_second: matchedReplay.metrics.tokens_per_second
            },
            trace: matchedReplay.trace.map(t => ({
              stage: t.stage,
              status: t.status,
              model: t.model ?? undefined,
              latency_s: t.latency_s,
              ttft_s: t.ttft_s
            }))
          };

      const replayText = outputText(replayResult.output);
      const isStructured = targetModelId === 'd1' || targetModelId === 'd1_omni' || currentTask === 'decision';

      let decisionData: DecisionPayload | undefined;
      if (typeof replayResult.output === 'object' && replayResult.output !== null) {
        const rawObj = replayResult.output as Record<string, unknown>;
        if (typeof rawObj.predicted_route === 'string') {
          decisionData = {
            predicted_route: rawObj.predicted_route,
            confidence: typeof rawObj.confidence === 'number' ? rawObj.confidence : 0.98,
            probabilities: (rawObj.probabilities as Record<string, number>) || undefined,
            human_review_required: Boolean(rawObj.human_review_required),
            exploratory_gate_passed: Boolean(rawObj.exploratory_gate_passed),
            external_action_executed: Boolean(rawObj.external_action_executed)
          };
        }
      }

      // Simulate token typing stream for smooth interactive feel
      const words = replayText.split(' ');
      let currentIdx = 0;
      let streamed = '';

      replayTimerRef.current = window.setInterval(() => {
        if (requestId !== requestIdRef.current) return;
        if (currentIdx < words.length) {
          const nextIdx = Math.min(currentIdx + 3, words.length);
          streamed = words.slice(0, nextIdx).join(' ');
          setStreamingText(streamed);
          currentIdx = nextIdx;
        } else {
          if (replayTimerRef.current !== null) window.clearInterval(replayTimerRef.current);
          replayTimerRef.current = null;
          const asstMsg: PlaygroundMessage = {
            id: `asst_replay_${Date.now()}`,
            role: 'assistant',
            text: replayText,
            modelId: targetModelId,
            task: currentTask,
            isStructuredDecision: isStructured && !!decisionData,
            decisionData,
            result: replayResult,
            isReplay: true,
            timestamp: Date.now()
          };

          setMessages(prev => [...prev, asstMsg]);
          setLatestResult(replayResult);
          setIsGenerating(false);
          setStreamingText('');
          setReactionState('happy');
          setReactionSignal(n => n + 1);
          setCurrentSpeechLine(replayText.slice(0, 90) + (replayText.length > 90 ? '…' : ''));
        }
      }, 40);
    }
  };

  const ready = !!gatewayStatus?.gateway_enabled && !!gatewayStatus.backend_live_enabled;
  const availableRoutes = gatewayStatus?.on_demand_routes;
  const activeRouteAvailable = !availableRoutes || availableRoutes.includes(activeModelId);

  const routeInput = useMemo(() => ({
    task: taskCategory,
    inputs
  }), [taskCategory, inputs]);

  return (
    <div className="page-playground">
      {/* Fullscreen Video Background */}
      {/* Top Navigation & Mascot Strip */}
      {lock.busy && (
        <div className="chat-global-lock-banner" role="status" style={{ margin: '0 1.5rem 0.75rem' }}>
          <span>
            <strong>{MODELS[lock.modelId || activeModelId]?.characterName || 'A model'}</strong> is currently {lock.phase}… Model switching and other AI actions are locked until it completes.
          </span>
          <button type="button" className="chat-cancel-btn" onClick={() => cancelActiveInference()}>Cancel</button>
        </div>
      )}
      <MascotSelectorStrip disabled={isBusy}
        selectedModelId={selectedModelId}
        predictedModelId={predictedModelId}
        routingMode={routingMode}
        executionMode={executionMode}
        gatewayReady={ready}
        isRefreshingGateway={isRefreshingGateway}
        onSelectModel={handleSelectModel}
        onToggleRoutingMode={setRoutingMode}
        onToggleExecutionMode={setExecutionMode}
        onRefreshGateway={() => { void refreshGateway(true); }}
      />

      {/* Main Conversational Workspace */}
      <main className="play-main-workspace" aria-label="Interactive AI Playground workspace">
        <section className="play-request-column" aria-label="Shape an inference request">
          {executionMode === 'live' && ready && !activeRouteAvailable && (
            <p className="play-route-unavailable" role="status">
              {activeModel.characterName} is available in recorded replay. Live inference for this model is not installed on this host yet.
            </p>
          )}
          <PlaygroundComposer
            prompt={prompt}
            onChangePrompt={setPrompt}
            task={task}
            onChangeTask={setTask}
            image={image}
            onChangeImage={setImage}
            audio={audio}
            onChangeAudio={setAudio}
            imagePreviewUrl={imagePreviewUrl}
            onSend={handleSend}
            onStop={handleStopGeneration}
            isGenerating={isGenerating}
            activeModel={activeModel}
            routingMode={routingMode}
            promptSuggestions={PROMPT_PRESETS[activeModel.id].suggestions}
            onSelectPromptPreset={handleSelectPromptPreset}
            disabled={executionMode === 'live' && (!ready || !activeRouteAvailable)}
          />
        </section>

        <section className="play-response-column" aria-label="Model companion and output">
          <MascotStage
            model={activeModel}
            reactionSignal={reactionSignal}
            reactionState={reactionState}
            isGenerating={isGenerating}
            currentSpeechLine={currentSpeechLine}
            routingMode={routingMode}
          />
          <PlaygroundConversation
            messages={messages}
            activeModel={activeModel}
            routingMode={routingMode}
            isGenerating={isGenerating}
            streamingText={streamingText}
            streamingModelId={streamingModelId}
            onInspectResult={(res: LiveResult) => {
              setActiveInspectorResult(res);
              setIsTelemetryOpen(true);
            }}
          />
          {messages.length > 0 && !isGenerating && <button type="button" className="play-clear-conversation" onClick={() => { setMessages([]); setLatestResult(null); setCurrentSpeechLine(undefined); }} >Clear conversation</button>}
        </section>
      </main>

      <div className="play-pipeline-section">
        <PipelineExplorer compact routeInput={routeInput} liveResult={latestResult?.mode === 'live_local_inference' ? latestResult : null} livePending={isGenerating && executionMode === 'live'} />
      </div>

      {/* Hidden Technical Modals */}
      <InferenceInspectorModal
        isOpen={isTelemetryOpen}
        onClose={() => setIsTelemetryOpen(false)}
        result={activeInspectorResult}
        activeModel={activeModel}
        executionMode={executionMode}
      />

    </div>
  );
};
