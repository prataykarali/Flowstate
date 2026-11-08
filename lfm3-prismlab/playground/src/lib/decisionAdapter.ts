/**
 * Validated Decision Request Adapter for Prism Thinker (d1-2B) and Sherlock Omni (d1-Omni-2B).
 * Translates natural-language conversational queries into strictly validated /v1/systemone schemas.
 * Never falls back to arbitrary operational categories (monitor_passively, automate_mitigation, etc.)
 * unless the user specifically asks an operational mitigation / incident triage question.
 */

export interface DecisionQuestionPayload {
  instructions: string;
  criteria: Record<string, string>;
}

export interface DecisionParseResult {
  kind: 'conversational' | 'generative_redirect' | 'clarification' | 'decision';
  message?: string;
  question?: DecisionQuestionPayload;
  category?: 'comparison' | 'preference' | 'binary' | 'priority' | 'media_evidence' | 'triage';
  options?: string[];
  context?: string;
}

export interface HistoryMessage {
  role: string;
  text: string;
  fullText?: string;
  decisionQuestion?: DecisionQuestionPayload;
  decisionOptions?: string[];
}

const GREETING_REGEX = /^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening)|howdy)\b/i;
const IDENTITY_REGEX = /(who are you|what is your (name|role)|what do you do|what are you|tell me about yourself|your name)\b/i;
const GENERATIVE_REGEX = /^(write|generate|compose|draft|tell me a story|write a poem|create a song|tell a joke|tell me a bedtime story)\b/i;
const AMBIGUOUS_CHOICE_REGEX = /^(which (?:one|option|choice|alternative|route)(?:\s+should\s+(?:i|we)\s+(?:choose|pick|select|take))?|what should (?:i|we) (?:choose|pick|select|do)|how should (?:i|we) decide|what do you recommend|help me decide)[\?\.\s]*$/i;
const INSTEAD_REGEX = /^(?:what|how)\s+about\s+([a-zA-Z0-9_\-\s]{2,30}?)(?:\s+instead)?[\?\.\s]*$/i;
const PREFERENCE_REGEX = /(?:which (?:choice|one|option) is better (?:if|when)\s+|if (?:i|we) prefer\s+|(?:i|we) prefer\s+|preferring\s+)(.+)/i;
const FOLLOWUP_REGEX = /^(actually|what if|how about|what about|prioritiz|if we prioritiz|if i prioritiz|i prefer|preferring|with (a )?focus on|considering|weighting|give more weight to)\b/i;

function cleanOptionSlug(text: string): string {
  const slug = text.toLowerCase().trim().replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30);
  return slug || `opt_${Math.random().toString(36).slice(2, 6)}`;
}

