import React from 'react';
import { MODELS, type CanonicalModelId } from '../data/models.ts';
import { executeLocalStream, generateTextStream, getGatewayStatus, outputText, ApiError, getCurrentActivity, startActivity, stopActivity, parkActivity, resumeParkedActivity, type LiveResult, type MediaPayload } from '../lib/api.ts';
import { awardAutoStorySession, awardAutoStoryTurn } from '../lib/leagueAdapters.ts';
import {
  asReplay,
  appendShowTurn,
  buildShowPrompt,
  createShow,
  DEFAULT_SHOW_CONFIG,
  detectRepetition,
  evaluateGenreTurn,
  extractStoryWorldState,
  formatStageDialogue,
  getTurnModeLabel,
  planShow,
  openingReuseReason,
  clearShows,
  readShows,
  saveShow,
  showBeat,
  validateDecisionJson,
  sanitizeTurnOutput,
  stripEchoedPrefix,
  SHOW_CAPABILITIES,
  STORY_THEMES,
  validateShowConfig,
  chooseStoryCast,
  chooseStoryDirections,
  copiesPreviousSentence,
  OVERUSED_STORY_NAMES,
  presentStoryDirection,
  getGenreContract,
  truncateWords,
  readCastMemory,
  rememberCast,
  generateFreshPremise,
  type ShowConfig,
  type ShowPhase,
  type ShowRecord,
  type ShowTurn,
  type ValidatedDecision,
  initializeCanonicalWorldState,
  extractProposedEvents,
  validateProposedEvents,
  applyEventsToWorldState,
  auditStoryContinuity,
  isTruncatedOutput,
  hasMeaningfulEnding,
  detectNarrativeLoop,
  auditStoryQuality,
  type NarrativeEvent
} from '../lib/storyShow.ts';
import { getEvidencePackForTheme, loadPackMedia, type StoryEvidencePack } from '../lib/storyEvidencePacks.ts';
import { StoryWinnerModal } from '../components/mascots/StoryWinnerModal.tsx';

const isRouteReady = (status: Awaited<ReturnType<typeof getGatewayStatus>>, modelId: CanonicalModelId) =>
  !!status.gateway_enabled && ((!!status.backend_live_enabled && (status.on_demand_routes?.includes(modelId) || (modelId === 'text' ? status.text_model_available : status.multimodal_model_available))) || !!status.auto_start_available);

