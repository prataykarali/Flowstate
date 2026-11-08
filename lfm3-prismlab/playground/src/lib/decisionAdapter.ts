/**
 * Natural-Language Decision Input Adapter for Prism Thinker (d1-2B) and Sherlock Omni (d1-Omni-2B).
 * Translates conversational inputs and queries into native /v1/systemone decision questions.
 */

export interface DecisionQuestionPayload {
  instructions: string;
  criteria: Record<string, string>;
}

export interface DecisionParseResult {
  kind: 'conversational' | 'generative_redirect' | 'decision';
  message?: string;
  question?: DecisionQuestionPayload;
  category?: 'comparison' | 'binary' | 'priority' | 'media_evidence' | 'triage';
  options?: string[];
}

const GREETING_REGEX = /^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening)|howdy)\b/i;
const IDENTITY_REGEX = /(who are you|what is your (name|role)|what do you do|what are you|tell me about yourself)/i;
const GENERATIVE_REGEX = /^(write|generate|compose|draft|tell me a story|write a poem|create a song|tell a joke|tell me a bedtime story)\b/i;

function cleanOptionSlug(text: string): string {
  const slug = text.toLowerCase().trim().replace(/[^a-z0-9_-]+/g, '_').slice(0, 30);
  return slug || `opt_${Math.random().toString(36).slice(2, 6)}`;
}

export function parseNaturalDecision(
  prompt: string,
  model: 'd1' | 'd1_omni',
  hasMedia?: { hasImage?: boolean; hasAudio?: boolean; hasVideo?: boolean }
): DecisionParseResult {
  const text = prompt.trim();
  const modelName = model === 'd1_omni' ? 'Sherlock Omni (d1-Omni-2B)' : 'Prism Thinker (d1-2B)';

  // 1. Identity or Greeting Check
  if (GREETING_REGEX.test(text) || IDENTITY_REGEX.test(text)) {
    const explanation = model === 'd1_omni'
      ? `Hello! I am Sherlock Omni (d1-Omni-2B), an omni-modal decision intelligence model. Rather than open-ended chit-chat, I evaluate multimodal evidence (images, audio, and text) against structured operational choices with exact probability distributions and review gates. Ask me to compare choices (e.g. "Should we choose X or Y?"), classify incidents, or inspect attached media!`
      : `Hello! I am Prism Thinker (d1-2B), a structured decision intelligence model. Rather than open-ended conversation, I evaluate text scenarios against candidate choices with forward logit probabilities and confidence gates. Ask me to weigh tradeoffs (e.g. "Should we choose PostgreSQL or MongoDB?"), evaluate approvals, or prioritize tasks!`;
    return {
      kind: 'conversational',
      message: explanation,
    };
  }

  // 2. Creative Generative Redirect
  if (GENERATIVE_REGEX.test(text)) {
    return {
      kind: 'generative_redirect',
      message: `${modelName} is specialized for discrete evaluation and decision intelligence rather than long-form creative writing. For poems, narratives, and creative chat, try switching to Prism Pure (LFM3-1.7B) — our generative champion!`,
    };
  }

  // 3. Comparison Extraction (e.g. "Should I choose X or Y", "X vs Y", "Which is better: X or Y")
  const comparisonPatterns = [
    /(?:should (?:we|i|it)|shall (?:we|i)|do (?:we|i)|can (?:we|i))\s+(?:choose|pick|use|select|go with|prefer)\s+(.+?)\s+or\s+(.+?)[\?\.]*$/i,
    /(?:which is better|which one should (?:i|we) (?:use|pick|choose)|which is preferred)(?:\:|\s+between)?\s+(.+?)\s+(?:or|vs\.?|versus)\s+(.+?)[\?\.]*$/i,
    /(?:compare|evaluate)\s+(.+?)\s+(?:and|or|vs\.?|versus)\s+(.+?)[\?\.]*$/i,
    /^(.+?)\s+(?:vs\.?|versus)\s+(.+?)[\?\.]*$/i,
  ];

  for (const pat of comparisonPatterns) {
    const match = text.match(pat);
    if (match) {
      const opt1 = match[1].replace(/^(either\s+)/i, '').trim();
      const opt2 = match[2].replace(/[\?\.]*$/, '').trim();
      if (opt1 && opt2 && opt1.length <= 60 && opt2.length <= 60) {
        const slug1 = cleanOptionSlug(opt1);
        const slug2 = cleanOptionSlug(opt2);
        return {
          kind: 'decision',
          category: 'comparison',
          options: [opt1, opt2],
          question: {
            instructions: `Which candidate option is better suited for this scenario?`,
            criteria: {
              [slug1]: opt1,
              [slug2]: opt2,
            },
          },
        };
      }
    }
  }

  // 4. Binary Approval / Yes-No Detection
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

  // 5. Priority / Severity Assessment
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

  // 6. Multimodal Evidence Assessment (if media attached)
  if (hasMedia?.hasImage || hasMedia?.hasAudio || hasMedia?.hasVideo || /(image|audio|sound|recording|photo|defect|anomaly)\b/i.test(text)) {
    return {
      kind: 'decision',
      category: 'media_evidence',
      options: ['Verified / Anomaly Confirmed', 'Normal / Compliant', 'Inconclusive'],
      question: {
        instructions: `Evaluate the media evidence against the operational criteria:`,
        criteria: {
          anomaly_confirmed: 'Evidence confirms defect, anomaly, or targeted condition',
          normal_compliant: 'Evidence indicates normal, healthy, or compliant state',
          inconclusive: 'Evidence is ambiguous or requires human inspection',
        },
      },
    };
  }

  // 7. General Operational Triage Fallback
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

export function formatDecisionSummary(decision: {
  predicted_route?: string;
  confidence?: number;
  probabilities?: Record<string, number>;
  human_review_required?: boolean;
  exploratory_gate_passed?: boolean;
}): string {
  const route = decision.predicted_route ? decision.predicted_route.toUpperCase() : 'DECISION COMPLETED';
  const conf = decision.confidence != null ? `${(decision.confidence * 100).toFixed(1)}%` : '';
  const review = decision.human_review_required ? 'Review required ⚠' : 'Auto approved ✓';
  const gate = decision.exploratory_gate_passed ? 'Gate passed ✓' : 'Standard gate';

  const probLines = decision.probabilities
    ? Object.entries(decision.probabilities)
        .sort(([, a], [, b]) => b - a)
        .map(([k, v]) => `• ${k}: ${(v * 100).toFixed(1)}%`)
        .join('\n')
    : '';

  return [
    `🎯 Decision: ${route} ${conf ? `(${conf})` : ''}`,
    `Status: ${review} · ${gate}`,
    probLines ? `\nDistribution:\n${probLines}` : '',
  ].filter(Boolean).join('\n');
}
