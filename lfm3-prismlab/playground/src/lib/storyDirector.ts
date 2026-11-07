/**
 * Story Director (PrismLab P7E S3-B.5)
 *
 * Lightweight procedural narrative planner.
 * Before Turn 0, creates a bounded narrative plan containing:
 * - Selected genre and themes
 * - Main characters and relationships
 * - Primary conflict & initial stakes
 * - 4 to 5 distinct development beats across Acts I–IV
 * - Intended climax objective
 * - Genre-specific ending requirements
 *
 * Does NOT generate prose or call large models; provides structured
 * causal directives to prevent loops and ensure meaningful progression.
 */

export interface StoryDirectorBeat {
  beatIndex: number; // 0 to 4
  act: 1 | 2 | 3 | 4;
  targetAct: string;
  narrativeGoal: string;
  requiredProgression: string;
  avoidRepeating: string;
}

export type StoryEndingType =
  | 'resolved'
  | 'tragic_aftermath'
  | 'unresolved_mystery'
  | 'emotional_resolution'
  | 'humorous_twist';

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

interface GenreNarrativeTemplate {
  endingType: StoryEndingType;
  endingRequirements: string;
  scenarios: Array<{
    conflict: string;
    stakes: string;
    climaxObjective: string;
    beats: Array<{
      act: 1 | 2 | 3 | 4;
      targetAct: string;
      narrativeGoal: string;
      requiredProgression: string;
      avoidRepeating: string;
    }>;
  }>;
}

