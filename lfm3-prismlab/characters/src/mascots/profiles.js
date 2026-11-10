export const PERSONALITY_PROFILES = {
  'lfm3-17b': {
    sequence: ['idle', 'curious', 'idle', 'happy', 'idle', 'excited', 'idle', 'shy'],
    reactions: ['curious', 'happy', 'surprised', 'shy', 'excited'], blink: [2300, 4600]
  },
  'lfm3-vl-2b': {
    sequence: ['idle', 'thinking', 'idle', 'curious', 'idle', 'surprised', 'idle', 'proud'],
    reactions: ['curious', 'surprised', 'thinking', 'confused', 'proud'], blink: [3000, 5900]
  },
  'lfm3-audio-2b': {
    sequence: ['idle', 'happy', 'idle', 'excited', 'idle', 'sleepy', 'idle', 'shy'],
    reactions: ['happy', 'excited', 'sleepy', 'surprised', 'wink'], blink: [2700, 5400]
  },
  'lfm3-omni-2b': {
    sequence: ['idle', 'excited', 'idle', 'curious', 'idle', 'happy', 'idle', 'proud'],
    reactions: ['excited', 'surprised', 'curious', 'happy', 'proud'], blink: [2200, 4800]
  },
  'd1-2b': {
    sequence: ['idle', 'thinking', 'idle', 'confused', 'idle', 'curious', 'idle', 'proud'],
    reactions: ['thinking', 'confused', 'curious', 'proud', 'happy'], blink: [3700, 7000]
  },
  'd1-omni-2b': {
    sequence: ['idle', 'curious', 'idle', 'proud', 'idle', 'thinking', 'idle', 'excited'],
    reactions: ['curious', 'proud', 'thinking', 'surprised', 'wink'], blink: [2500, 5400]
  }
};

export function profileFor(id) {
  return PERSONALITY_PROFILES[id.replace(/^(inline|game)-/, '')] || PERSONALITY_PROFILES['lfm3-17b'];
}