const exportShow = (show: ShowRecord, format: 'txt' | 'json') => {
  const content = format === 'json'
    ? JSON.stringify(show, null, 2)
    : [
        `PrismLab Auto Story Show — ${show.config.theme}`,
        `Show ${show.showId} · ${show.status}`,
        `Opening: ${show.config.opening || '(theme prompt)'}`,
        ...show.turns.map(turn => `\nTurn ${turn.index + 1} — ${MODELS[turn.modelId]?.characterName || turn.modelId} (${turn.role}) — ${turn.status}\nStage: ${turn.stageText || turn.output || turn.error || ''}\nRaw: ${turn.output || ''}`)
      ].join('\n');
  const url = URL.createObjectURL(new Blob([content], { type: format === 'json' ? 'application/json' : 'text/plain' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `prismlab-story-${show.showId}.${format}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export interface AutoStoryView {
  show: ShowRecord | null;
  phase: ShowPhase;
  preview: string;
  message: string;
  pending: boolean;
  modeLabel?: string;
}

export const AutoStoryShow: React.FC<{ onState: (view: AutoStoryView) => void; onHistory: () => void }> = ({ onState, onHistory }) => {
  const [config, setConfig] = React.useState<ShowConfig>(() => ({ ...DEFAULT_SHOW_CONFIG, modelIds: [...DEFAULT_SHOW_CONFIG.modelIds] }));
  const [turnCountCustomized, setTurnCountCustomized] = React.useState(false);
  const [show, setShow] = React.useState<ShowRecord | null>(() => {
    try {
      const all = readShows();
      const inProgress = all.find(s => s.mode === 'live_local_show' && (s.status === 'active' || s.status === 'parked' || s.status === 'paused_rate_limit'));
      return inProgress || null;
    } catch {
      return null;
    }
  });
  const [saved, setSaved] = React.useState(readShows);
  const [phase, setPhaseState] = React.useState<ShowPhase>(() => {
    if (!show) return 'configuring';
    if (show.status === 'paused_rate_limit') return 'paused_rate_limit';
    return 'paused';
  });
  const [message, setMessage] = React.useState<string>(() => {
    if (!show) return 'Choose a genre to start a new story.';
    if (show.status === 'paused_rate_limit') return `Your Story is saved at Turn ${show.turns.length + 1} of ${show.config.turnCount}.`;
    return `Story paused at Turn ${show.turns.length + 1} of ${show.config.turnCount}. Click "Resume" to continue.`;
  });
  const [preview, setPreview] = React.useState('');
  const [modeLabel, setModeLabel] = React.useState<string>(() => show ? 'Paused' : '');
  const [, setReaction] = React.useState(0);
  const [, setReactionState] = React.useState<'idle' | 'thinking' | 'happy' | 'sad'>('idle');
  const [pending, setPending] = React.useState(false);
  const [showWinnerModal, setShowWinnerModal] = React.useState(false);
  const [rateLimitCountdown, setRateLimitCountdown] = React.useState<number | null>(null);
  const [storyCooldownRemaining, setStoryCooldownRemaining] = React.useState<number>(() => {
    try {
      const until = Number(localStorage.getItem('prismlab_story_cooldown_until') || '0');
      return Math.max(0, Math.ceil((until - Date.now()) / 1000));
    } catch {
      return 0;
    }
  });

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      try {
        const until = Number(localStorage.getItem('prismlab_story_cooldown_until') || '0');
        const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));
        setStoryCooldownRemaining(remaining);
      } catch {}
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const showRef = React.useRef<ShowRecord | null>(show);
  const phaseRef = React.useRef<ShowPhase>(phase);
  const pendingRef = React.useRef(false);
  const pausedRef = React.useRef(!!show);
  const stoppedRef = React.useRef(false);
  const timerRef = React.useRef<number | null>(null);
  const countdownIntervalRef = React.useRef<number | null>(null);
  const mountedRef = React.useRef(true);
  const epochRef = React.useRef(0);
  const retryCountRef = React.useRef(0);
  const previousThemeRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    onState({ show, phase, preview, message, pending, modeLabel });
  }, [show, phase, preview, message, pending, modeLabel, onState]);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      epochRef.current += 1;
      stoppedRef.current = true;
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      if (countdownIntervalRef.current !== null) clearInterval(countdownIntervalRef.current);
      const current = showRef.current;
      if (current?.mode === 'live_local_show' && (current.status === 'active' || current.status === 'paused_rate_limit')) {
        try {
          saveShow({ ...current, status: 'parked', updatedAt: new Date().toISOString() });
          void parkActivity(current.showId, {
            theme: current.config.theme,
            turn: current.turns.length,
            turnCount: current.config.turnCount,
          });
          window.dispatchEvent(new CustomEvent('prismlab_activity_change'));
        } catch {}
      }
    };
  }, []);

  React.useEffect(() => {
    const handleGlobalResume = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (!detail || !detail.activity || detail.activity === 'STORY') {
        void resume();
      }
    };
    window.addEventListener('prismlab_resume_activity', handleGlobalResume);
    window.addEventListener('prismlab_resume_story', handleGlobalResume);
    return () => {
      window.removeEventListener('prismlab_resume_activity', handleGlobalResume);
      window.removeEventListener('prismlab_resume_story', handleGlobalResume);
    };
  }, []);

  const setPhase = (next: ShowPhase) => {
    phaseRef.current = next;
    if (mountedRef.current) setPhaseState(next);
  };

  const commit = (next: ShowRecord) => {
    showRef.current = next;
    try { saveShow(next); } catch {}
    if (mountedRef.current) {
      setShow(next);
      setSaved(readShows());
    }
  };

  const schedule = (delay = 15) => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void runNext();
    }, delay);
  };

  const resumeFromRateLimit = () => {
    if (countdownIntervalRef.current !== null) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setRateLimitCountdown(null);
    pausedRef.current = false;
    stoppedRef.current = false;
    const current = showRef.current;
    if (current && current.mode === 'live_local_show') {
      commit({ ...current, status: 'active', updatedAt: new Date().toISOString() });
    }
    setPhase('preparing');
    setMessage('Compute allowance replenished. Resuming your Story…');
    schedule(0);
  };

  const pauseForRateLimit = (err: unknown, currentTurnIdx: number) => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (countdownIntervalRef.current !== null) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    let retryAfter = 2;
    if (err instanceof ApiError && typeof err.retryAfter === 'number' && err.retryAfter > 0) {
      retryAfter = Math.min(3, Math.max(1, err.retryAfter));
    } else if (err instanceof Error) {
      const match = err.message.match(/(\d+)\s*(?:s|sec|second)/i);
      if (match) retryAfter = Math.min(3, Math.max(1, parseInt(match[1], 10)));
    }

    const current = showRef.current;
    if (current && current.mode === 'live_local_show') {
      commit({ ...current, status: 'paused_rate_limit', updatedAt: new Date().toISOString() });
    }
    pausedRef.current = true;
    setPhase('paused_rate_limit');
    setRateLimitCountdown(retryAfter);

    const totalTurns = current?.turnOrder.length || 20;
    const turnNum = currentTurnIdx + 1;
    setMessage(`Your Story is saved at Turn ${turnNum} of ${totalTurns}. Shared models busy with another visitor; resuming in ${retryAfter}s…`);

    let remaining = retryAfter;
    countdownIntervalRef.current = window.setInterval(() => {
      remaining -= 1;
      if (!mountedRef.current) {
        if (countdownIntervalRef.current !== null) clearInterval(countdownIntervalRef.current);
        return;
      }
      if (remaining <= 0) {
        if (countdownIntervalRef.current !== null) clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
        resumeFromRateLimit();
      } else {
        setRateLimitCountdown(remaining);
        setMessage(`Your Story is saved at Turn ${turnNum} of ${totalTurns}. Shared models busy with another visitor; resuming in ${remaining}s…`);
      }
    }, 1000);
  };

  const runNext = async () => {
    const currentEpoch = epochRef.current;
    const current = showRef.current;
    if (!current || current.mode === 'recorded_show' || pendingRef.current || pausedRef.current || stoppedRef.current || !mountedRef.current) return;

    const index = current.turns.length;
    if (index >= current.turnOrder.length) {
      const complete = current.turns.every(turn => turn.status === 'completed');
      commit({ ...current, status: complete ? 'completed' : 'failed', updatedAt: new Date().toISOString() });
      setPhase(complete ? 'completed' : 'failed');
      setMessage(complete ? 'Live show complete! All turns recorded for replay.' : 'Show ended with incomplete turns.');
      setModeLabel('Completed');
      if (complete) {
        setShowWinnerModal(true);
        try {
          const cooldownUntil = Date.now() + 180 * 1000;
          localStorage.setItem('prismlab_story_cooldown_until', String(cooldownUntil));
          setStoryCooldownRemaining(180);
        } catch {}
      }
      return;
    }

    const modelId = current.turnOrder[index];
    const capability = SHOW_CAPABILITIES.find(item => item.modelId === modelId)!;
    const startedAt = new Date().toISOString();
    const turnId = `${current.showId}:${index + 1}`;
    const storyPerspective = !current.config.scenarioId;
    const initialMode = getTurnModeLabel(modelId, capability, storyPerspective);

    pendingRef.current = true;
    setPending(true);
    setPreview('');
    setPhase('preparing');
    setModeLabel(initialMode);
    setMessage(`Turn ${index + 1}/${current.turnOrder.length}: ${MODELS[modelId].characterName} taking the stage (${initialMode})…`);
    setReactionState('thinking');
    setReaction(v => v + 1);

    let promptLength = 0;
    let contextTruncated = false;
    const rawAttempts: NonNullable<ShowTurn['rawAttempts']> = [];
    let failedOutput = '';

    try {
      let status = await getGatewayStatus();
      if (epochRef.current !== currentEpoch || stoppedRef.current) return;
      if (status.inference_busy && status.queue && status.queue.waiting >= (status.queue.waiting_limit || 3)) {
        throw new Error('Inference queue is full. Retrying shortly…');
      }
      if (!isRouteReady(status, modelId)) throw new Error(`${MODELS[modelId].characterName} is unavailable. ${status.reason}`);

      // Evidence pack grounding check
      const pack: StoryEvidencePack | null = current.config.scenarioId ? getEvidencePackForTheme(current.config.theme) : null;
      let image: MediaPayload | undefined;
      let audio: MediaPayload | undefined;

      if (capability.media.length > 0 && pack) {
        setPhase('loading_model');
        if (capability.media.includes('image')) image = await loadPackMedia(pack, 'image');
        if (capability.media.includes('audio')) audio = await loadPackMedia(pack, 'audio');
      }

      if (epochRef.current !== currentEpoch || stoppedRef.current) return;

      const built = capability.role === 'decision_assistant' && pack
        ? { prompt: pack.incidentReport, truncated: false }
        : buildShowPrompt(current, modelId);
      const decisionQuestion = capability.role === 'decision_assistant' && !pack ? chooseStoryDirections(current) : undefined;
      promptLength = built.prompt.length;
      contextTruncated = built.truncated;

      setPhase('requesting');
      setMessage(`Running ${MODELS[modelId].name} (${initialMode})…`);

      let rawOutput = '';
      let genreEvaluation: ShowTurn['genreEvaluation'];
      let result: LiveResult;

      let retries = 0;
      while (true) {
        try {
          if (modelId === 'text') {
            const tokensToGen = Math.min(128, Math.max(16, current.config.maxTokens || 128));
            const onTextUpdate: Parameters<typeof generateTextStream>[1] = update => {
              if (!mountedRef.current || epochRef.current !== currentEpoch || stoppedRef.current) return;
              if (update.kind === 'token') {
                setPhase('awaiting_result');
                setPreview(text => text + update.text);
              } else {
                setPhase('loading_model');
                setMessage(update.message);
              }
            };
            result = await generateTextStream(
              built.prompt,
              onTextUpdate,
              tokensToGen,
              undefined,
              turnId,
              current.showId,
              { turn_index: index + 1, activity_type: 'STORY', state: { showId: current.showId, turnIndex: index + 1 } }
            );
          } else {
            const onStreamUpdate: Parameters<typeof generateTextStream>[1] = update => {
              if (!mountedRef.current || epochRef.current !== currentEpoch || stoppedRef.current) return;
              if (update.kind === 'token') {
                setPhase('awaiting_result');
                setPreview(text => text + update.text);
              } else {
                setPhase('loading_model');
                setMessage(update.message);
              }
            };
            result = await executeLocalStream({
              model: modelId,
              task: modelId === 'audio' && !pack ? 'chat' : capability.task,
              prompt: built.prompt,
              image,
              audio,
              required_media: image && audio ? capability.media : undefined,
              decision_question: decisionQuestion,
              max_tokens: capability.role === 'decision_assistant' ? 48 : 128,
              job_id: turnId,
              activity_session_id: current.showId,
              checkpoint: { turn_index: index + 1, activity_type: 'STORY', state: { showId: current.showId, turnIndex: index + 1 } },
            }, onStreamUpdate);
          }
          break;
        } catch (execErr) {
          const is503 = (execErr instanceof ApiError && execErr.status === 503) || /queue is full|timed out|busy/i.test(String(execErr));
          const is429 = (execErr instanceof ApiError && execErr.status === 429) || /rate limit|compute budget/i.test(String(execErr));
          if ((is503 || is429) && retries < 10) {
            retries += 1;
            const delayMs = Math.min(5000, 1500 * retries);
            setMessage(`Models busy with another visitor's turn; waiting in queue (${retries}/10, retrying in ${(delayMs / 1000).toFixed(1)}s)…`);
            await new Promise(r => setTimeout(r, delayMs));
            if (!mountedRef.current || epochRef.current !== currentEpoch || stoppedRef.current) return;
            continue;
          }
          if (is429 || is503) {
            pauseForRateLimit(execErr, index);
            return;
          }

          const fallbackMsg = execErr instanceof Error ? execErr.message : String(execErr);
          if (modelId !== 'text') {
            // Explicitly mark specialist unavailable/failed without fabricating creative placeholders
            const failedTurn: ShowTurn = {
              turnId,
              index,
              modelId,
              role: capability.role,
              status: 'failed',
              requestId: `failed-${Date.now()}`,
              route: [modelId],
              output: '',
              stageText: `[${MODELS[modelId].characterName} unavailable: ${fallbackMsg}]`,
              stageTextProvenance: 'template',
              rejectionReason: fallbackMsg,
              isRelevant: false,
              promptLength,
              contextTruncated,
              startedAt,
              finishedAt: new Date().toISOString(),
              error: fallbackMsg
            };
            commit(appendShowTurn(showRef.current!, failedTurn));
            setPhase('presenting_turn');
            setMessage(`${MODELS[modelId].characterName} unavailable (${fallbackMsg}).`);
            schedule(2200);
            return;
          }
          throw execErr;
        }
      }

      if (!mountedRef.current || epochRef.current !== currentEpoch || stoppedRef.current) return;

      rawOutput = result.output == null ? '' : outputText(result.output).trim();
      // Clean raw speech disfluencies like trailing unclosed (um...)
      rawOutput = rawOutput.replace(/\s*\((?:um|uh|er|ah)[^)]*\)/gi, '').trim();
      failedOutput = rawOutput;
      if (!rawOutput) {
        if (modelId !== 'text') {
          const failedTurn: ShowTurn = {
            turnId,
            index,
            modelId,
            role: capability.role,
            status: 'failed',
            requestId: result.request_id || `failed-${Date.now()}`,
            route: [modelId],
            output: '',
            stageText: `[${MODELS[modelId].characterName} returned no response]`,
            stageTextProvenance: 'template',
            rejectionReason: 'No output returned by model',
            isRelevant: false,
            promptLength,
            contextTruncated,
            startedAt,
            finishedAt: new Date().toISOString()
          };
          commit(appendShowTurn(showRef.current!, failedTurn));
          setPhase('presenting_turn');
          setMessage(`${MODELS[modelId].characterName} returned no response.`);
          schedule(2200);
          return;
        }
        throw new Error('Writer returned no text.');
      }

      // Sanitize turn output for all models (strip planning tags, act headers, bracket cues)
      rawOutput = sanitizeTurnOutput(rawOutput);

      // Clean single-take sentence trimming
      if (modelId === 'text') {
        const sentencePunct = rawOutput.match(/^.*[.!?](?=\s|$)/s)?.[0]?.trim();
        if (sentencePunct && sentencePunct.length >= 40) {
          rawOutput = sentencePunct;
          result = { ...result, output: sentencePunct };
        }
      }

      // Strip echoed prefix or repeated opening sentences for all models
      const allPriorOutputs = [
        current.config.opening,
        ...current.turns.filter(t => t.status === 'completed' && t.output).map(t => t.output!)
      ].filter(Boolean);
      const deEchoed = stripEchoedPrefix(rawOutput, allPriorOutputs, built.prompt);
      if (deEchoed) {
        rawOutput = deEchoed;
        result = { ...result, output: deEchoed };
      }

      // If candidate was purely an echo or emptied by prefix stripping, run bounded single retry
      if (rawOutput.length < 25 && retryCountRef.current === 0) {
        retryCountRef.current = 1;
        try {
          const retryPrompt = modelId === 'text'
            ? `Continue the story with what happens next. Advance the plot. Do not repeat previous sentences or opening lines. Write 2–3 new sentences.`
            : `Provide your distinct perspective for this scene without repeating any prior sentences or character dialogue.`;
          const retakeResult = await (modelId === 'text'
            ? generateTextStream(retryPrompt, () => {}, Math.min(128, Math.max(32, current.config.maxTokens || 128)))
            : executeLocalStream({
                model: modelId,
                task: modelId === 'audio' && !pack ? 'chat' : capability.task,
                prompt: retryPrompt,
                image,
                audio,
                required_media: image && audio ? capability.media : undefined,
                decision_question: decisionQuestion,
                max_tokens: capability.role === 'decision_assistant' ? 48 : 128,
                job_id: turnId,
                activity_session_id: current.showId,
                checkpoint: { turn_index: index + 1, activity_type: 'STORY', state: { showId: current.showId, turnIndex: index + 1 } },
              }, () => {})
          );
          const retakeRaw = retakeResult.output == null ? '' : outputText(retakeResult.output).trim();
          if (retakeRaw) {
            const cleanedRetake = stripEchoedPrefix(sanitizeTurnOutput(retakeRaw), allPriorOutputs, retryPrompt);
            if (cleanedRetake) {
              rawOutput = cleanedRetake;
              result = { ...retakeResult, output: cleanedRetake };
            }
          }
        } catch {
          // Keep current rawOutput if retake fails
        }
      }

      const previous = [
        ...current.turns.filter(turn => turn.modelId === 'text' && turn.status === 'completed' && turn.output).map(turn => turn.output!),
        ...(index === 0 ? current.config.avoidOpenings || [] : [])
      ];
      const cast = current.config.cast;
      const stockName = (output: string) => cast ? OVERUSED_STORY_NAMES.find(name => new RegExp(`\\b${name}\\b`).test(output)) : undefined;
      const castIssue = (output: string) => {
        if (!cast) return null;
        const stock = stockName(output);
        if (stock) return `Used the stock name ${stock}; the people are ${cast.protagonist} and ${cast.companion}.`;
        if (index === 0 && !new RegExp(`\\b${cast.protagonist}\\b`).test(output)) return `The main person must be named ${cast.protagonist}.`;
        return null;
      };
      const earlierReuse = (output: string) => index === 0 ? openingReuseReason(output, current.config.avoidOpenings || []) : null;
      const openingReuse = (output: string) => earlierReuse(output) || castIssue(output);
      const beat = showBeat(current, index);
      genreEvaluation = evaluateGenreTurn(current.config.theme, beat, rawOutput, previous);
      const originalReuse = openingReuse(rawOutput);
      if (originalReuse) genreEvaluation = { ...genreEvaluation, status: 'review', issues: [...genreEvaluation.issues, originalReuse] };

      // Bounded Ending Resolution Gate (Issue 3: At most one bounded corrective generation)
      if (showBeat(current, index) === 'ending' && modelId === 'text') {
        const goal = current.canonicalWorldState?.narrativeGoal || current.config.cast?.hook || current.config.opening;
        if (result.finish_reason === 'length' || !hasMeaningfulEnding(rawOutput, goal, current.config.theme)) {
          if (retryCountRef.current === 0) {
            retryCountRef.current = 1;
            const climaxTurn = current.turns.slice().reverse().find(t => t.modelId === 'text' && t.status === 'completed' && t.output);
            const climaxOutcome = climaxTurn?.output ? ` The climax just forced a decisive choice: "${truncateWords(climaxTurn.output, 24)}".` : '';
            const endingCorrectionPrompt = `Conclude this ${getGenreContract(current.config.theme).displayName} story. Act IV Resolution.${climaxOutcome} State the definitive outcome of the climax choice and the original goal. Address and conclude the principal conflict: "${goal}". Show the final consequence and aftermath for the characters and world. Write three concise sentences, about 400–500 characters total. No recap.`;
            try {
              const correctiveResult = await generateTextStream(endingCorrectionPrompt, () => {}, Math.min(128, Math.max(32, current.config.maxTokens || 128)));
              const correctiveRaw = correctiveResult.output == null ? '' : outputText(correctiveResult.output).trim();
              if (correctiveRaw) {
                rawOutput = correctiveRaw;
                result = correctiveResult;
              }
            } catch {
              // Retake failed; evaluation proceeds on rawOutput
            }
          }
          if (!hasMeaningfulEnding(rawOutput, goal, current.config.theme)) {
            genreEvaluation = { status: 'review', issues: ['Ending did not meet the established ending contract for the climax choice and principal conflict.'], evidence: [] };
            rawAttempts.push({ requestId: result.request_id, output: rawOutput, reason: 'Ending lacked a complete outcome for the main objective.' });
          }
        }
      }

      // Repetition & loop check across all models (text & creative support voices)
      let copiedTurn = false;
      if (capability.role !== 'decision_assistant') {
        const earlierForRepetition = current.turns
          .filter(turn => turn.status === 'completed' && turn.output && turn.role !== 'decision_assistant')
          .map(turn => turn.output!);
        if (current.config.opening) earlierForRepetition.unshift(current.config.opening);
        const copied = (output: string) => detectRepetition(output, earlierForRepetition) || copiesPreviousSentence(output, earlierForRepetition);
        if (copied(rawOutput)) {
          copiedTurn = true;
          genreEvaluation = { status: 'review', issues: ['Repeated a previous passage or action; kept out of the story context.'], evidence: [] };
          rawAttempts.push({ requestId: result.request_id, output: rawOutput, reason: 'Repeated earlier passage.' });
        }
      }

      // Layer A: Raw model output is preserved.
      // Layer B: Format stage dialogue.
      let decisionData: ValidatedDecision | undefined;

      // Handle structured decision models
      if (capability.role === 'decision_assistant') {
        const parsedData = validateDecisionJson(rawOutput, decisionQuestion ? Object.keys(decisionQuestion.criteria) : undefined);
        decisionData = parsedData;
        if (!decisionData.valid) {
          const rejectedTurn: ShowTurn = {
            turnId,
            index,
            modelId,
            role: capability.role,
            status: 'rejected',
            requestId: result.request_id,
            route: result.route,
            output: rawOutput,
            stageText: `[${MODELS[modelId].characterName} vote rejected: ${decisionData.error || 'invalid decision output'}]`,
            stageTextProvenance: 'template',
            rejectionReason: decisionData.error || 'Inconclusive decision structure',
            decisionData,
            isRelevant: false,
            promptLength,
            contextTruncated,
            startedAt,
            finishedAt: new Date().toISOString(),
            latencyS: result.metrics?.total_latency_s
          };
          commit(appendShowTurn(showRef.current!, rejectedTurn));
          setPhase('presenting_turn');
          setMessage(`${MODELS[modelId].characterName} returned an invalid vote; recorded as rejected.`);
          schedule(2200);
          return;
        }
      }

      retryCountRef.current = 0;

      const formatted = formatStageDialogue(modelId, rawOutput, current.config.theme, storyPerspective, decisionQuestion ? Object.keys(decisionQuestion.criteria) : undefined);
      const storyDirection = decisionData && storyPerspective ? presentStoryDirection(modelId, decisionData, decisionQuestion?.criteria) : null;
      let stageText = storyDirection || formatted.stageText;
      const provenance = formatted.provenance;
      const characterNotInMedia = capability.media.length > 0 && pack &&
        extractStoryWorldState(current, index).characters.some(character => {
          const name = character.name.split(/\s+/).at(-1) || '';
          return name.length > 3 && new RegExp(`\b${name}\b`, 'i').test(rawOutput) &&
            !`${pack.imageDescription} ${pack.audioScriptOrGroundTruth}`.toLowerCase().includes(name.toLowerCase());
        });
      const unrelated = modelId !== 'text' && (/purple mascot|speech.recognition demonstration|sample audio|benchmark image/i.test(rawOutput) || !!characterNotInMedia);
      
      // Canonical world state event extraction and validation
      let canonicalIssues: string[] = [];
      let acceptedEvents: NarrativeEvent[] = [];
      let proposedEvents: NarrativeEvent[] = [];
      let loopIssue: string | undefined;

      if (rawOutput && (modelId === 'text' || (storyPerspective && capability.role !== 'decision_assistant'))) {
        const cws = current.canonicalWorldState || initializeCanonicalWorldState(current.config.theme, current.config.opening, current.config.cast);
        proposedEvents = extractProposedEvents(rawOutput, cws, modelId, index);
        const validation = validateProposedEvents(proposedEvents, rawOutput, cws);

        if (validation.valid && (modelId === 'text' || (storyPerspective && capability.role !== 'decision_assistant'))) {
          const pastAcceptedTurns = current.turns.filter(t => t.status === 'completed' && t.isRelevant !== false);
          const loopCheck = detectNarrativeLoop(rawOutput, proposedEvents, pastAcceptedTurns, cws);
          if (loopCheck.hasLoop) {
            loopIssue = loopCheck.issues[0];
          }
        }

        if (validation.valid) {
          acceptedEvents = validation.acceptedEvents;
          current.canonicalWorldState = applyEventsToWorldState(cws, acceptedEvents, index, current.turnOrder.length);
        } else {
          canonicalIssues = validation.issues;
          if (validation.issues.some(issue => /Repeated canonical event|Repeated action|Repeated discovery|Location regression/.test(issue))) loopIssue = validation.issues.find(issue => /Repeated canonical event|Repeated action|Repeated discovery|Location regression/.test(issue));
        }
      }

      if (rawOutput !== outputText(result.output).trim()) result = { ...result, output: rawOutput };
      stageText = storyDirection || formatStageDialogue(modelId, rawOutput, current.config.theme, storyPerspective, decisionQuestion ? Object.keys(decisionQuestion.criteria) : undefined).stageText;

      const finalDisplay = (stageText || rawOutput).slice(0, 500);
      if (modelId !== 'text') {
        const step = Math.max(2, Math.floor(finalDisplay.length / 15));
        for (let i = step; i < finalDisplay.length; i += step) {
          if (!mountedRef.current || epochRef.current !== currentEpoch || stoppedRef.current) return;
          setPreview(finalDisplay.slice(0, i));
          await new Promise(r => setTimeout(r, 16));
        }
      }
      setPreview(finalDisplay);

      const relevant = !unrelated && !copiedTurn && !loopIssue && capability.role !== 'decision_assistant' && canonicalIssues.length === 0;

      const turn: ShowTurn = {
        turnId,
        index,
        modelId,
        role: capability.role,
        status: 'completed',
        requestId: result.request_id,
        route: result.route,
        output: rawOutput,
        stageText,
        stageTextProvenance: provenance,
        evidencePackId: pack?.packId,
        mediaIds: pack ? [image && pack.imageAsset, audio && pack.audioAsset].filter((value): value is string => !!value) : [],
        storyPerspective,
        isRelevant: relevant,
        decisionData,
        decisionOptions: decisionQuestion?.criteria,
        promptLength,
        contextTruncated,
        startedAt,
        finishedAt: new Date().toISOString(),
        latencyS: result.metrics?.total_latency_s,
        genreEvaluation,
        rawAttempts: rawAttempts.length ? rawAttempts : undefined,
        proposedEvents: proposedEvents.length ? proposedEvents : undefined,
        acceptedEvents: acceptedEvents.length ? acceptedEvents : undefined,
        continuityIssues: canonicalIssues.length ? canonicalIssues : undefined,
        loopIssue,
        isTruncated: isTruncatedOutput(rawOutput).truncated,
        finishReason: result.finish_reason,
        activityReceipt: result.activity_receipt
      };

      const next = appendShowTurn(showRef.current!, turn);
      commit(next);
      setPreview(finalDisplay);
      setReactionState('happy');
      setReaction(v => v + 1);
      setModeLabel('Presenting result');

      // Turns with continuity issues or invalid outcomes do not earn League points
      const award = (unrelated || canonicalIssues.length > 0)
        ? { event: null }
        : awardAutoStoryTurn(modelId, current.showId, turnId, result.request_id, capability.narrativeWriter ? 'writer' : 'support', result.activity_receipt);
      setPhase('presenting_turn');
      setMessage(`${MODELS[modelId].characterName} completed turn ${index + 1}${award.event ? ` · +${award.event.pointsEarned} League points` : ''}.`);

      if (next.turns.length === next.turnOrder.length) {
        const cws = current.canonicalWorldState || initializeCanonicalWorldState(current.config.theme, current.config.opening, current.config.cast);
        // Success requires every writer turn to complete and a validated ending; specialist failures stay recorded as failed but do not fake success.
        const lastTurn = next.turns.at(-1);
        const completed = next.turns.filter(item => item.modelId === 'text').every(item => item.status === 'completed') && lastTurn?.isTruncated !== true &&
          lastTurn?.modelId === 'text' && !lastTurn.genreEvaluation?.issues?.some(issue => issue.startsWith('Ending did not meet')) && hasMeaningfulEnding(lastTurn.output || '', cws.narrativeGoal, current.config.theme);
        const audit = auditStoryContinuity(cws, next.turns.map(t => t.output || '').join(' '));
        const qualityAudit = auditStoryQuality(cws, next.turns);
        const final = { ...next, status: completed ? 'completed' as const : 'failed' as const, canonicalWorldState: cws, continuityAudit: audit, storyQualityAudit: qualityAudit, updatedAt: new Date().toISOString() };
        commit(final);
        if (completed) {
          const finalReceipt = next.turns.slice().reverse().find(item => item.activityReceipt)?.activityReceipt;
          awardAutoStorySession(final.showId, final.turns.map(item => item.requestId!).filter(Boolean), finalReceipt);
        }
        void stopActivity(final.showId, completed ? 'completed' : 'failed');
        setPhase(stoppedRef.current ? 'stopped' : completed ? 'completed' : 'failed');
        setMessage(completed ? `Live show complete! ${qualityAudit.label}` : 'Show ended without a validated ending (narrative failure recorded).');
      } else if (stoppedRef.current) {
        setPhase('stopped');
        setMessage('Show stopped. Completed turns remain saved.');
      } else if (pausedRef.current) {
        setPhase('paused');
        setMessage('Show paused. Completed turns are preserved.');
      } else if (current.config.playback === 'automatic') {
        const readDelay = Math.min(1200, Math.max(800, Math.round(finalDisplay.length * 4)));
        schedule(readDelay);
      } else {
        setPhase('paused');
        setMessage('Ready for the next manual Step.');
      }
    } catch (error) {
      if (!mountedRef.current || epochRef.current !== currentEpoch || stoppedRef.current) return;
      const is429 = (error instanceof ApiError && error.status === 429) || /rate limit|compute budget/i.test(String(error));
      if (is429) {
        pauseForRateLimit(error, index);
        return;
      }
      const detail = error instanceof Error ? error.message : 'Local inference failed.';
      const failed: ShowTurn = {
        turnId,
        index,
        modelId,
        role: capability.role,
        status: 'failed',
        error: detail,
        output: failedOutput || undefined,
        rawAttempts: rawAttempts.length ? rawAttempts : undefined,
        promptLength,
        contextTruncated,
        startedAt,
        finishedAt: new Date().toISOString()
      };
      commit({ ...appendShowTurn(showRef.current!, failed), status: 'failed' });
      setPhase(stoppedRef.current ? 'stopped' : 'failed');
      setMessage(`${MODELS[modelId].characterName} turn failed: ${detail}`);
      setReactionState('sad');
      setReaction(v => v + 1);
    } finally {
      pendingRef.current = false;
      if (mountedRef.current) setPending(false);
    }
  };

  const startWithConfig = async (newConfig: ShowConfig, useSelectedCount = turnCountCustomized) => {
    if (storyCooldownRemaining > 0) {
      setMessage(`Cooldown active: Please wait ${storyCooldownRemaining}s before starting another full story show.`);
      return;
    }
    const selectedPack = newConfig.scenarioId ? getEvidencePackForTheme(newConfig.theme) : null;
    const savedShows = readShows();
    const previousTexts = savedShows.flatMap(s => s.turns.filter(t => t.status === 'completed' && t.output).map(t => t.output!));
    const previousCasts = readCastMemory();
    const cast = newConfig.cast || chooseStoryCast(newConfig.theme, previousTexts, previousCasts);
    if (cast) rememberCast(cast);

    const freshPremise = newConfig.opening.trim() || selectedPack?.opening || generateFreshPremise(newConfig.theme, cast);

    newConfig = {
      ...newConfig,
      maxTokens: (newConfig.maxTokens || 128) as ShowConfig['maxTokens'],
      cast,
      opening: freshPremise,
      scenarioId: selectedPack?.packId,
      avoidOpenings: savedShows.flatMap(savedShow => savedShow.turns.filter(turn => turn.modelId === 'text' && turn.status === 'completed' && turn.output).slice(0, 1).map(turn => turn.output!)).slice(0, 5)
    };
    const invalid = validateShowConfig(newConfig);
    if (invalid) {
      setMessage(invalid);
      return;
    }
    epochRef.current += 1;
    stoppedRef.current = false;
    pausedRef.current = false;
    retryCountRef.current = 0;

    const chooseStoryTurnCount = () => 10 + Math.floor(Math.random() * 3);
    const next = createShow({ ...newConfig, turnCount: useSelectedCount ? newConfig.turnCount : chooseStoryTurnCount() });
    commit(next);
    setPhase('preparing');
    setMessage(`New ${next.config.theme} story started · ${next.turnOrder.length} turns across ${next.config.modelIds.length} models.`);
    try {
      const cur = await getCurrentActivity();
      if (cur.active && cur.activity) {
        await stopActivity(cur.activity.session_id, 'new_story_started');
      }
      await startActivity('STORY', next.showId, undefined, { theme: next.config.theme, turns: next.turnOrder.length });
    } catch (e) {
      console.warn('startActivity error, continuing:', e);
    }
    schedule(0);
  };

  const startRandomShow = () => {
    const choices = STORY_THEMES.filter(theme => theme !== previousThemeRef.current);
    const available = choices.length ? choices : STORY_THEMES;
    const randomTheme = available[Math.floor(Math.random() * available.length)];
    previousThemeRef.current = randomTheme;
    const chooseStoryTurnCount = () => 10 + Math.floor(Math.random() * 3);
    const randomConfig: ShowConfig = {
      theme: randomTheme,
      opening: '',
      turnCount: chooseStoryTurnCount(),
      modelIds: SHOW_CAPABILITIES.map(capability => capability.modelId),
      playback: 'automatic',
      maxTokens: 128,
    };
    setConfig(randomConfig);
    setTurnCountCustomized(false);
    startWithConfig(randomConfig, true);
  };

  const pause = () => {
    pausedRef.current = true;
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setPhase('paused');
    setMessage(pendingRef.current ? 'Pause requested. In-flight model request will complete, then pause.' : 'Paused between turns.');
  };

  const resume = async () => {
    if (!showRef.current) return;
    stoppedRef.current = false;
    pausedRef.current = false;
    pendingRef.current = false;
    setPending(false);
    if (countdownIntervalRef.current !== null) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setRateLimitCountdown(null);

    if (phaseRef.current === 'paused_rate_limit' || showRef.current.status === 'paused_rate_limit') {
      resumeFromRateLimit();
      return;
    }
    if (showRef.current.status === 'parked' || showRef.current.status === 'active') {
      try {
        await resumeParkedActivity(showRef.current.showId);
      } catch {
        try {
          await startActivity('STORY', showRef.current.showId, undefined, {
            theme: showRef.current.config.theme,
            turn: showRef.current.turns.length,
            turnCount: showRef.current.config.turnCount,
          });
        } catch {}
      }
      commit({ ...showRef.current, status: 'active', updatedAt: new Date().toISOString() });
      window.dispatchEvent(new CustomEvent('prismlab_activity_change'));
    }
    pausedRef.current = false;
    stoppedRef.current = false;
    setMessage('Resuming the autonomous show…');
    setPhase('preparing');
    schedule(0);
  };

  const stop = () => {
    epochRef.current += 1;
    stoppedRef.current = true;
    pausedRef.current = false;
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (countdownIntervalRef.current !== null) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setRateLimitCountdown(null);
    const current = showRef.current;
    if (current && current.mode === 'live_local_show') {
      commit({ ...current, status: 'stopped', updatedAt: new Date().toISOString() });
      void stopActivity(current.showId, 'user_stopped');
    }
    setPhase('stopped');
    setMessage('Show stopped. Completed turns remain safely saved in history.');
  };

  const retry = () => {
    const current = showRef.current;
    if (!current || pendingRef.current || current.turns.at(-1)?.status !== 'failed') return;
    const next = { ...current, turns: current.turns.slice(0, -1), status: 'active' as const };
    commit(next);
    setPhase('preparing');
    setMessage('Retrying turn…');
    stoppedRef.current = false;
    pausedRef.current = false;
    schedule(0);
  };

  const skip = () => {
    const current = showRef.current;
    if (!current || pendingRef.current || current.turns.at(-1)?.status !== 'failed') return;
    const turns = [...current.turns];
    turns[turns.length - 1] = { ...turns[turns.length - 1], status: 'skipped' };
    commit({ ...current, turns, status: 'active' });
    setMessage('Turn marked skipped.');
    stoppedRef.current = false;
    pausedRef.current = false;
    schedule(0);
  };

  const restart = () => {
    epochRef.current += 1;
    stoppedRef.current = true;
    pausedRef.current = false;
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const current = showRef.current;
    if (current?.mode === 'live_local_show' && current.status === 'active') {
      commit({ ...current, status: 'stopped', updatedAt: new Date().toISOString() });
    }
    showRef.current = null;
    setShow(null);
    if (!turnCountCustomized) setConfig(previous => ({ ...previous, turnCount: 10 }));
    setPreview('');
    setPhase('configuring');
    setMessage('Choose a genre to start a new story.');
    stoppedRef.current = false;
    pausedRef.current = false;
  };

  const replay = (savedShow: ShowRecord) => {
    epochRef.current += 1;
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    stoppedRef.current = true;
    const next = asReplay(savedShow);
    showRef.current = next;
    setShow(next);
    setPreview('');
    setPhase(next.status === 'completed' ? 'completed' : next.status === 'stopped' ? 'stopped' : 'failed');
    setMessage('Recorded show replay · uses saved model outputs; no live inference or League points.');
  };

  const planError = validateShowConfig(config);
  const planned = planError ? [] : planShow(config);

  return (
    <section className="chat-story-inline" aria-label="Auto Story controls">
      {!show ? (
        <div className="chat-story-setup">
          <div className="chat-story-inline-head">
            <strong>✦ Auto Story</strong>
            <span>{config.modelIds.length} models · {turnCountCustomized ? `${config.turnCount} turns` : 'random 10–12 turns'}. Choose any genre; each model receives the previous story context.</span>
          </div>

          <label className="chat-story-opening">
            Genre
            <select value={config.theme} onChange={e => { setTurnCountCustomized(false); setConfig({ ...config, theme: e.target.value, opening: '', modelIds: SHOW_CAPABILITIES.map(capability => capability.modelId) }); }}>
              {STORY_THEMES.map(theme => <option key={theme}>{theme}</option>)}
            </select>
          </label>

          {storyCooldownRemaining > 0 && (
            <div className="chat-story-cooldown-notice" style={{ padding: '8px 12px', background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '6px', margin: '8px 0', fontSize: '0.85rem' }}>
              ✦ Full story completed! Next story available in <strong>{storyCooldownRemaining}s</strong> (3-minute cooldown between full story sessions).
            </div>
          )}

          <div className="chat-story-one-click-row">
            <button
              type="button"
              className="chat-story-primary chat-story-start-random"
              onClick={() => startWithConfig(config)}
              disabled={storyCooldownRemaining > 0}
            >
              {storyCooldownRemaining > 0 ? `▶ Cooldown (${storyCooldownRemaining}s)` : '▶ Start Story'}
            </button>
            <button
              type="button"
              className="chat-story-secondary"
              onClick={startRandomShow}
              disabled={storyCooldownRemaining > 0}
            >
              {storyCooldownRemaining > 0 ? `Cooldown (${storyCooldownRemaining}s)` : 'Start Random Show'}
            </button>
          </div>

          <details className="chat-story-adv-panel">
            <summary>More options (turns, cast, playback)</summary>
            <div className="chat-story-setup-row">
              <label>
                Turns
                <select value={turnCountCustomized ? String(config.turnCount) : 'random'} onChange={e => {
                  if (e.target.value === 'random') setTurnCountCustomized(false);
                  else { setTurnCountCustomized(true); setConfig({ ...config, turnCount: Number(e.target.value) }); }
                }}>
                  <option value="random">Random (10–12)</option>
                  {[10, 11, 12].map(count => <option key={count} value={count}>{count}</option>)}
                </select>
              </label>
              <label>
                Playback
                <select value={config.playback} onChange={e => setConfig({ ...config, playback: e.target.value as ShowConfig['playback'] })}>
                  <option value="automatic">Auto Play</option>
                  <option value="manual">Manual Step</option>
                </select>
              </label>
            </div>

            <label className="chat-story-opening">
              Opening sentence (optional)
              <input
                maxLength={240}
                value={config.opening}
                onChange={e => setConfig({ ...config, opening: e.target.value })}
                placeholder="Leave blank for a fresh opening"
              />
            </label>

            <div className="chat-story-cast">
              <button type="button" onClick={() => setConfig({ ...config, modelIds: SHOW_CAPABILITIES.map(cap => cap.modelId), turnCount: Math.max(10, config.turnCount) })}>
                Full Cast (6 Models)
              </button>
              <button type="button" onClick={() => setConfig({ ...config, modelIds: ['text'] })}>
                Prism Pure Solo
              </button>
              <details>
                <summary>Select individual characters</summary>
                <div>
                  {SHOW_CAPABILITIES.map(cap => (
                    <label key={cap.modelId}>
                      <input
                        type="checkbox"
                        checked={config.modelIds.includes(cap.modelId)}
                        disabled={cap.modelId === 'text'}
                        onChange={e => setConfig({
                          ...config,
                          modelIds: e.target.checked
                            ? [...config.modelIds, cap.modelId]
                            : config.modelIds.filter(id => id !== cap.modelId)
                        })}
                      />
                      {MODELS[cap.modelId].characterName} <small>({cap.title})</small>
                    </label>
                  ))}
                </div>
              </details>
            </div>
            <p className="chat-story-note">
              {planError || `${planned.length} sequential turns · ${planned.map(id => MODELS[id].characterName).join(' → ')}`}
            </p>
          </details>

          {saved.length > 0 && (
            <details className="chat-story-replays">
              <summary>Recorded Stories ({saved.slice(0, 5).length})</summary>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px 8px' }}>
                <span style={{ fontSize: '0.8rem', opacity: 0.75 }}>Showing up to 5 most recent stories</span>
                <button
                  type="button"
                  style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'transparent', border: '1px solid currentColor', borderRadius: '4px', cursor: 'pointer', opacity: 0.8 }}
                  onClick={() => {
                    clearShows();
                    setSaved([]);
                  }}
                >
                  Clear Slate
                </button>
              </div>
              {saved.slice(0, 5).map(item => (
                <button
                  type="button"
                  key={item.showId}
                  onClick={() => {
                    if (item.mode === 'live_local_show' && (item.status === 'parked' || item.status === 'active')) {
                      showRef.current = item;
                      setShow(item);
                      setPhase('paused');
                      setMessage(`Story paused at Turn ${item.turns.length + 1} of ${item.turnOrder.length}. Click "Resume" to continue.`);
                      stoppedRef.current = false;
                      pausedRef.current = true;
                    } else {
                      replay(item);
                    }
                  }}
                >
                  {item.config.theme} · {item.turns.length}/{item.turnOrder.length} turns · {item.status}
                </button>
              ))}
            </details>
          )}
        </div>
      ) : (
        <div className="chat-story-running">
          <div className="chat-story-running-top">
            <strong>
              {show.mode === 'recorded_show' ? 'Recorded Story Replay' : `Auto Story · Turn ${Math.min(show.turns.length + 1, show.turnOrder.length)}/${show.turnOrder.length}`}
            </strong>
            <span>
              {phase.replaceAll('_', ' ')} · {showBeat(show, Math.min(show.turns.length, show.turnOrder.length - 1))}
            </span>
          </div>

          {phase === 'paused_rate_limit' && (
            <div className="chat-story-rate-limit-banner" style={{ padding: '8px 12px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: '6px', margin: '8px 0', fontSize: '0.875rem' }}>
              <strong>Models In Use · In Queue</strong>
              <p style={{ margin: '4px 0' }}>
                Another visitor is currently using the shared inference models. Your story is safely preserved at Turn {Math.min(show.turns.length + 1, show.turnOrder.length)} of {show.turnOrder.length}. {rateLimitCountdown !== null && rateLimitCountdown > 0 ? `Resuming turn automatically in ${rateLimitCountdown}s, or click Resume when ready.` : 'Queue cleared! Resuming now.'}
              </p>
            </div>
          )}

          <div className="chat-story-running-actions">
            {show.mode === 'live_local_show' && (
              <>
                {phase === 'paused' || phase === 'paused_rate_limit' ? (
                  <button type="button" onClick={resume}>
                    ▶ Resume {rateLimitCountdown !== null && rateLimitCountdown > 0 ? `(${rateLimitCountdown}s)` : ''}
                  </button>
                ) : (
                  <button type="button" onClick={pause} disabled={['completed', 'stopped', 'failed'].includes(phase)}>⏸ Pause</button>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    pause();
                    const curr = showRef.current;
                    if (curr) {
                      commit({ ...curr, status: 'parked', updatedAt: new Date().toISOString() });
                      await parkActivity(curr.showId, {
                        theme: curr.config.theme,
                        turn: curr.turns.length,
                        turnCount: curr.config.turnCount,
                      });
                      window.dispatchEvent(new CustomEvent('prismlab_activity_change'));
                    }
                  }}
                  disabled={['completed', 'stopped'].includes(phase)}
                >
                  💾 Save & Exit
                </button>
                <button type="button" onClick={stop} disabled={['completed', 'stopped'].includes(phase)}>⏹ Stop</button>
                {show.config.playback === 'manual' && (
                  <button
                    type="button"
                    onClick={() => { pausedRef.current = false; setPhase('preparing'); schedule(0); }}
                    disabled={pending || ['completed', 'stopped', 'failed'].includes(phase)}
                  >
                    Next Turn →
                  </button>
                )}
                {phase === 'failed' && (
                  <>
                    <button type="button" onClick={retry} disabled={pending}>↺ Retry Turn</button>
                    <button type="button" onClick={skip} disabled={pending}>↷ Skip Turn</button>
                  </>
                )}
              </>
            )}
            {phase === 'completed' && (
              <button
                type="button"
                className="chat-story-primary"
                onClick={() => setShowWinnerModal(true)}
              >
                🏆 View Standings
              </button>
            )}
            <button type="button" onClick={restart}>+ New Story</button>
            <button type="button" onClick={onHistory}>Story History ({show.turns.length}) →</button>
            <button type="button" onClick={() => exportShow(show, 'txt')}>Export Text</button>
            <button type="button" onClick={() => exportShow(show, 'json')}>Export Evidence</button>
          </div>

          <p className="chat-story-status" role="status">
            {modeLabel && <span className="chat-story-model-mode">[{modeLabel}] </span>}
            {message}
          </p>
        </div>
      )}
      <StoryWinnerModal
        isOpen={showWinnerModal}
        onClose={() => setShowWinnerModal(false)}
        onPlayAgain={startRandomShow}
        show={show}
      />
    </section>
  );
};