const GENRE_TEMPLATES: Record<string, GenreNarrativeTemplate> = {
  'Detective investigation': {
    endingType: 'resolved',
    endingRequirements: 'Reveal an evidence-supported deduction naming the culprit or cause, or identify the remaining deliberate unknown.',
    scenarios: [
      {
        conflict: 'A locked vault was opened from the inside without triggering the mechanical bell system.',
        stakes: 'The town ledger will be forged before dawn, ruining dozens of tenant farmers.',
        climaxObjective: 'Confront the prime suspect using the physical discrepancy between the ledger lock and the wax seal.',
        beats: [
          { act: 1, targetAct: 'Act I — Beginning', narrativeGoal: 'Inspect the undisturbed entry and secure the initial physical evidence.', requiredProgression: 'Identify a missing key or anomalous wax marking.', avoidRepeating: 'Do not repeat the initial crime announcement.' },
          { act: 2, targetAct: 'Act II — Discovery', narrativeGoal: 'Cross-examine the night guard regarding timing discrepancies.', requiredProgression: 'Expose a contradiction in the official timeline.', avoidRepeating: 'Do not re-examine the vault door.' },
          { act: 2, targetAct: 'Act II — Discovery', narrativeGoal: 'Trace the secondary tool used to manipulate the tumbler mechanism.', requiredProgression: 'Connect the specialized tool to an insider with locksmith access.', avoidRepeating: 'Do not repeat the guard testimony.' },
          { act: 3, targetAct: 'Act III — Confrontation', narrativeGoal: 'Trap the perpetrator with the unforgeable physical proof before the ledger is burned.', requiredProgression: 'Force an admission or an attempt to destroy the remaining evidence.', avoidRepeating: 'Do not repeat earlier alibi checks.' },
          { act: 4, targetAct: 'Act IV — Resolution', narrativeGoal: 'Deliver the conclusive forensic explanation and secure the recovered documents.', requiredProgression: 'State the consequence for the accused and return security to the institution.', avoidRepeating: 'Do not repeat the confrontation or re-interrogate the suspect.' }
        ]
      },
      {
        conflict: 'A rare maritime navigational chronometer vanished from the harbormaster study during heavy fog.',
        stakes: 'The outbound merchant fleet cannot navigate the reef passage safely.',
        climaxObjective: 'Intercept the smuggler at the tidal dock before the incoming sea surge sweeps away the tracks.',
        beats: [
          { act: 1, targetAct: 'Act I — Beginning', narrativeGoal: 'Examine the damp windowsill and the broken glass pattern.', requiredProgression: 'Determine whether the break was made from inside or outside.', avoidRepeating: 'Do not repeat the alarm notice.' },
          { act: 2, targetAct: 'Act II — Discovery', narrativeGoal: 'Inspect the dockworkers tally book for unrecorded luggage.', requiredProgression: 'Discover a forged manifest bearing a customs seal.', avoidRepeating: 'Do not re-describe the windowsill.' },
          { act: 2, targetAct: 'Act II — Discovery', narrativeGoal: 'Follow the salt trail toward the abandoned boatyard warehouse.', requiredProgression: 'Uncover the hidden hiding crate and a damp coat with harbormaster insignia.', avoidRepeating: 'Do not repeat manifest questions.' },
          { act: 3, targetAct: 'Act III — Confrontation', narrativeGoal: 'Corner the conspirator as they prepare to row out to the waiting schooner.', requiredProgression: 'Disarm or detain the suspect and protect the fragile instrument.', avoidRepeating: 'Do not repeat trail following.' },
          { act: 4, targetAct: 'Act IV — Resolution', narrativeGoal: 'Return the chronometer to the harbor tower and log the official indictment.', requiredProgression: 'Confirm the safe departure of the fleet and note the accomplice’s capture.', avoidRepeating: 'Do not repeat the boatyard struggle.' }
        ]
      }
    ]
  },

  'Comedy': {
    endingType: 'humorous_twist',
    endingRequirements: 'Pay off the comic misunderstanding with an absurd but definite, harmless resolution.',
    scenarios: [
      {
        conflict: 'A handcrafted prize pastry intended for the visiting mayor gets swapped with a theatrical prop sponge.',
        stakes: 'The bakery reputation and the town festival award are on the line.',
        climaxObjective: 'Prevent the mayor from biting into the decorative sponge during the live banquet toast.',
        beats: [
          { act: 1, targetAct: 'Act I — Beginning', narrativeGoal: 'Realize the disastrous box mix-up just as the delivery cart leaves.', requiredProgression: 'Discover the real pastry sitting innocently in the kitchen cupboard.', avoidRepeating: 'Do not repeat the pastry recipe details.' },
          { act: 2, targetAct: 'Act II — Discovery', narrativeGoal: 'Infiltrate the banquet hall disguised as musicians to retrieve the box.', requiredProgression: 'Accidentally knock over the banquet table centerpiece during the retrieval.', avoidRepeating: 'Do not repeat the discovery in the kitchen.' },
          { act: 2, targetAct: 'Act II — Discovery', narrativeGoal: 'Attempt a frantic hand-to-hand pass beneath the dessert buffet.', requiredProgression: 'Cause the banquet orchestra to play louder in panicked confusion.', avoidRepeating: 'Do not repeat disguise jokes.' },
          { act: 3, targetAct: 'Act III — Confrontation', narrativeGoal: 'Lunge for the plate right as the mayor raises the ceremonial fork.', requiredProgression: 'A chaotic collision reveals the prop to everyone in attendance.', avoidRepeating: 'Do not repeat the buffet crawl.' },
          { act: 4, targetAct: 'Act IV — Resolution', narrativeGoal: 'Serve the real pastry and turn the catastrophe into a celebrated festival spectacle.', requiredProgression: 'The mayor declares the chaotic spectacle the highlight of the festival.', avoidRepeating: 'Do not repeat the plate lunge.' }
        ]
      }
    ]
  },

  'Tragedy': {
    endingType: 'tragic_aftermath',
    endingRequirements: 'Confront the irreversible loss and depict the sober, human aftermath without an unearned magical reset.',
    scenarios: [
      {
        conflict: 'A severe winter outbreak leaves only one dose of restorative serum between two stricken siblings.',
        stakes: 'Delay will cost both lives before the relief convoy breaks through the snowdrifts.',
        climaxObjective: 'Make the agonizing, irrevocable choice of who administers the final medicine.',
        beats: [
          { act: 1, targetAct: 'Act I — Beginning', narrativeGoal: 'Acknowledge the depleted apothecary stores and the fading pulse of the afflicted.', requiredProgression: 'Confirm that only a single sealed glass vial remains intact.', avoidRepeating: 'Do not repeat the winter weather description.' },
          { act: 2, targetAct: 'Act II — Discovery', narrativeGoal: 'Attempt an alternative herbal brew to stretch the medicine.', requiredProgression: 'The concoction fails, proving only the pure vial can halt the fever.', avoidRepeating: 'Do not recount the vial discovery.' },
          { act: 2, targetAct: 'Act II — Discovery', narrativeGoal: 'Wrestle with the moral weight and mutual promises made to their family.', requiredProgression: 'One person quietly refuses the dose so the other may survive.', avoidRepeating: 'Do not repeat failed remedy attempts.' },
          { act: 3, targetAct: 'Act III — Confrontation', narrativeGoal: 'Administer the single dose under the dim lamp as the storm peaks.', requiredProgression: 'The recipient stabilizes while the other slips into peaceful, irreversible sleep.', avoidRepeating: 'Do not repeat the debate over who deserves it.' },
          { act: 4, targetAct: 'Act IV — Resolution', narrativeGoal: 'Stand at dawn as the relief bells ring in the distance, honoring the departed.', requiredProgression: 'Accept the survival with lasting sorrow and resolve to carry on their memory.', avoidRepeating: 'Do not attempt a miraculous resurrection.' }
        ]
      }
    ]
  },

  'Horror': {
    endingType: 'resolved',
    endingRequirements: 'Resolve or clarify the true nature of the monstrous/haunting threat and establish the permanent survival consequences.',
    scenarios: [
      {
        conflict: 'An unearthly entity stalks the subterranean pumping station beneath the abandoned reservoir.',
        stakes: 'If the emergency floodgates are not unlatched, the entity will break into the town drainage pipes.',
        climaxObjective: 'Lure the entity onto the catwalk above the intake turbines and drop the pressure release.',
        beats: [
          { act: 1, targetAct: 'Act I — Beginning', narrativeGoal: 'Notice the wet claw marks and the abnormal frequency vibration in the pipes.', requiredProgression: 'Realize the facility exit has rusted shut from the outside.', avoidRepeating: 'Do not repeat the dripping sounds.' },
          { act: 2, targetAct: 'Act II — Discovery', narrativeGoal: 'Locate the maintenance blueprint to find the main steam pressure lever.', requiredProgression: 'Encounter the entity in the shadows, losing the main flashlight.', avoidRepeating: 'Do not re-examine the rusted exit door.' },
          { act: 2, targetAct: 'Act II — Discovery', narrativeGoal: 'Navigate the narrow gantry by emergency red strobes while hearing pursuit.', requiredProgression: 'Discover that the entity recoils from high-frequency steam bursts.', avoidRepeating: 'Do not repeat the flashlight loss.' },
          { act: 3, targetAct: 'Act III — Confrontation', narrativeGoal: 'Trigger the pressure valve while standing as bait on the central platform.', requiredProgression: 'A blinding jet of superheated steam engulfs the creature, throwing the gantry loose.', avoidRepeating: 'Do not repeat pipe-stalking movements.' },
          { act: 4, targetAct: 'Act IV — Resolution', narrativeGoal: 'Crawl through the intake conduit into the rainy night air.', requiredProgression: 'Survey the collapsed tunnel below, bearing the psychological scars of survival.', avoidRepeating: 'Do not restart the steam valves.' }
        ]
      }
    ]
  },

  'Romance': {
    endingType: 'emotional_resolution',
    endingRequirements: 'Resolve the central emotional barrier with an honest confession or choice, showing clear relationship consequences.',
    scenarios: [
      {
        conflict: 'Two long-time rival bookbinders must collaborate on restoring a historic manuscript before the auction.',
        stakes: 'One has accepted an overseas fellowship that will separate them permanently in three days.',
        climaxObjective: 'Express genuine feelings and address the impending departure before the final page is bound.',
        beats: [
          { act: 1, targetAct: 'Act I — Beginning', narrativeGoal: 'Work side by side in tense silence over the delicate parchment.', requiredProgression: 'Share a fleeting moment of synchronized craft, recalling their past connection.', avoidRepeating: 'Do not repeat workshop inventory descriptions.' },
          { act: 2, targetAct: 'Act II — Discovery', narrativeGoal: 'Uncover a hidden romantic inscription between the vellum folios.', requiredProgression: 'Discuss the inscription, mirroring their own unspoken anxieties.', avoidRepeating: 'Do not repeat awkward silence notes.' },
          { act: 2, targetAct: 'Act II — Discovery', narrativeGoal: 'Confront the rumors of the overseas acceptance letter left on the desk.', requiredProgression: 'Admit that fear of vulnerability caused the competitive rivalry.', avoidRepeating: 'Do not re-read the vellum inscription.' },
          { act: 3, targetAct: 'Act III — Confrontation', narrativeGoal: 'Tie the final leather binding cord as the departure hour approaches.', requiredProgression: 'An honest confession of mutual affection breaks down the remaining pride.', avoidRepeating: 'Do not repeat argument points.' },
          { act: 4, targetAct: 'Act IV — Resolution', narrativeGoal: 'Agree on a shared future path, whether joining the journey or making a lasting promise.', requiredProgression: 'Deliver the restored book together and embrace the changed relationship.', avoidRepeating: 'Do not re-open the rivalry.' }
        ]
      }
    ]
  },

  'Mystery': {
    endingType: 'unresolved_mystery',
    endingRequirements: 'Provide an evidence-supported answer to the primary question or establish a coherent, deliberate unknown.',
    scenarios: [
      {
        conflict: 'A forgotten stone tower on the coastal moor illuminates every midnight without fuel or fire.',
        stakes: 'Local fishing boats are being steered onto the jagged Black Reef by the ghost light.',
        climaxObjective: 'Reach the lantern room at midnight and decipher the prism mechanism before the next boat strikes.',
        beats: [
          { act: 1, targetAct: 'Act I — Beginning', narrativeGoal: 'Scale the rocky headland as the distant beacon flashes prematurely.', requiredProgression: 'Find a brass gear inscribed with astronomical coordinates on the path.', avoidRepeating: 'Do not repeat the village legends.' },
          { act: 2, targetAct: 'Act II — Discovery', narrativeGoal: 'Search the tower basement for hidden fuel lines or galvanic cells.', requiredProgression: 'Discover that the tower is anchored into a phosphorescent sea-trench vent.', avoidRepeating: 'Do not re-examine the brass gear.' },
          { act: 2, targetAct: 'Act II — Discovery', narrativeGoal: 'Climb the spiral staircase while avoiding ancient counterweight traps.', requiredProgression: 'Identify that the prism was deliberately rotated to mislead specific vessels.', avoidRepeating: 'Do not repeat the basement search.' },
          { act: 3, targetAct: 'Act III — Confrontation', narrativeGoal: 'Force the rusted lens cradle to align with the true navigational channel.', requiredProgression: 'Lock the prism into the true bearing just as a fishing boat crests the reef wave.', avoidRepeating: 'Do not repeat trap descriptions.' },
          { act: 4, targetAct: 'Act IV — Resolution', narrativeGoal: 'Observe the fishing boat steer safely into the harbor basin.', requiredProgression: 'Document the ancient geological prism while noting the identity of who rotated it remains an open mystery.', avoidRepeating: 'Do not repeat the lens realignment.' }
        ]
      }
    ]
  },

  'Fantasy': {
    endingType: 'resolved',
    endingRequirements: 'Resolve the magical trial within the established rules and costs of magic without inventing unestablished powers.',
    scenarios: [
      {
        conflict: 'A guardian dryad tree protecting the village spring is withering from an invasive shadow blight.',
        stakes: 'If the roots die, the valley wellspring will dry up and the forest barrier will collapse.',
        climaxObjective: 'Infuse the primary root with a distilled morning dew crystal, absorbing the blight cost into a sacred talisman.',
        beats: [
          { act: 1, targetAct: 'Act I — Beginning', narrativeGoal: 'Observe the black veins spreading along the ancient silver bark.', requiredProgression: 'Learn the ancient rule: magic requires an equal barter of living memory or earthly element.', avoidRepeating: 'Do not repeat the forest scenery.' },
          { act: 2, targetAct: 'Act II — Discovery', narrativeGoal: 'Venture into the bramble hollow to harvest the dew crystal before sunlight.', requiredProgression: 'Overcome the thorny guardians by offering an honest gift of song.', avoidRepeating: 'Do not re-examine the dryad tree.' },
          { act: 2, targetAct: 'Act II — Discovery', narrativeGoal: 'Return to find the blight has reached the central sapling core.', requiredProgression: 'A cherished talisman is selected to receive the corruption so the tree is spared.', avoidRepeating: 'Do not repeat harvesting details.' },
          { act: 3, targetAct: 'Act III — Confrontation', narrativeGoal: 'Press the crystal into the heartwood while channeling the blight into the talisman.', requiredProgression: 'The talisman shatters, but silver sap surges through the healing roots.', avoidRepeating: 'Do not repeat talisman selection.' },
          { act: 4, targetAct: 'Act IV — Resolution', narrativeGoal: 'Watch fresh green leaves unfurl above the clear, running wellspring.', requiredProgression: 'The village gathers at the spring; peace returns under the restored canopy.', avoidRepeating: 'Do not re-ignite the shadow blight.' }
        ]
      }
    ]
  },

  'Science fiction': {
    endingType: 'resolved',
    endingRequirements: 'Resolve the speculative technological crisis using established capabilities and show the new planetary or station reality.',
    scenarios: [
      {
        conflict: 'A deep-space solar collector station suffers cooling manifold failure after a coronal mass ejection.',
        stakes: 'Superheated plasma will breach the living quarters within four orbital cycles.',
        climaxObjective: 'Manually depressurize the secondary heat exchanger from the exterior maintenance truss.',
        beats: [
          { act: 1, targetAct: 'Act I — Beginning', narrativeGoal: 'Analyze telemetry alarms showing the primary coolant pressure spike.', requiredProgression: 'Confirm automated purge valves are unresponsive from the control bridge.', avoidRepeating: 'Do not repeat station specs.' },
          { act: 2, targetAct: 'Act II — Discovery', narrativeGoal: 'Don thermal extravehicular suits and venture onto the solar-facing truss.', requiredProgression: 'Discover that micrometeorite slag has fused the manual release latch.', avoidRepeating: 'Do not repeat bridge telemetry.' },
          { act: 2, targetAct: 'Act II — Discovery', narrativeGoal: 'Use a portable plasma torch to sever the slag without piercing the line.', requiredProgression: 'A sensor warning indicates the main solar array is pivoting into their path.', avoidRepeating: 'Do not repeat EVA suit checks.' },
          { act: 3, targetAct: 'Act III — Confrontation', narrativeGoal: 'Wrench the bypass lever open under intense thermal glare.', requiredProgression: 'Superheated vapor vents harmlessly into space, dropping core temperature to nominal.', avoidRepeating: 'Do not repeat torch cutting.' },
          { act: 4, targetAct: 'Act IV — Resolution', narrativeGoal: 'Re-enter the airlock and verify station telemetry is stable.', requiredProgression: 'Observe the station safely ride out the remainder of the solar storm in safe orbit.', avoidRepeating: 'Do not trigger another cooling alarm.' }
        ]
      }
    ]
  },

  'Adventure': {
    endingType: 'resolved',
    endingRequirements: 'Demonstrate whether the perilous objective was secured and depict the physical aftermath of the journey.',
    scenarios: [
      {
        conflict: 'A mountain expedition must cross the crumbling Rope Bridge of the Red Gorge before the monsoon floods arrive.',
        stakes: 'The pack animals carrying the cartographer’s master maps are stranded on the far ledge.',
        climaxObjective: 'Anchor the snapped suspension cable to the granite bedrock while crossing the middle span.',
        beats: [
          { act: 1, targetAct: 'Act I — Beginning', narrativeGoal: 'Survey the roaring canyon waters and the frayed hemp lines.', requiredProgression: 'Realize one main support line has already severed under the wind.', avoidRepeating: 'Do not repeat river depth estimates.' },
          { act: 2, targetAct: 'Act II — Discovery', narrativeGoal: 'Test the remaining timber planks while carrying the replacement steel tether.', requiredProgression: 'A sudden rockfall destroys two planks, leaving a terrifying three-foot gap.', avoidRepeating: 'Do not re-examine the canyon rim.' },
          { act: 2, targetAct: 'Act II — Discovery', narrativeGoal: 'Leap across the gap and secure a piton into the slippery cliff face.', requiredProgression: 'The companion catches the trailing harness, establishing a temporary lifeline.', avoidRepeating: 'Do not repeat plank testing.' },
          { act: 3, targetAct: 'Act III — Confrontation', narrativeGoal: 'Winch the main cable taut as torrential rain begins to pound the gorge.', requiredProgression: 'Lock the ratchet in place with seconds to spare as the river surges below.', avoidRepeating: 'Do not repeat gap leap.' },
          { act: 4, targetAct: 'Act IV — Resolution', narrativeGoal: 'Lead the team and map supplies across the stabilized bridge to high plateau shelter.', requiredProgression: 'Dry the maps around the evening camp fire, looking back across the conquered canyon.', avoidRepeating: 'Do not repeat bridge repairs.' }
        ]
      }
    ]
  }
};

