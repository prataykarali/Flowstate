export interface PromptTurn { role: 'you' | 'model'; text: string }
/** The P6 text endpoint is single-turn; this formats bounded history into one prompt. */
export function buildChatPrompt(history: PromptTurn[], draft: string) {
  const prefix = 'Continue this conversation. Reply to the latest user message in 120 words or fewer.\n';
  const latest = `User: ${draft}`;
  if (prefix.length + latest.length > 1000) throw new Error('Message exceeds the local text context limit.');
  const parts = history.map(item => `${item.role === 'you' ? 'User' : 'Assistant'}: ${item.text}`);
  let truncated = false;
  while (parts.length > 1 && prefix.length + [...parts, latest].join('\n').length > 1000) { parts.shift(); truncated = true; }
  if (parts.length && prefix.length + [...parts, latest].join('\n').length > 1000) {
    const budget = 1000 - prefix.length - latest.length - 1;
    const marker = '… [truncated]';
    if (budget <= marker.length + 12) parts.shift();
    else parts[0] = parts[0].slice(0, budget - marker.length) + marker;
    truncated = true;
  }
  return { prompt: prefix + [...parts, latest].join('\n'), truncated };
}
