export type AwardDefinition = {
  id: string;
  name: string;
  description: string;
  image: string;
};

const starfleetAwards: AwardDefinition[] = [
  {
    id: "medal-of-honor",
    name: "Medal of Honor",
    description: "Starfleet's highest decoration, awarded for conspicuous gallantry and intrepidity at the risk of life above and beyond the call of duty.",
    image: "/awards/medal-of-honor.png",
  },
  {
    id: "pike-medal-of-valor",
    name: "Christopher Pike Medal of Valor",
    description: "Awarded for acts of personal valor in the line of duty, named in honor of Fleet Captain Christopher Pike.",
    image: "/awards/pike-medal-of-valor.png",
  },
  {
    id: "medal-of-commendation",
    name: "Starfleet Medal of Commendation",
    description: "Awarded for meritorious service and outstanding achievement during a Starfleet mission.",
    image: "/awards/medal-of-commendation.png",
  },
  {
    id: "extended-tour-ribbon",
    name: "Extended Tour Ribbon",
    description: "Awarded to officers completing an extended tour of duty beyond standard assignment length.",
    image: "/awards/extended-tour-ribbon.png",
  },
  {
    id: "dominion-war-campaign",
    name: "Dominion War Campaign Ribbon",
    description: "Awarded to all personnel who served in active combat operations during the Dominion War (2373–2375).",
    image: "/awards/dominion-war-campaign.png",
  },
  {
    id: "purple-heart",
    name: "Purple Heart",
    description: "Awarded to officers who are wounded or killed in action against an enemy of the Federation.",
    image: "/awards/purple-heart.png",
  },
  {
    id: "federation-cross",
    name: "Federation Cross",
    description: "Awarded for exceptional devotion to duty and distinguished service to the United Federation of Planets.",
    image: "/awards/federation-cross.png",
  },
  {
    id: "klingon-alliance-ribbon",
    name: "Klingon Alliance Service Ribbon",
    description: "Awarded for distinguished service in joint operations with the Klingon Defense Force.",
    image: "/awards/klingon-alliance-ribbon.png",
  },
  {
    id: "exploration-ribbon",
    name: "Deep Space Exploration Ribbon",
    description: "Awarded for participation in deep space exploration beyond charted Federation territory.",
    image: "/awards/exploration-ribbon.png",
  },
  {
    id: "first-contact-ribbon",
    name: "First Contact Ribbon",
    description: "Awarded to personnel directly involved in a successful first contact with a previously unknown species.",
    image: "/awards/first-contact-ribbon.png",
  },
];

export default starfleetAwards;

/** Look up a single award definition by ID. Returns undefined if not found. */
export function getAward(id: string): AwardDefinition | undefined {
  return starfleetAwards.find((a) => a.id === id);
}
