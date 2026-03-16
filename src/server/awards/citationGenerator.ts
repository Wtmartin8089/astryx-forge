export type CitationEvent = {
  eventType: string;
  location?: string;
  species?: string;
  ship?: string;
  stardate?: string;
};

const DEFAULT_LOCATION = "the frontier";
const DEFAULT_SHIP = "their assigned vessel";
const DEFAULT_SPECIES = "an unknown species";

function fmt(event: CitationEvent) {
  return {
    location: event.location?.trim() || DEFAULT_LOCATION,
    ship: event.ship?.trim() || DEFAULT_SHIP,
    species: event.species?.trim() || DEFAULT_SPECIES,
    sd: event.stardate ? `Stardate ${event.stardate}` : "during active service",
  };
}

export function generateCitation(event: CitationEvent): string {
  const { location, ship, species, sd } = fmt(event);

  switch (event.eventType) {
    case "first_contact_established":
      return (
        `For distinguished service in the establishment of first contact with the ${species} on ${sd} ` +
        `in the vicinity of ${location}. Through exceptional professionalism, cultural sensitivity, ` +
        `and unwavering dedication to the principles of the United Federation of Planets, this officer ` +
        `played an instrumental role in forging a relationship with a previously unknown civilization. ` +
        `The success of this historic encounter reflects the highest traditions of Starfleet service.`
      );

    case "system_discovered":
      return (
        `For meritorious achievement in the exploration and survey of ${location} aboard the ${ship}, ${sd}. ` +
        `This officer demonstrated exceptional initiative and scientific acumen in charting previously ` +
        `unmapped stellar phenomena, expanding the Federation's understanding of the cosmos. Their ` +
        `contributions advance the enduring Starfleet mission of peaceful exploration beyond the ` +
        `boundaries of known space.`
      );

    case "combat_victory":
      return (
        `For conspicuous gallantry and intrepidity in the face of hostile action near ${location} ` +
        `aboard the ${ship}, ${sd}. Under conditions of extreme danger, this officer demonstrated ` +
        `extraordinary courage and tactical excellence, directly contributing to the defense of ` +
        `the ship and crew. Their actions reflect great credit upon themselves and the Starfleet uniform.`
      );

    case "diplomatic_success":
      return (
        `For exceptional service in the successful resolution of a diplomatic engagement with the ` +
        `${species} near ${location}, ${sd}. Through skillful negotiation and unwavering commitment ` +
        `to Federation principles, this officer achieved a peaceful outcome that strengthened ` +
        `interstellar relations. Their conduct exemplifies the highest ideals of the United ` +
        `Federation of Planets.`
      );

    case "rescue_operation":
      return (
        `For outstanding performance during a search and rescue operation in the ${location} region, ` +
        `${sd}. Aboard the ${ship}, this officer demonstrated remarkable courage and selfless dedication ` +
        `in preserving the lives of others under hazardous conditions. Their actions reflect the finest ` +
        `humanitarian traditions of Starfleet service.`
      );

    case "scientific_discovery":
      return (
        `For meritorious scientific achievement during operations near ${location} aboard the ${ship}, ` +
        `${sd}. This officer's research and analytical contributions resulted in a discovery of ` +
        `significant value to the Federation Science Council. Their work advances the boundaries of ` +
        `known science and upholds the exploratory mission of Starfleet.`
      );

    case "wartime_service":
      return (
        `For service in active combat operations near ${location} during a period of armed conflict, ` +
        `${sd}, aboard the ${ship}. This officer performed their duties with honor and distinction ` +
        `under sustained hostile conditions, contributing directly to the defense and security of ` +
        `the United Federation of Planets.`
      );

    case "meritorious_service":
    default:
      return (
        `For meritorious service rendered in the performance of duty near ${location} aboard the ` +
        `${ship}, ${sd}. This officer's dedication, professionalism, and commitment to the ideals ` +
        `of Starfleet reflect great credit upon themselves and the United Federation of Planets.`
      );
  }
}

export const EVENT_TYPES: { value: string; label: string }[] = [
  { value: "first_contact_established", label: "First Contact Established" },
  { value: "system_discovered",         label: "System / Anomaly Discovered" },
  { value: "combat_victory",            label: "Combat Victory" },
  { value: "diplomatic_success",        label: "Diplomatic Success" },
  { value: "rescue_operation",          label: "Rescue Operation" },
  { value: "scientific_discovery",      label: "Scientific Discovery" },
  { value: "wartime_service",           label: "Wartime Service" },
  { value: "meritorious_service",       label: "Meritorious Service" },
];
