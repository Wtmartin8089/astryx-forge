export type MissionTemplate = {
  name: string;
  hook: string;
  objectives: string[];
  complications: string[];
  discoveries: string[];
  possibleOutcomes: string[];
};

export const missionTemplates: Record<string, MissionTemplate> = {
  signal_investigation: {
    name: "Signal Investigation",
    hook: "Starfleet sensors detect an unknown signal in an unexplored system.",
    objectives: [
      "Locate the signal source",
      "Determine if the signal is artificial or natural in origin",
      "Scan for life signs and structural hazards",
      "Document findings and report to Starfleet Command",
    ],
    complications: [
      "subspace interference disrupting sensors",
      "radiation storms limiting approach vectors",
      "asteroid debris field blocking direct access",
      "sensor distortion masking the true origin",
    ],
    discoveries: [
      "ancient automated satellite of unknown origin",
      "alien distress beacon still transmitting",
      "automated probe from a previously unknown civilization",
      "derelict station in decaying orbit",
    ],
    possibleOutcomes: [
      "Signal identified as natural phenomenon — catalogued and reported",
      "Alien technology recovered and turned over to Starfleet Science",
      "First contact initiated with signal originators",
      "Distress signal traced — rescue operation launched",
    ],
  },

  distress_call: {
    name: "Distress Call",
    hook: "A distress beacon is detected from an unknown source in deep space.",
    objectives: [
      "Locate the source of the distress signal",
      "Identify the vessel, colony, or individuals in distress",
      "Provide immediate medical or technical assistance",
      "Secure the area and assess ongoing threats",
    ],
    complications: [
      "damaged life support reducing survival window",
      "hostile environmental conditions",
      "unknown attackers still in the area",
      "cascading system failures aboard the vessel",
    ],
    discoveries: [
      "disabled Starfleet vessel with surviving crew",
      "abandoned colony station with unexpected inhabitants",
      "trapped shuttle crew from a rival power",
      "alien survivors of an unknown conflict",
    ],
    possibleOutcomes: [
      "Crew rescued and vessel towed to nearest starbase",
      "Diplomatic incident averted through careful negotiation",
      "Hostile party identified and warning transmitted to Starfleet",
      "Colony resupplied and distress cause corrected",
    ],
  },

  anomaly_investigation: {
    name: "Subspace Anomaly",
    hook: "Sensors detect unusual spatial distortions that defy current scientific models.",
    objectives: [
      "Conduct full sensor sweep of the anomaly",
      "Determine the origin and classification of the phenomenon",
      "Assess potential danger to navigation and nearby systems",
      "Gather data for Starfleet Science Council",
    ],
    complications: [
      "temporal distortion affecting shipboard chronometers",
      "gravity fluctuations stressing structural integrity",
      "unstable energy surges damaging external sensors",
      "sensor blindness rendering standard scanning useless",
    ],
    discoveries: [
      "new class of energy phenomenon not in Starfleet records",
      "ancient alien technology generating the distortion",
      "spatial rift leading to an unmapped region",
      "unknown non-corporeal lifeform inhabiting the anomaly",
    ],
    possibleOutcomes: [
      "Phenomenon catalogued and spatial hazard warning issued",
      "Ancient technology recovered and delivered to Daystrom Institute",
      "Rift sealed before it could destabilize surrounding space",
      "New lifeform encountered — first contact protocols initiated",
    ],
  },

  first_contact: {
    name: "First Contact",
    hook: "Long-range scans detect evidence of a pre-warp civilization approaching a critical threshold.",
    objectives: [
      "Observe the civilization from a safe, non-detectable distance",
      "Determine if first contact protocols should be initiated",
      "Protect the Prime Directive unless circumstances demand otherwise",
      "Report findings to Starfleet Diplomatic Corps",
    ],
    complications: [
      "accidental detection by the local population",
      "internal civil conflict on the surface",
      "competing powers already making contact",
      "planetary catastrophe requiring intervention decision",
    ],
    discoveries: [
      "civilization on the verge of achieving warp flight",
      "species with unusual telepathic abilities",
      "previously unknown offshoot of a known species",
      "civilization that has already been contacted — illegally",
    ],
    possibleOutcomes: [
      "First contact made successfully — new Federation ally gained",
      "Prime Directive maintained — civilization observed without contact",
      "Emergency intervention required — philosophical debate ensues",
      "Diplomatic incident with a third party avoided through mediation",
    ],
  },

  exploration_survey: {
    name: "Planetary Survey",
    hook: "A newly discovered system requires full scientific survey before Federation colonization assessment.",
    objectives: [
      "Conduct geological and atmospheric surveys of candidate planets",
      "Scan for existing life forms — sentient and non-sentient",
      "Evaluate habitability and resource potential",
      "Document all findings for the Federation Colonization Bureau",
    ],
    complications: [
      "unexpected storm systems blocking surface scans",
      "previously unmapped subterranean life forms",
      "territorial claims by an unknown party",
      "interference from unusual mineral deposits",
    ],
    discoveries: [
      "planet rich in rare dilithium formations",
      "pre-industrial civilization living below sensor resolution",
      "ancient ruins suggesting a vanished spacefaring culture",
      "unique biosphere with significant medical research potential",
    ],
    possibleOutcomes: [
      "System approved for colonization — survey submitted",
      "Colonization halted — indigenous life forms discovered",
      "Archaeological expedition recommended — ruins catalogued",
      "Medical research team dispatched — new treatments possible",
    ],
  },
};

export function getTemplate(type: string): MissionTemplate | undefined {
  return missionTemplates[type];
}

export const MISSION_TYPES = Object.keys(missionTemplates);
