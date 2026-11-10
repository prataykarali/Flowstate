/** Compact, premise-led narrative direction. This module never selects a plot. */

export interface StoryDirectorBeat {
  beatIndex: number;
  act: 1 | 2 | 3 | 4;
  targetAct: string;
  narrativeGoal: string;
  requiredProgression: string;
  avoidRepeating: string;
}

export type StoryEndingType = 'resolved' | 'tragic_aftermath' | 'unresolved_mystery' | 'emotional_resolution' | 'humorous_twist';

export interface StoryDirectorPlan {
  genre: string;
  theme: string;
  characters: Array<{ name: string; role: string; relationToProtagonist: string }>;
  primaryConflict: string;
  initialStakes: string;
  developmentBeats: StoryDirectorBeat[];
  climaxObjective: string;
  endingRequirements: string;
  endingType: StoryEndingType;
}

const names = ['Asha','Bruno','Chidi','Dalia','Emeka','Farah','Goran','Hana','Ivo','Jun','Kofi','Leila','Mateo','Nadia','Omar','Priya','Quinn','Rafael','Sana','Tariq','Uma','Viktor','Wren','Ximena','Yusuf','Zara','Anouk','Bilal','Camila','Dmitri','Esi','Felix','Gita','Hiro','Ines','Jalen','Kenji','Luca','Marisol','Nikhil','Odette','Pablo','Rhea','Soren','Tamsin','Ulric','Valeria','Wanjiru','Yara','Zubin','Aiko','Bastian','Cyrus','Delphine','Ezra','Fatima','Gideon','Halima','Idris','Juno','Kavya','Lorcan','Malia','Niko','Oona','Pilar','Ronan','Saoirse','Teo','Usha','Vikram','Willa','Yosef','Zainab','Arjun','Beatriz','Cormac','Darius','Eun','Freya','Gael','Hamid','Ingrid','Jasper','Kiran','Lucia','Milan','Noor','Otto','Paloma','Rohan','Selin','Thabo','Ulla','Vera','Wes','Ayo','Bodhi','Chiara','Dev','Elif','Fionn','Greta','Hugo','Isla','Jomo','Kalani','Linus','Meera','Nils','Orla','Piet','Rosa','Sami','Tove','Valentin','Yuki','Zoltan','Amara','Bram','Cleo','Duncan','Emi','Faisal','Gemma','Haruto','Ilse','Joaquin'];
export const RANDOM_CAST_NAMES = names;

/** Seeded only for cast identity; plot, conflict and outcome remain model-generated. */
export function createStoryDirectorPlan(
  theme: string,
  cast?: { protagonist: string; companion: string; role: string; setting: string; hook: string },
  opening = '',
  randomSeed: () => number = Math.random
): StoryDirectorPlan {
  const pick = (limit: number) => Math.min(limit - 1, Math.floor(Math.max(0, Math.min(0.999999999, randomSeed())) * limit));
  const protagonist = cast?.protagonist || names[pick(names.length)];
  const available = names.filter(name => name !== protagonist);
  const companion = cast?.companion || available[pick(available.length)];
  const premise = opening.trim() || cast?.hook?.trim() || `An original ${theme} situation involving ${protagonist} and ${companion}.`;
  const phases: StoryDirectorBeat[] = [
    { beatIndex: 0, act: 1, targetAct: 'Act I — Beginning', narrativeGoal: 'Clarify the people, immediate situation, and question or desire that matters to them.', requiredProgression: 'Establish a specific goal or tension grounded in the premise.', avoidRepeating: 'Do not restate the premise without changing the situation.' },
    { beatIndex: 1, act: 2, targetAct: 'Act II — Development', narrativeGoal: 'Deepen the central tension through a character choice, discovery, relationship change, or consequence.', requiredProgression: 'Connect the new development to an established goal, fact, or unresolved thread.', avoidRepeating: 'Do not add an unrelated crisis or replay an earlier beat.' },
    { beatIndex: 2, act: 3, targetAct: 'Act III — Turning Point', narrativeGoal: 'Bring the central tension to a consequential turning point shaped by what has already happened.', requiredProgression: 'Make a meaningful choice, discovery, confrontation, or irreversible change.', avoidRepeating: 'Do not solve the conflict with an unestablished ability or fact.' },
    { beatIndex: 3, act: 4, targetAct: 'Act IV — Resolution', narrativeGoal: 'Show the outcome of the central question and the consequences for the people involved.', requiredProgression: 'Resolve or deliberately frame the main uncertainty with an earned aftermath.', avoidRepeating: 'Do not restart the main conflict or introduce a new primary threat.' }
  ];
  const endingRequirements = `Honor the ${theme} genre priorities. Answer the central question or goal established by the story, reflect consequences already earned, and leave no accidental interruption.`;
  return {
    genre: theme,
    theme,
    characters: [
      { name: protagonist, role: cast?.role || 'central character', relationToProtagonist: 'Self' },
      { name: companion, role: 'Supporting character', relationToProtagonist: 'Relationship established by the story' }
    ],
    primaryConflict: premise,
    initialStakes: `Establish what ${protagonist} wants or values and how the situation affects them.`,
    developmentBeats: phases,
    climaxObjective: `Create a consequential turning point for the central story question: ${premise}`,
    endingRequirements,
    endingType: theme === 'Tragedy' ? 'tragic_aftermath' : theme === 'Romance' ? 'emotional_resolution' : theme === 'Comedy' ? 'humorous_twist' : theme === 'Mystery' ? 'unresolved_mystery' : 'resolved'
  };
}
