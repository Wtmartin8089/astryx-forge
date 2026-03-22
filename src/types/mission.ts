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
  shipId?: string;
  assignedShip?: string; // legacy field — use shipId going forward
  stardate?: number;
  createdAt?: number;
};

export interface MissionLog {
  id?: string;
  missionId: string;
  phase: string;
  description: string;
  stardate: string;
  author: string;
  createdAt: unknown;
}