export const RANDOM_CAST_NAMES = [
  'Amina', 'Kiran', 'Soren', 'Elena', 'Tariq', 'Maeve', 'Mateo', 'Nia',
  'Jonas', 'Freja', 'Dante', 'Hana', 'Zayd', 'Leila', 'Rowan', 'Kallum',
  'Asha', 'Bruno', 'Chidi', 'Dalia', 'Emeka', 'Farah', 'Goran', 'Ivo',
  'Jun', 'Kofi', 'Nadia', 'Omar', 'Priya', 'Quinn', 'Rafael', 'Sana',
  'Uma', 'Viktor', 'Wren', 'Ximena', 'Zara', 'Anouk', 'Bilal', 'Camila',
  'Dmitri', 'Esi', 'Felix', 'Gita', 'Hiro', 'Ines', 'Jalen', 'Kenji',
  'Luca', 'Marisol', 'Nikhil', 'Odette', 'Pablo', 'Rhea', 'Ulric', 'Valeria',
  'Wanjiru', 'Yara', 'Zubin', 'Aiko', 'Bastian', 'Cyrus', 'Delphine', 'Ezra',
  'Fatima', 'Gideon', 'Halima', 'Idris', 'Juno', 'Kavya', 'Lorcan', 'Malia',
  'Niko', 'Oona', 'Pilar', 'Ronan', 'Saoirse', 'Teo', 'Usha', 'Vikram',
  'Willa', 'Zainab', 'Arjun', 'Beatriz', 'Cormac', 'Darius', 'Eun', 'Freya',
  'Gael', 'Hamid', 'Ingrid', 'Jasper', 'Lucia', 'Milan', 'Noor', 'Otto',
  'Paloma', 'Rohan', 'Selin', 'Thabo', 'Ulla', 'Vera', 'Wes', 'Bodhi',
  'Chiara', 'Dev', 'Elif', 'Fionn', 'Greta', 'Hugo', 'Isla', 'Jomo',
  'Kalani', 'Linus', 'Meera', 'Nils', 'Orla', 'Piet', 'Rosa', 'Sami',
  'Tove', 'Valentin', 'Yuki', 'Zoltan', 'Amara', 'Bram', 'Cleo', 'Duncan',
  'Emi', 'Faisal', 'Gemma', 'Haruto', 'Ilse', 'Joaquin', 'Kaelen', 'Leilani',
  'Magnus', 'Niamh', 'Orion', 'Phoebe', 'Rania', 'Sylvan', 'Zephyr'
];

