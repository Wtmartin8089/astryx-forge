export type AwardEntry = {
  awardId: string;
  citation: string;
  awardedBy: string;
  stardate: string;
};

export type ServiceHistoryEntry = {
  year: number;
  event: string;
};

export type ShipWeapon = {
  name: string;
  damage: number;
  count: number | null;
};

export type ShipData = {
  name: string;
  registry: string;
  class: string;
  type: string;
  status: string;
  structuralPoints: { primary: number; secondary: number } | null;
  crew: number | null;
  passengers: number | null;
  evacuationCapacity: number | null;
  warp: {
    cruising: number;
    standard: number;
    maximum: number;
    maximumDuration: string;
  } | null;
  impulse: { standard: number; maximum: number } | null;
  weapons: ShipWeapon[];
  shields: { standard: number; maximum: number } | null;
  description: string;
  crewIds: string[];
};

export type AssignmentType = "ship" | "starbase" | "unassigned";

export type CrewMember = {
  name: string;
  species: string;
  rank: string;
  position: string;
  shipId: string;
  assignmentType?: AssignmentType;
  assignmentId?: string | null;
  attributes: {
    Fitness: number | null;
    Coordination: number | null;
    Presence: number | null;
    Intellect: number | null;
    PSI: number | null;
  };
  advantages: string[];
  disadvantages: string[];
  skills: string[];
  notes: string;
  biography: string;
  portrait: string;
  serviceRecord?: string[];
  serviceHistory?: ServiceHistoryEntry[];
  awards?: AwardEntry[];
  ownerId: string | null;
  ownerEmail: string | null;
  status: "active" | "pending";
};
