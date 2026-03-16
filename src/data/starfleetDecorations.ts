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
];

export default starfleetDecorations;

export function getDecoration(id: string): DecorationDefinition | undefined {
  return starfleetDecorations.find((d) => d.id === id);
}