function cleanOptionLabel(text: string): string {
  let label = text.trim().replace(/^[\s"'\*]+|[\s"'\*\?\.]+$/g, '');
  label = label.replace(/^(either|whether|a|an)\s+/i, '');
  label = label.replace(/\s+(instead|instead of.*|please)$/i, '');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function extractAlternatives(text: string): { opt1: string; opt2: string; context?: string } | null {
  const cleaned = text.trim();

  // Pattern 1: "What is better [a] X or [a] Y [for Z]?", "Which is better [a] X or [a] Y [for Z]?"
  const p1 = /(?:what|which)\s+is\s+better(?:\:|\s+between)?\s+(?:a\s+|an\s+)?(.+?)\s+(?:or|vs\.?|versus)\s+(?:a\s+|an\s+)?(.+?)(?:\s+(?:for|in|to|with)\s+([^?]+))?[\?\.]*$/i;
  let m = cleaned.match(p1);
  if (m) {
    const o1 = cleanOptionLabel(m[1]);
    const o2 = cleanOptionLabel(m[2]);
    if (o1 && o2 && o1.length <= 40 && o2.length <= 40) {
      return { opt1: o1, opt2: o2, context: m[3]?.trim() };
    }
  }

  // Pattern 2: "Should (we|i) (choose|pick|use|prefer|learn|select|go with|take|do)? [a] X or [a] Y [for Z]?"
  const p2 = /(?:should (?:we|i|it)|shall (?:we|i)|do (?:we|i)|can (?:we|i)|is it better to|would you recommend)\s+(?:choose|pick|use|select|go with|prefer|learn|study|adopt|deploy|take|try|do)?\s*(?:a\s+|an\s+)?(.+?)\s+or\s+(?:a\s+|an\s+)?(.+?)(?:\s+(?:for|in|to|with)\s+([^?]+))?[\?\.]*$/i;
  m = cleaned.match(p2);
  if (m) {
    const o1 = cleanOptionLabel(m[1]);
    const o2 = cleanOptionLabel(m[2]);
    if (o1 && o2 && o1.length <= 40 && o2.length <= 40) {
      return { opt1: o1, opt2: o2, context: m[3]?.trim() };
    }
  }

  // Pattern 3: "Compare [a] X and/or/vs [a] Y [for Z]", "Now compare [a] X and/or/vs [a] Y [for Z]"
  const p3 = /(?:now\s+)?(?:compare|evaluate|choose between)\s+(?:a\s+|an\s+)?(.+?)\s+(?:and|or|vs\.?|versus)\s+(?:a\s+|an\s+)?(.+?)(?:\s+(?:for|in|to|with)\s+([^?]+))?[\?\.]*$/i;
  m = cleaned.match(p3);
  if (m) {
    const o1 = cleanOptionLabel(m[1]);
    const o2 = cleanOptionLabel(m[2]);
    if (o1 && o2 && o1.length <= 40 && o2.length <= 40) {
      return { opt1: o1, opt2: o2, context: m[3]?.trim() };
    }
  }

  // Pattern 4: "[a] X vs/versus [a] Y [for Z]"
  const p4 = /^(?:a\s+|an\s+)?(.+?)\s+(?:vs\.?|versus)\s+(?:a\s+|an\s+)?(.+?)(?:\s+(?:for|in|to|with)\s+([^?]+))?[\?\.]*$/i;
  m = cleaned.match(p4);
  if (m) {
    const o1 = cleanOptionLabel(m[1]);
    const o2 = cleanOptionLabel(m[2]);
    if (o1 && o2 && o1.length <= 40 && o2.length <= 40) {
      return { opt1: o1, opt2: o2, context: m[3]?.trim() };
    }
  }

  // Pattern 5: "[a] X or [a] Y [for Z]?" (e.g. "Movie night or sleepover?")
  const p5 = /^(?:a\s+|an\s+)?([a-zA-Z0-9_\-\s]{2,35})\s+or\s+(?:a\s+|an\s+)?([a-zA-Z0-9_\-\s]{2,35})(?:\s+(?:for|in|to|with)\s+([^?]+))?[\?\.]*$/i;
  m = cleaned.match(p5);
  if (m && !/^(either|whether)\b/i.test(m[1])) {
    const o1 = cleanOptionLabel(m[1]);
    const o2 = cleanOptionLabel(m[2]);
    if (o1 && o2 && o1.length <= 40 && o2.length <= 40) {
      return { opt1: o1, opt2: o2, context: m[3]?.trim() };
    }
  }

  return null;
}

function extractMultiAlternatives(text: string): { options: string[]; context?: string } | null {
  let cleaned = text.trim();

  // Strip trailing punctuation
  cleaned = cleaned.replace(/[\?\.\!]+$/, '').trim();

  // 1. Check for trailing context (e.g. "... for dinner tonight", "... in web apps", "... with high performance")
  let context: string | undefined = undefined;
  const contextMatch = cleaned.match(/(?:^|\s+)(?:for|in|to|with|when|given)\s+([^?.,!]+)$/i);
  if (contextMatch && contextMatch.index !== undefined && contextMatch.index > 5) {
    context = contextMatch[1].trim();
    cleaned = cleaned.slice(0, contextMatch.index).trim();
  }

  // 2. Match & remove leading prefixes like "choose :", "which is better :", "compare :", etc.
  const prefixRegex = /^(?:(?:what|which)(?:\'s|\s+is)?\s+(?:the\s+)?(?:better|best|preferred)(?:\s+option|\s+choice)?(?:\s+(?:between|among|from|of))?|(?:should|shall|can|could|would)\s+(?:we|i|it|you)(?:\s+recommend)?(?:\s+(?:choose|pick|select|go\s+with|take|order|eat|prefer|use|learn|try|buy|get))?(?:\s+(?:between|among|from|of))?|(?:please\s+)?(?:choose|pick|select|decide|compare|evaluate|rank|weigh)(?:\s+(?:one|between|among|from|of))?|(?:options|alternatives|choices|candidates)(?:\s+are)?|(?:between|among))\s*[:\-\—]?\s*/i;
  
  if (prefixRegex.test(cleaned)) {
    cleaned = cleaned.replace(prefixRegex, '').trim();
  }

  // 3. Normalize delimiter separators:
  // Convert newlines, semicolons, bullet points, slashes, vs, and/or
  const normalized = cleaned
    .replace(/^[\s\*\-\•\d\.\)]+/gm, '') // strip leading bullets/numbers on lines
    .replace(/\s+\d+[\.\)]\s+/g, ', ') // inline numbered lists: 1. A 2. B
    .replace(/[\r\n;]+/g, ', ')
    .replace(/\s*\/\s*/g, ', ')
    .replace(/\s+(?:vs\.?|versus)\s+/gi, ', ')
    .replace(/,\s*(?:or|and)\s+/gi, ', ')
    .replace(/\s+(?:or|and)\s+/gi, ', ');

  // 4. Split by comma
  const rawParts = normalized
    .split(',')
    .map(p => cleanOptionLabel(p))
    .filter(p => p.length >= 1 && p.length <= 40 && !/^(either|whether|both|neither)$/i.test(p));

  // Deduplicate case-insensitively while preserving order
  const uniqueParts: string[] = [];
  const seen = new Set<string>();
  for (const part of rawParts) {
    const lower = part.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      uniqueParts.push(part);
    }
  }

  if (uniqueParts.length >= 2 && uniqueParts.length <= 8) {
    // Only accept if each option is reasonable (<= 6 words)
    const validWords = uniqueParts.every(p => p.split(/\s+/).length <= 6);
    if (validWords) {
      return { options: uniqueParts, context };
    }
  }

  // Fallback to legacy 2-option extractAlternatives if multi-split wasn't confident
  const legacy = extractAlternatives(text);
  if (legacy) {
    return { options: [legacy.opt1, legacy.opt2], context: legacy.context };
  }

  return null;
}

export function parseNaturalDecision(
  prompt: string,
  model: 'd1' | 'd1_omni',
  hasMedia?: { hasImage?: boolean; hasAudio?: boolean; hasVideo?: boolean },
  history?: HistoryMessage[]
): DecisionParseResult {
  const text = prompt.trim();
  const modelName = model === 'd1_omni' ? 'Sherlock Omni (d1-Omni-2B)' : 'Prism Thinker (d1-2B)';

  // 1. Identity or Greeting Check (Prompt A: "What is your name?")
  if (GREETING_REGEX.test(text) || IDENTITY_REGEX.test(text)) {
    const explanation = model === 'd1_omni'
      ? `Hello! I am Sherlock Omni (d1-Omni-2B), an omni-modal decision intelligence model. Rather than open-ended chit-chat, I evaluate multimodal evidence (images, audio, and text) against structured operational choices with exact probability distributions and review gates. Ask me to compare choices (e.g. "What is better, a movie night or sleepover?"), inspect attached media, or classify incidents!`
      : `Hello! I am Prism Thinker (d1-2B), a structured decision intelligence model. Rather than open-ended conversation, I evaluate candidate choices against operational and preference scenarios using forward logit probabilities. Ask me to weigh tradeoffs (e.g. "What is better a movie night or sleep over" or "Should I learn Python or Rust for AI research?"), evaluate approvals, or prioritize options!`;
    return {
      kind: 'conversational',
      message: explanation,
    };
  }

  // 2. Creative Generative Redirect (Prompt E: "Write a poem about space.")
  if (GENERATIVE_REGEX.test(text)) {
    return {
      kind: 'generative_redirect',
      message: `${modelName} is specialized for discrete evaluation and decision intelligence rather than long-form creative writing. For poems, narratives, and creative chat, try switching to Prism Pure (LFM3-1.7B) — our generative champion!`,
    };
  }

  // 3. Ambiguous Question: e.g. "Which one should I choose?"
  if (AMBIGUOUS_CHOICE_REGEX.test(text)) {
    const priorDecision = history?.slice().reverse().find(m => m.decisionQuestion?.criteria);
    if (!priorDecision || !priorDecision.decisionQuestion) {
      return {
        kind: 'clarification',
        message: `To help you evaluate a decision, please specify the candidate alternatives you are weighing (for example: "choose: biriyani, pizza, fried rice or pasta", "What is better, a movie night or sleepover?", or "Should I learn Python or Rust for AI research?"). Prism Thinker evaluates concrete candidate choices using native forward logit probabilities.`,
      };
    }
    return {
      kind: 'decision',
      category: 'comparison',
      options: priorDecision.decisionOptions || Object.values(priorDecision.decisionQuestion.criteria),
      question: {
        instructions: `Which candidate option should be selected from the previous alternatives?`,
        criteria: priorDecision.decisionQuestion.criteria,
      },
    };
  }

  // 3b. Candidate Substitution or Addition: e.g. "What about Java instead?"
  const insteadMatch = text.match(INSTEAD_REGEX);
  if (insteadMatch && history && history.length > 0) {
    const priorTurn = history.slice().reverse().find(m => m.decisionQuestion && m.decisionQuestion.criteria);
    if (priorTurn && priorTurn.decisionQuestion) {
      const newCandidate = cleanOptionLabel(insteadMatch[1]);
      const newSlug = cleanOptionSlug(newCandidate);
      const priorCriteria = priorTurn.decisionQuestion.criteria;
      const priorKeys = Object.keys(priorCriteria);
      const updatedCriteria: Record<string, string> = {};

      if (priorKeys.length <= 7) {
        for (const [k, v] of Object.entries(priorCriteria)) {
          const baseName = v.split(' - ')[0].split(' (')[0].trim();
          updatedCriteria[k] = baseName;
        }
        updatedCriteria[newSlug] = newCandidate;
      } else {
        for (const k of priorKeys.slice(0, 6)) {
          updatedCriteria[k] = priorCriteria[k].split(' - ')[0].split(' (')[0].trim();
        }
        updatedCriteria[newSlug] = newCandidate;
      }

      return {
        kind: 'decision',
        category: 'comparison',
        options: Object.values(updatedCriteria),
        context: `Including ${newCandidate}`,
        question: {
          instructions: `Evaluate ${newCandidate} alongside the candidate alternatives:`,
          criteria: updatedCriteria,
        },
      };
    }
  }

  // 4. Comparison & Multi-Option Extraction (supports 2, 3, 4, 5, 6, 7, or 8 options)
  const extracted = extractMultiAlternatives(text);
  if (extracted && extracted.options.length >= 2) {
    const criteria: Record<string, string> = {};
    const usedSlugs = new Set<string>();

    extracted.options.forEach((opt, idx) => {
      let slug = cleanOptionSlug(opt);
      if (usedSlugs.has(slug)) slug = `${slug}_${idx + 1}`;
      usedSlugs.add(slug);
      criteria[slug] = opt;
    });

    const contextStr = extracted.context ? ` for ${extracted.context}` : '';
    const isMulti = extracted.options.length > 2;

    return {
      kind: 'decision',
      category: 'comparison',
      options: extracted.options,
      context: extracted.context,
      question: {
        instructions: isMulti
          ? `Which candidate option is the best choice${contextStr}?`
          : `Which candidate option is better suited${contextStr}?`,
        criteria,
      },
    };
  }

  // 5. Follow-up Context / Preference ("Which choice is better if I prefer staying home?", "Actually I prefer staying at home.")
  const prefMatch = text.match(PREFERENCE_REGEX);
  const isFollowup = FOLLOWUP_REGEX.test(text) || !!prefMatch;
  if (isFollowup && history && history.length > 0) {
    const priorTurn = history.slice().reverse().find(m => m.decisionQuestion && m.decisionQuestion.criteria);
    if (priorTurn && priorTurn.decisionQuestion) {
      const priorCriteria = priorTurn.decisionQuestion.criteria;
      const priorKeys = Object.keys(priorCriteria);
      if (priorKeys.length >= 2) {
        const rawPref = prefMatch ? prefMatch[1] : text;
        const preference = rawPref.replace(/^(i|we)\s+prefer\s+/i, '').replace(/[\?\.]*$/, '').trim();
        const updatedCriteria: Record<string, string> = {};
        for (const [k, v] of Object.entries(priorCriteria)) {
          const baseName = v.split(' - ')[0].split(' (')[0].trim();
          updatedCriteria[k] = `${baseName} (evaluated with preference: ${preference})`;
        }
        return {
          kind: 'decision',
          category: 'preference',
          options: priorTurn.decisionOptions || priorKeys.map(k => cleanOptionLabel(k)),
          context: preference,
          question: {
            instructions: `Which candidate option better fits the visitor's preference: "${preference}"?`,
            criteria: updatedCriteria,
          },
        };
      }
    }
  }

  // 6. Multimodal Evidence Assessment (attached media or visual damage/defect check)
  if (
    hasMedia?.hasImage ||
    hasMedia?.hasAudio ||
    hasMedia?.hasVideo ||
    /(image|photo|picture|audio|sound|recording|defect|anomaly|damage|component)\b/i.test(text)
  ) {
    const isDamageQuery = /(damage|defect|fault|wear|broken|crack|anomaly)\b/i.test(text);
    return {
      kind: 'decision',
      category: 'media_evidence',
      options: isDamageQuery
        ? ['Damaged / Defect Confirmed', 'Normal / Intact', 'Inconclusive / Review Required']
        : ['Verified / Anomaly Confirmed', 'Normal / Compliant', 'Inconclusive'],
      question: {
        instructions: isDamageQuery
          ? `Analyze the multimodal evidence to assess component integrity and condition:`
          : `Evaluate the media evidence against the operational criteria:`,
        criteria: isDamageQuery
          ? {
              damaged_defect: 'Visual evidence confirms damage, defect, or anomaly',
              normal_intact: 'Visual evidence indicates intact, healthy, or normal state',
              inconclusive: 'Visual evidence is ambiguous or requires human inspection',
            }
          : {
              anomaly_confirmed: 'Evidence confirms defect, anomaly, or targeted condition',
              normal_compliant: 'Evidence indicates normal, healthy, or compliant state',
              inconclusive: 'Evidence is ambiguous or requires human inspection',
            },
      },
    };
  }

  // 7. Binary Approval / Yes-No Detection
  const binaryRegex = /^(should (?:we|i|it)|is (?:this|it|there)|can (?:we|i)|are (?:we|they)|do (?:we|i)|would (?:it|this)|could (?:we|i)|does (?:this|it))\b/i;
  if (binaryRegex.test(text)) {
    return {
      kind: 'decision',
      category: 'binary',
      options: ['Approve / Yes', 'Reject / No'],
      question: {
        instructions: `Should this action, claim, or change be approved and confirmed?`,
        criteria: {
          approve_yes: 'Yes, approve / confirm the action',
          reject_no: 'No, reject / deny or hold for review',
        },
      },
    };
  }

  // 8. Priority / Severity Assessment
  if (/(priority|urgency|severity|urgent|critical|tier)\b/i.test(text)) {
    return {
      kind: 'decision',
      category: 'priority',
      options: ['P1 Critical', 'P2 Elevated', 'P3 Routine', 'P4 Low'],
      question: {
        instructions: `What is the operational priority level for this situation?`,
        criteria: {
          p1_critical: 'P1 Critical - Blocking outage or severe impact',
          p2_elevated: 'P2 Elevated - Significant issue or degraded performance',
          p3_routine: 'P3 Routine - Minor issue with workaround',
          p4_low: 'P4 Low - Minor observation or enhancement',
        },
      },
    };
  }

  // 9. Operational Mitigation Triage (ONLY if user explicitly asks for system mitigation or triage)
  if (/(mitigation|failover|restart|incident|outage|throttle|shed load|rate limit)\b/i.test(text)) {
    return {
      kind: 'decision',
      category: 'triage',
      options: ['Automate Mitigation', 'Throttle & Shed', 'Restart / Failover', 'Monitor Passively'],
      question: {
        instructions: `Which operational decision or resolution route should be selected?`,
        criteria: {
          automate_mitigation: 'Automate immediate mitigation and patch',
          throttle_and_shed: 'Apply rate limiting and shed load',
          restart_failover: 'Trigger restart or failover to healthy replica',
          monitor_passively: 'No automated action; continue passive monitoring',
        },
      },
    };
  }

  // 10. Default Strict Safety: Do NOT silently substitute server-mitigation categories!
  // Ask for clarification or offer Prism Pure.
  return {
    kind: 'clarification',
    message: `I couldn't identify the specific decision options or criteria in your message. To evaluate a decision, please ask a comparison (for example: "What is better, a movie night or sleepover?" or "Python vs Rust") or specify alternatives you would like me to weigh. For open-ended conversation, you can switch to Prism Pure!`,
  };
}

export function formatDecisionSummary(decision: {
  predicted_route?: string;
  confidence?: number;
  probabilities?: Record<string, number>;
  human_review_required?: boolean;
  exploratory_gate_passed?: boolean;
  category?: string;
}): string {
  const route = decision.predicted_route ? decision.predicted_route.replace(/_/g, ' ') : 'DECISION COMPLETED';
  const conf = decision.confidence != null ? `${(decision.confidence * 100).toFixed(1)}%` : '';
  const isOperational = decision.category === 'triage' || decision.category === 'priority';

  // Capitalize route label nicely
  const formattedRoute = route.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const probLines = decision.probabilities
    ? Object.entries(decision.probabilities)
        .sort(([, a], [, b]) => b - a)
        .map(([k, v]) => `• ${cleanOptionLabel(k)}: ${(v * 100).toFixed(1)}%`)
        .join('\n')
    : '';

  const lines = [
    `🎯 Selected Choice: **${formattedRoute}** ${conf ? `(${conf} relative probability)` : ''}`,
  ];

  if (isOperational) {
    const review = decision.human_review_required ? 'Review required ⚠' : 'Auto approved ✓';
    const gate = decision.exploratory_gate_passed ? 'Gate passed ✓' : 'Standard gate';
    lines.push(`Governance: ${review} · ${gate}`);
  } else {
    lines.push(`Relative choice probabilities:`);
  }

  if (probLines) {
    lines.push(probLines);
  }

  if (!isOperational) {
    lines.push(`\nNote: Probabilities reflect relative model distribution across the provided choices. You can refine this by stating specific preferences (e.g., "I prefer staying at home").`);
  }

  return lines.join('\n');
}