export interface DynamicGenrePlan {
  primaryConflict: string;
  initialStakes: string;
  climaxObjective: string;
  endingRequirements: string;
  endingType: StoryEndingType;
  beats: StoryDirectorBeat[];
}

export function buildDynamicGenreBeats(
  theme: string,
  protagonist: string,
  companion: string,
  role: string,
  setting: string,
  hook: string
): DynamicGenrePlan {
  switch (theme) {
    case 'Romance':
      return {
        primaryConflict: `In ${setting}, ${hook}, testing the unspoken emotional bond between ${protagonist} and ${companion}.`,
        initialStakes: `Pride, misunderstanding, or fear of vulnerability could pull them apart before they admit how they truly feel.`,
        climaxObjective: `Make an honest emotional choice or confession between ${protagonist} and ${companion} before the moment slips away.`,
        endingRequirements: `Resolve the central emotional barrier with an honest confession or choice, showing clear relationship consequences.`,
        endingType: 'emotional_resolution',
        beats: [
          { beatIndex: 0, act: 1, targetAct: 'Act I — Beginning', narrativeGoal: `Introduce ${protagonist} (${role}) and ${companion} facing ${hook} in ${setting}.`, requiredProgression: `Establish the mutual attraction and the emotional obstacle dividing them.`, avoidRepeating: `Do not repeat the setting description.` },
          { beatIndex: 1, act: 2, targetAct: 'Act II — Discovery', narrativeGoal: `Deepen trust while an awkward complication tests their connection.`, requiredProgression: `Share an honest conversation that reveals vulnerability.`, avoidRepeating: `Do not repeat the initial meeting.` },
          { beatIndex: 2, act: 2, targetAct: 'Act II — Discovery', narrativeGoal: `An unexpected dilemma or fear of rejection strains the relationship.`, requiredProgression: `Confront the unspoken misunderstanding or impending separation.`, avoidRepeating: `Do not repeat earlier small talk.` },
          { beatIndex: 3, act: 3, targetAct: 'Act III — Confrontation', narrativeGoal: `Force a decisive, honest emotional choice between pride and closeness.`, requiredProgression: `A vulnerable confession or gesture breaks through the emotional barrier.`, avoidRepeating: `Do not repeat past arguments.` },
          { beatIndex: 4, act: 4, targetAct: 'Act IV — Resolution', narrativeGoal: `Address the obstacle and show the lasting outcome of their relationship.`, requiredProgression: `State whether they remain together or part with mutual clarity and affection.`, avoidRepeating: `Do not reopen the resolved barrier.` }
        ]
      };
    case 'Horror':
      return {
        primaryConflict: `At ${setting}, ${hook}, trapping ${protagonist} and ${companion} in escalating dread.`,
        initialStakes: `The lurking threat closes in; delay or miscalculation means severe harm or inescapable terror.`,
        climaxObjective: `Confront or outlast the terrifying threat at the peak of mortal danger.`,
        endingRequirements: `Show the outcome of the threat and the permanent survival consequences without an unearned magical reset.`,
        endingType: 'resolved',
        beats: [
          { beatIndex: 0, act: 1, targetAct: 'Act I — Beginning', narrativeGoal: `Notice the unnatural signs of danger and vulnerability surrounding ${setting}.`, requiredProgression: `Realize the primary exit or sanctuary is no longer safe.`, avoidRepeating: `Do not repeat ambient sound descriptions.` },
          { beatIndex: 1, act: 2, targetAct: 'Act II — Discovery', narrativeGoal: `Discover a chilling new sign of the threat as shadows close in.`, requiredProgression: `Encounter the entity or danger directly, losing a key defense or resource.`, avoidRepeating: `Do not re-examine the original signs.` },
          { beatIndex: 2, act: 2, targetAct: 'Act II — Discovery', narrativeGoal: `Navigate the closing trap while fear tests the bond between ${protagonist} and ${companion}.`, requiredProgression: `Identify a physical vulnerability or desperate escape avenue.`, avoidRepeating: `Do not repeat previous terror beats.` },
          { beatIndex: 3, act: 3, targetAct: 'Act III — Confrontation', narrativeGoal: `Make the final desperate stand or daring break for survival.`, requiredProgression: `A blinding confrontation forces the threat away or breaks through the barrier.`, avoidRepeating: `Do not repeat hallway searches.` },
          { beatIndex: 4, act: 4, targetAct: 'Act IV — Resolution', narrativeGoal: `Emerge into the aftermath, bearing the psychological scars of survival.`, requiredProgression: `Confirm physical safety while acknowledging the lingering mark of the ordeal.`, avoidRepeating: `Do not restart the threat alarms.` }
        ]
      };
    case 'Tragedy':
      return {
        primaryConflict: `At ${setting}, ${hook}, threatening what ${protagonist} and ${companion} hold most dear.`,
        initialStakes: `An irreversible loss is impending; a painful sacrifice must be made between competing devotions.`,
        climaxObjective: `Make the agonizing, irrevocable sacrifice to protect what can still be saved.`,
        endingRequirements: `Confront the irreversible loss and depict the sober, human aftermath without an unearned magical reset.`,
        endingType: 'tragic_aftermath',
        beats: [
          { beatIndex: 0, act: 1, targetAct: 'Act I — Beginning', narrativeGoal: `Establish what ${protagonist} and ${companion} are desperate to protect at ${setting}.`, requiredProgression: `Confirm that available resources or time cannot save everyone.`, avoidRepeating: `Do not repeat the initial announcement.` },
          { beatIndex: 1, act: 2, targetAct: 'Act II — Discovery', narrativeGoal: `Attempt an alternative solution to avert the impending catastrophe.`, requiredProgression: `The alternative fails, proving the painful cost cannot be evaded.`, avoidRepeating: `Do not repeat the opening dilemma.` },
          { beatIndex: 2, act: 2, targetAct: 'Act II — Discovery', narrativeGoal: `Wrestle with the moral weight and mutual promises between ${protagonist} and ${companion}.`, requiredProgression: `One person steps forward to bear the decisive burden or sacrifice.`, avoidRepeating: `Do not repeat failed remedy attempts.` },
          { beatIndex: 3, act: 3, targetAct: 'Act III — Confrontation', narrativeGoal: `Execute the heartbreaking, decisive choice under heavy emotional weight.`, requiredProgression: `The decisive loss or sacrifice occurs irreversibly.`, avoidRepeating: `Do not repeat the debate over who bears the cost.` },
          { beatIndex: 4, act: 4, targetAct: 'Act IV — Resolution', narrativeGoal: `Acknowledge the permanent cost and aftermath with lasting sorrow and enduring memory.`, requiredProgression: `Accept survival with dignity and resolve to honor the fallen or lost.`, avoidRepeating: `Do not attempt an unearned magical resurrection.` }
        ]
      };
    case 'Adventure':
      return {
        primaryConflict: `A perilous journey across ${setting} where ${hook}.`,
        initialStakes: `Failure to conquer the route or secure the goal leaves ${protagonist} and ${companion} stranded or defeated.`,
        climaxObjective: `Overcome the greatest physical barrier or crisis at the peak of the expedition.`,
        endingRequirements: `Demonstrate whether the perilous objective was secured and depict the physical aftermath of the journey.`,
        endingType: 'resolved',
        beats: [
          { beatIndex: 0, act: 1, targetAct: 'Act I — Beginning', narrativeGoal: `Survey the treacherous path across ${setting} and commit to the expedition.`, requiredProgression: `Encounter the first hazardous terrain or obstacle blocking the route.`, avoidRepeating: `Do not repeat landscape descriptions.` },
          { beatIndex: 1, act: 2, targetAct: 'Act II — Discovery', narrativeGoal: `Overcome an unexpected natural obstacle that damages supplies or limits the route.`, requiredProgression: `Discover an alternate route or hidden landmark demanding teamwork.`, avoidRepeating: `Do not re-examine the starting point.` },
          { beatIndex: 2, act: 2, targetAct: 'Act II — Discovery', narrativeGoal: `Push forward through escalating environmental perils and physical fatigue.`, requiredProgression: `Secure a vital lifeline or bridge over a critical chasm or hazard.`, avoidRepeating: `Do not repeat earlier obstacle checks.` },
          { beatIndex: 3, act: 3, targetAct: 'Act III — Confrontation', narrativeGoal: `Make the final daring leap or struggle through the worst phase of the trial.`, requiredProgression: `Lock the lifeline or overcome the barrier with seconds to spare.`, avoidRepeating: `Do not repeat bridge crossings.` },
          { beatIndex: 4, act: 4, targetAct: 'Act IV — Resolution', narrativeGoal: `Reach the safe plateau or destination, securing the expedition goal.`, requiredProgression: `Survey the conquered trail around the evening campfire and celebrate survival.`, avoidRepeating: `Do not restart the journey hazards.` }
        ]
      };
    case 'Mystery':
      return {
        primaryConflict: `At ${setting}, ${hook}, creating an unexplained puzzle that defies easy answers.`,
        initialStakes: `The truth will remain buried or an innocent will suffer if contradictory clues are not reconciled.`,
        climaxObjective: `Connect the anomalous clues to uncover the decisive hidden explanation.`,
        endingRequirements: `Provide an evidence-supported answer to the primary question or establish a coherent, deliberate unknown.`,
        endingType: 'unresolved_mystery',
        beats: [
          { beatIndex: 0, act: 1, targetAct: 'Act I — Beginning', narrativeGoal: `Examine the scene at ${setting} and pose the primary unanswered question.`, requiredProgression: `Identify an anomalous physical clue that contradicts the obvious theory.`, avoidRepeating: `Do not repeat initial rumors.` },
          { beatIndex: 1, act: 2, targetAct: 'Act II — Discovery', narrativeGoal: `Investigate conflicting accounts or obscure records related to the puzzle.`, requiredProgression: `Discover a hidden mechanism, diary, or secondary physical clue.`, avoidRepeating: `Do not re-examine the first clue.` },
          { beatIndex: 2, act: 2, targetAct: 'Act II — Discovery', narrativeGoal: `Follow the hidden trail while avoiding misleading rumors or traps.`, requiredProgression: `Narrow the possible explanations to a single decisive contradiction.`, avoidRepeating: `Do not repeat archive searches.` },
          { beatIndex: 3, act: 3, targetAct: 'Act III — Confrontation', narrativeGoal: `Confront the central contradiction or mechanism at the critical hour.`, requiredProgression: `Lock the decisive evidence in place, exposing the hidden truth.`, avoidRepeating: `Do not repeat earlier questionings.` },
          { beatIndex: 4, act: 4, targetAct: 'Act IV — Resolution', narrativeGoal: `Deliver the supported explanation and reveal what truth or uncertainty remains.`, requiredProgression: `Document the solved question and acknowledge the changed understanding.`, avoidRepeating: `Do not reopen solved contradictions.` }
        ]
      };
    case 'Fantasy':
      return {
        primaryConflict: `In ${setting}, ${hook}, bound by ancient magical rules and personal costs.`,
        initialStakes: `The magical balance or community will fracture if ${protagonist} and ${companion} cannot pay the price of magic.`,
        climaxObjective: `Channel or resist the magical forces at personal cost within established rules.`,
        endingRequirements: `Resolve the magical trial within the established rules and costs of magic without inventing unestablished powers.`,
        endingType: 'resolved',
        beats: [
          { beatIndex: 0, act: 1, targetAct: 'Act I — Beginning', narrativeGoal: `Witness the magical disturbance at ${setting} and recall the binding magical rule.`, requiredProgression: `Learn that magic demands an equal barter of memory, element, or sacrifice.`, avoidRepeating: `Do not repeat scenery descriptions.` },
          { beatIndex: 1, act: 2, targetAct: 'Act II — Discovery', narrativeGoal: `Seek out the required talisman, crystal, or reagent before the blight spreads.`, requiredProgression: `Overcome a magical guardian or trial by demonstrating true intent.`, avoidRepeating: `Do not re-examine the initial disturbance.` },
          { beatIndex: 2, act: 2, targetAct: 'Act II — Discovery', narrativeGoal: `Discover that the magical cost must be borne personally to protect others.`, requiredProgression: `A cherished talisman or memory is chosen to receive the corruption.`, avoidRepeating: `Do not repeat reagent harvesting.` },
          { beatIndex: 3, act: 3, targetAct: 'Act III — Confrontation', narrativeGoal: `Channel the talisman into the magical heartwood as the crisis peaks.`, requiredProgression: `The talisman absorbs the surge, breaking the curse and restoring living flow.`, avoidRepeating: `Do not repeat talisman preparation.` },
          { beatIndex: 4, act: 4, targetAct: 'Act IV — Resolution', narrativeGoal: `Watch harmony return to ${setting} under the restored canopy.`, requiredProgression: `The community gathers in peace, respecting the permanent price paid for magic.`, avoidRepeating: `Do not reignite the curse.` }
        ]
      };
    case 'Science fiction':
      return {
        primaryConflict: `Aboard ${setting}, ${hook}, threatening systemic failure under unforgiving physics.`,
        initialStakes: `Critical life-support or planetary systems will fail within hours if the speculative crisis is not resolved.`,
        climaxObjective: `Execute a dangerous manual intervention to stabilize the system before critical failure.`,
        endingRequirements: `Resolve the speculative technological crisis using established capabilities and show the new planetary or station reality.`,
        endingType: 'resolved',
        beats: [
          { beatIndex: 0, act: 1, targetAct: 'Act I — Beginning', narrativeGoal: `Analyze the emergency telemetry and alarming anomalies aboard ${setting}.`, requiredProgression: `Confirm automated override protocols have failed from the primary bridge.`, avoidRepeating: `Do not repeat station specifications.` },
          { beatIndex: 1, act: 2, targetAct: 'Act II — Discovery', narrativeGoal: `Don protective gear and venture into the hazardous exterior or engine core.`, requiredProgression: `Discover an unexpected physical slag or anomaly fusing the primary conduits.`, avoidRepeating: `Do not repeat bridge telemetry.` },
          { beatIndex: 2, act: 2, targetAct: 'Act II — Discovery', narrativeGoal: `Improvise a technical bypass under mounting thermal or atmospheric hazard.`, requiredProgression: `A warning sensor indicates an approaching physical wavefront or deadline.`, avoidRepeating: `Do not repeat suit checks.` },
          { beatIndex: 3, act: 3, targetAct: 'Act III — Confrontation', narrativeGoal: `Manually wrench the bypass open under critical hazard.`, requiredProgression: `Superheated plasma or pressure vents into the void, returning systems to nominal.`, avoidRepeating: `Do not repeat cutting or tool use.` },
          { beatIndex: 4, act: 4, targetAct: 'Act IV — Resolution', narrativeGoal: `Re-enter the airlock and verify stable orbital telemetry.`, requiredProgression: `Observe the station riding out the remainder of the crisis in safe orbit.`, avoidRepeating: `Do not trigger another system alarm.` }
        ]
      };
    case 'Comedy':
      return {
        primaryConflict: `At ${setting}, ${hook}, triggering an escalating chain of absurd misunderstandings.`,
        initialStakes: `A tiny innocent blunder threatens to erupt into total social humiliation and festive chaos.`,
        climaxObjective: `Prevent the ridiculous complication from exploding in front of the entire assembly.`,
        endingRequirements: `Pay off the comic misunderstanding with an absurd but definite, harmless resolution.`,
        endingType: 'humorous_twist',
        beats: [
          { beatIndex: 0, act: 1, targetAct: 'Act I — Beginning', narrativeGoal: `Realize the disastrous comic mix-up at ${setting} just as events begin.`, requiredProgression: `Discover the real item or secret was misplaced in the most awkward spot.`, avoidRepeating: `Do not repeat item descriptions.` },
          { beatIndex: 1, act: 2, targetAct: 'Act II — Discovery', narrativeGoal: `Infiltrate the gathering with an absurd improvised cover-up.`, requiredProgression: `Accidentally topple a decorative display, creating panicked confusion.`, avoidRepeating: `Do not repeat discovery jokes.` },
          { beatIndex: 2, act: 2, targetAct: 'Act II — Discovery', narrativeGoal: `Attempt a frantic hand-to-hand swap beneath everyone's noses.`, requiredProgression: `Cause the bystanders to misinterpret the commotion with growing absurdity.`, avoidRepeating: `Do not repeat disguise jokes.` },
          { beatIndex: 3, act: 3, targetAct: 'Act III — Confrontation', narrativeGoal: `Make the final desperate lunge right as the spotlight falls.`, requiredProgression: `A chaotic collision reveals the harmless blunder to everyone in attendance.`, avoidRepeating: `Do not repeat table crawls.` },
          { beatIndex: 4, act: 4, targetAct: 'Act IV — Resolution', narrativeGoal: `Turn the hilarious catastrophe into a celebrated spectacle of shared laughter.`, requiredProgression: `The assembly bursts into applause, declaring the mishap the highlight of the event.`, avoidRepeating: `Do not repeat the collision.` }
        ]
      };
    case 'Detective investigation':
    default:
      return {
        primaryConflict: `At ${setting}, ${hook}, leaving an elusive trail of forensic clues for ${protagonist} and ${companion}.`,
        initialStakes: `The culprit will escape or a vital truth will be lost before dawn if discrepancies are not caught.`,
        climaxObjective: `Confront the suspect or discrepancy using indisputable physical evidence.`,
        endingRequirements: `Reveal an evidence-supported deduction naming the culprit or cause, or identify the remaining deliberate unknown.`,
        endingType: 'resolved',
        beats: [
          { beatIndex: 0, act: 1, targetAct: 'Act I — Beginning', narrativeGoal: `Examine the incident scene at ${setting} and secure initial physical evidence.`, requiredProgression: `Identify a missing item or anomalous physical mark.`, avoidRepeating: `Do not repeat the crime notice.` },
          { beatIndex: 1, act: 2, targetAct: 'Act II — Discovery', narrativeGoal: `Cross-examine witnesses or inspect logbooks regarding timeline discrepancies.`, requiredProgression: `Expose an inconsistency in the official account.`, avoidRepeating: `Do not re-examine the entry point.` },
          { beatIndex: 2, act: 2, targetAct: 'Act II — Discovery', narrativeGoal: `Trace the physical trail or secondary tool used in the incident.`, requiredProgression: `Connect the specialized tool or mark to an insider or accomplice.`, avoidRepeating: `Do not repeat witness questioning.` },
          { beatIndex: 3, act: 3, targetAct: 'Act III — Confrontation', narrativeGoal: `Trap the perpetrator with unforgeable physical proof before evidence is destroyed.`, requiredProgression: `Force an admission or prevent the destruction of decisive evidence.`, avoidRepeating: `Do not repeat trail searches.` },
          { beatIndex: 4, act: 4, targetAct: 'Act IV — Resolution', narrativeGoal: `Deliver the conclusive forensic explanation and log the official indictment.`, requiredProgression: `Confirm the safety of the community and state the consequence for the accused.`, avoidRepeating: `Do not repeat the confrontation.` }
        ]
      };
  }
}

