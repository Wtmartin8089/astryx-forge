export type MissionStatus = "active" | "completed" | "failed" | "pending";

export type Mission = {
  id?: string;
  title: string;
  type: string;
  system: string;
  briefing: string;
  objectives: string[];
  complication: string;
  discovery: string;
  possibleOutcomes: string[];
  status: MissionStatus;
  assignedShip?: string;
  stardate?: number;
  createdAt?: number;
};
