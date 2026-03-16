import type { Mission } from "../types/mission";

/** Five hand-crafted starter missions for early gameplay. */
export const starterMissions: Omit<Mission, "id">[] = [
  {
    title: "Mission 001 — The Silent Signal",
    type: "signal_investigation",
    system: "Taraka",
    briefing:
      "Long-range sensors aboard Starbase Machida have detected a repeating signal originating from the outer reaches of the Taraka system. The signal pattern does not match any known Federation, Klingon, or Cardassian transmission format. Initial analysis suggests artificial origin. A vessel is to be dispatched to investigate before the signal falls silent.",
    objectives: [
      "Locate the precise origin of the repeating signal",
      "Determine whether the signal is artificial or natural in origin",
      "Scan for life signs, structural hazards, and radiation",
      "Document all findings and transmit report to Starfleet Command",
    ],
    complication: "subspace interference disrupting sensor resolution at long range",
    discovery: "ancient automated satellite of unknown origin",
    possibleOutcomes: [
      "Satellite identified as pre-Federation era — catalogued and reported",
      "Signal traced to a dormant alien probe — reactivation attempted",
      "Unknown civilization identified as signal source — first contact protocols initiated",
      "Satellite salvaged and delivered to Starfleet Science Command",
    ],
    status: "active",
    stardate: 74206.4,
    createdAt: Date.now(),
  },

  {
    title: "Mission 002 — Echoes of a Lost Ship",
    type: "distress_call",
    system: "Lurconis",
    briefing:
      "A faint distress beacon has been detected near the Lurconis binary system — a region not covered by regular patrol routes. The beacon signature matches a Starfleet registry from a vessel reported missing three years prior. No crew status is known. Time is critical, as the beacon signal is degrading.",
    objectives: [
      "Locate the source of the distress beacon in the Lurconis system",
      "Identify the vessel and assess crew status",
      "Provide medical and technical assistance as required",
      "Determine what caused the vessel's disappearance",
    ],
    complication: "cascading system failures aboard the vessel reducing survival window",
    discovery: "disabled Starfleet vessel with surviving crew in emergency stasis",
    possibleOutcomes: [
      "Crew recovered alive — vessel towed to Starbase Machida",
      "Crew logs recovered — disappearance explained, search for survivors continues",
      "Hostile party identified as responsible — alert transmitted to Starfleet",
      "Vessel beyond recovery — crew evacuated before controlled scuttle",
    ],
    status: "active",
    stardate: 74210.1,
    createdAt: Date.now(),
  },

  {
    title: "Mission 003 — The Shattered Nebula",
    type: "anomaly_investigation",
    system: "Acathla",
    briefing:
      "Sensors on patrol vessels transiting the Acathla corridor have reported increasingly severe spatial distortions over the past two weeks. The distortions appear to be growing in magnitude and could pose a navigation hazard to commercial and military traffic. Starfleet Science requests a dedicated investigation before the phenomenon escalates.",
    objectives: [
      "Enter the Acathla system and conduct full sensor sweep of the distortion field",
      "Classify the anomaly and determine its origin",
      "Assess risk to navigation and nearby inhabited systems",
      "Gather data samples for the Federation Science Council",
    ],
    complication: "gravity fluctuations stressing structural integrity near the core",
    discovery: "ancient alien technology generating the spatial distortions",
    possibleOutcomes: [
      "Phenomenon classified — spatial hazard warning issued to all traffic",
      "Ancient technology recovered — delivered to the Daystrom Institute",
      "Distortions increasing — evacuation recommendation filed with Starfleet",
      "Technology deactivated — distortions cease, system declared safe",
    ],
    status: "active",
    stardate: 74215.7,
    createdAt: Date.now(),
  },

  {
    title: "Mission 004 — A Cry for Help",
    type: "distress_call",
    system: "Lagos",
    briefing:
      "A civilian colony on Lagos III has broadcast a general distress call citing a catastrophic failure of their atmospheric processing systems. Without intervention, the colony's breathable air reserves will be exhausted within 72 hours. The nearest relief vessel is 36 hours away — Starfleet has ordered an immediate response.",
    objectives: [
      "Reach Lagos III before atmospheric reserves are depleted",
      "Assess and stabilize the atmospheric processing failure",
      "Distribute emergency life support equipment",
      "Identify the cause of the failure and prevent recurrence",
    ],
    complication: "hostile storm system blocking orbital approach and transporter locks",
    discovery: "evidence of sabotage to the colony's primary power grid",
    possibleOutcomes: [
      "Colony stabilized — investigation into sabotage handed to Federation Security",
      "Evacuation required — colonists transported to rescue vessels",
      "Saboteur identified and detained — colony restored to full operation",
      "External threat neutralized — colony defenses upgraded",
    ],
    status: "active",
    stardate: 74219.3,
    createdAt: Date.now(),
  },

  {
    title: "Mission 005 — Shadows Beneath the Ice",
    type: "signal_investigation",
    system: "Taraka IV",
    briefing:
      "During routine mapping of the Taraka system's outer planets, an automated survey probe detected a low-frequency signal emanating from beneath the frozen surface of Taraka IV. The signal appears rhythmic and structured, suggesting possible artificial origin. The moon's subsurface ocean has never been surveyed. Starfleet Science has flagged this as a high priority.",
    objectives: [
      "Establish a stable orbit around Taraka IV",
      "Deploy sensor probes to penetrate the ice layer and trace the signal",
      "Determine whether the signal originates from technology or life",
      "Conduct non-invasive investigation in accordance with Prime Directive",
    ],
    complication: "sensor distortion from high-density ice layers masking signal clarity",
    discovery: "unknown non-corporeal lifeform inhabiting the subsurface ocean",
    possibleOutcomes: [
      "Lifeform documented — Federation Science Council notified",
      "First contact initiated with subsurface intelligence",
      "Signal identified as natural biological communication — study recommended",
      "Lifeform found to be endangered — protection status filed",
    ],
    status: "active",
    stardate: 74224.8,
    createdAt: Date.now(),
  },
];
