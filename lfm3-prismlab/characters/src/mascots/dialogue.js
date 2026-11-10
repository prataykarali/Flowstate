export const DIALOGUE = {
  'lfm3-17b': { idle: ['Oh! Hello there!', 'I have an idea!'], react: ['That tickles!', 'Watch me!'], launch: ['Watch me!'] },
  'lfm3-vl-2b': { idle: ['Interesting!', 'Did something move?'], react: ['I see you!', 'Let me look closer...'], launch: ['Eyes on the trail!'] },
  'lfm3-audio-2b': { idle: ['La la la~', "That's my favourite sound!"], react: ['Did you hear that?', 'One more beat!'], launch: ['Feel the rhythm!'] },
  'lfm3-omni-2b': { idle: ["I'm listening!", "I'm ready!"], react: ['Look! Over there!', 'So many things happening!'], launch: ["I'm ready!"] },
  'd1-2b': { idle: ['Hmm... intriguing.', 'One more possibility...'], react: ['Let me think...', 'Aha! Got it!'], launch: ['Let me calculate...'] },
  'd1-omni-2b': { idle: ["Something's suspicious...", 'A clue!'], react: ['Case closed!', 'Mystery solved!'], launch: ['The chase is on!'] }
};

export function canonicalMascotId(id) { return id.replace(/^(inline|game)-/, ''); }

export function pickLine(id, kind, previous = '') {
  const lines = DIALOGUE[canonicalMascotId(id)]?.[kind] || DIALOGUE['lfm3-17b'].idle;
  const candidates = lines.filter(line => line !== previous);
  return candidates[Math.floor(Math.random() * candidates.length)] || lines[0];
}