/**
 * Creates a bounded, seeded narrative director plan for any registered genre.
 */
export function createStoryDirectorPlan(
  theme: string,
  cast?: { protagonist: string; companion: string; role: string; setting: string; hook: string },
  opening?: string,
  randomSeed: () => number = Math.random
): StoryDirectorPlan {
  const template = GENRE_TEMPLATES[theme] || GENRE_TEMPLATES['Detective investigation'];
  const scenarioIndex = Math.floor(randomSeed() * (template?.scenarios?.length || 1));
  const baseScenario = template?.scenarios?.[scenarioIndex];

  // Character assembly: prioritize user or preset cast, otherwise use seeded selection
  let protagonist = cast?.protagonist;
  let companion = cast?.companion;
  if (!protagonist) {
    const pIdx = Math.floor(randomSeed() * RANDOM_CAST_NAMES.length);
    protagonist = RANDOM_CAST_NAMES[pIdx];
  }
  if (!companion) {
    const filtered = RANDOM_CAST_NAMES.filter(n => n !== protagonist);
    const cIdx = Math.floor(randomSeed() * filtered.length);
    companion = filtered[cIdx];
  }

  const role = cast?.role || 'Protagonist';
  const setting = cast?.setting || 'the scene';
  const hook = cast?.hook;

  const characters = [
    { name: protagonist, role, relationToProtagonist: 'Self' },
    { name: companion, role: 'Companion / Witness', relationToProtagonist: 'Close associate / partner' }
  ];

  if (hook) {
    const dynamic = buildDynamicGenreBeats(theme, protagonist, companion, role, setting, hook);
    return {
      genre: dynamic.endingType,
      theme,
      characters,
      primaryConflict: opening ? `${dynamic.primaryConflict} (Established opening: "${opening.slice(0, 100)}")` : dynamic.primaryConflict,
      initialStakes: dynamic.initialStakes,
      developmentBeats: dynamic.beats,
      climaxObjective: dynamic.climaxObjective,
      endingRequirements: dynamic.endingRequirements,
      endingType: dynamic.endingType
    };
  }

  const beats: StoryDirectorBeat[] = (baseScenario?.beats || []).map((b, idx) => ({
    beatIndex: idx,
    act: b.act,
    targetAct: b.targetAct,
    narrativeGoal: b.narrativeGoal,
    requiredProgression: b.requiredProgression,
    avoidRepeating: b.avoidRepeating
  }));

  const primaryConflict = baseScenario?.conflict || `A crisis unfolds at ${setting}.`;
  return {
    genre: template.endingType,
    theme,
    characters,
    primaryConflict: opening ? `${primaryConflict} (Established opening: "${opening.slice(0, 100)}")` : primaryConflict,
    initialStakes: baseScenario?.stakes || `A failure will bring serious consequences to ${protagonist} and ${companion}.`,
    developmentBeats: beats,
    climaxObjective: baseScenario?.climaxObjective || `Confront the central crisis at ${setting}.`,
    endingRequirements: template.endingRequirements,
    endingType: template.endingType
  };
}
