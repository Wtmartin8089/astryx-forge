export type DecorationDefinition = {
  id: string;
  name: string;
  description: string;
  image: string;
};

const starfleetDecorations: DecorationDefinition[] = [
  {
    id: "medal-of-honor",
    name: "Medal of Honor",
    description: "Starfleet's highest decoration, awarded for conspicuous gallantry and intrepidity at the risk of life above and beyond the call of duty.",
    image: "/awards/MedalOfHonor.png",
  },
  {
    id: "pike-medal-of-valor",
    name: "Christopher Pike Medal of Valor",
    description: "Awarded for acts of personal valor in the line of duty, named in honor of Fleet Captain Christopher Pike.",
    image: "/awards/MEDAL_CHRISPIKE_FULL.png",
  },
  {
    id: "medal-of-commendation",
    name: "Starfleet Medal of Commendation",
    description: "Awarded for meritorious service and outstanding achievement during a Starfleet mission.",
    image: "/awards/MEDAL_COMMENDATION_FULL.png",
  },
  {
    id: "extended-tour-ribbon",
    name: "Extended Tour Ribbon",
    description: "Awarded to officers completing an extended tour of duty beyond standard assignment length.",
    image: "/awards/MEDAL_FIVE_YEAR_FULL.png",
  },
  {
    id: "dominion-war-campaign",
    name: "Dominion War Campaign Ribbon",
    description: "Awarded to all personnel who served in active combat operations during the Dominion War (2373–2375).",
    image: "/awards/MEDAL_DOMINION_WAR_FULL.png",
  },
  {
    id: "purple-heart",
    name: "Purple Heart",
    description: "Awarded to officers who are wounded or killed in action against an enemy of the Federation.",
    image: "/awards/PurpleHeart.png",
  },
  {
    id: "federation-cross",
    name: "Federation Cross",
    description: "Awarded for exceptional devotion to duty and distinguished service to the United Federation of Planets.",
    image: "/awards/FederationCross.png",
  },
  {
    id: "klingon-alliance-ribbon",
    name: "Klingon Alliance Service Ribbon",
    description: "Awarded for distinguished service in joint operations with the Klingon Defense Force.",
    image: "/awards/MEDAL_KLINGON_WAR_FULL.png",
  },
  {
    id: "exploration-ribbon",
    name: "Deep Space Exploration Ribbon",
    description: "Awarded for participation in deep space exploration beyond charted Federation territory.",
    image: "/awards/MEDAL_DELTA_FULL.png",
  },
  {
    id: "first-contact-ribbon",
    name: "First Contact Ribbon",
    description: "Awarded to personnel directly involved in a successful first contact with a previously unknown species.",
    image: "/awards/FirstContact.png",
  },

  // Extended decoration library
  {
    id: "starfleet_medal_of_merit",
    name: "Starfleet Medal of Merit",
    description: "Awarded for distinguished meritorious service above and beyond the call of duty.",
    image: "/awards/StarfleetMedal.png",
  },
  {
    id: "diplomacy_medal",
    name: "Diplomacy Medal",
    description: "Awarded for exceptional diplomatic achievement in service of Federation interests.",
    image: "/awards/MEDAL_DIPLOMATIC_FULL.png",
  },
  {
    id: "command_citation_of_merit",
    name: "Command Citation of Merit",
    description: "Awarded by Starfleet Command for distinguished command leadership.",
    image: "/awards/Citation_CinC.png",
  },
  {
    id: "exploration_achievement_medal",
    name: "Exploration Achievement Medal",
    description: "Awarded for significant achievement in the exploration of uncharted space.",
    image: "/awards/MEDAL_DELTA_FULL.png",
  },
  {
    id: "dominion_war_campaign_medal",
    name: "Dominion War Campaign Medal",
    description: "Awarded for active service in combat operations during the Dominion War.",
    image: "/awards/MEDAL_DOMINION_WAR_FULL.png",
  },
  {
    id: "klingon_campaign_medal",
    name: "Klingon Campaign Medal",
    description: "Awarded for distinguished service in joint operations with the Klingon Defense Force.",
    image: "/awards/MEDAL_KLINGON_WAR_FULL.png",
  },
  {
    id: "cardassian_border_campaign_medal",
    name: "Cardassian Border Campaign Medal",
    description: "Awarded for patrol and security service along the Cardassian border.",
    image: "/awards/MEDAL_OUTBACK_FULL.png",
  },
  {
    id: "exploration_ribbon",
    name: "Exploration Ribbon",
    description: "Awarded for participation in deep-space exploration beyond Federation territory.",
    image: "/awards/MEDAL_DELTA_FULL.png",
  },
  {
    id: "first_contact_ribbon",
    name: "First Contact Ribbon",
    description: "Awarded for direct involvement in a successful first contact mission.",
    image: "/awards/FirstContact.png",
  },
  {
    id: "combat_service_ribbon",
    name: "Combat Service Ribbon",
    description: "Awarded for active combat service in defense of the Federation.",
    image: "/awards/CombatMerit.png",
  },
  {
    id: "scientific_survey_ribbon",
    name: "Scientific Survey Ribbon",
    description: "Awarded for contributions to scientific survey operations in uncharted regions.",
    image: "/awards/Achievement_Sciences.png",
  },
  {
    id: "starbase_service_ribbon",
    name: "Starbase Service Ribbon",
    description: "Awarded for distinguished service aboard a Federation Starbase.",
    image: "/awards/CommendationMedal.png",
  },
  {
    id: "fleet_command_ribbon",
    name: "Fleet Command Ribbon",
    description: "Awarded to officers who have commanded a Starfleet task force or fleet element.",
    image: "/awards/AdmiralsStar.png",
  },
  {
    id: "long_service_ribbon",
    name: "Long Service Ribbon",
    description: "Awarded for five or more years of continuous distinguished Starfleet service.",
    image: "/awards/MEDAL_FIVE_YEAR_FULL.png",
  },
  {
    id: "alliance_service_ribbon",
    name: "Alliance Service Ribbon",
    description: "Awarded for service that strengthened the Federation–Klingon Alliance.",
    image: "/awards/Victory_Klingon1.png",
  },
];

export default starfleetDecorations;

export function getDecoration(id: string): DecorationDefinition | undefined {
  return starfleetDecorations.find((d) => d.id === id);
}
