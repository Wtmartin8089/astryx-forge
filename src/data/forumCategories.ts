export const FORUM_CATEGORIES = [
  // ── Mission Area ──
  { id: "mission",      label: "Mission Briefings", color: "#ff9900", threadType: "mission" },

  // ── Shipboard Roleplay Locations ──
  { id: "bridge",       label: "Bridge",            color: "#6699cc", threadType: "location" },
  { id: "engineering",  label: "Engineering",        color: "#ffcc33", threadType: "location" },
  { id: "sickbay",      label: "Sickbay",           color: "#cc3333", threadType: "location" },
  { id: "crewQuarters", label: "Crew Quarters",     color: "#9933cc", threadType: "location" },
  { id: "holodeck",     label: "Holodeck",           color: "#cc66ff", threadType: "location" },
  { id: "hallways",     label: "Hallways",           color: "#667788", threadType: "location" },
  { id: "tenForward",   label: "Ten Forward",        color: "#33cc99", threadType: "location" },
] as const;

export type ForumCategoryId = (typeof FORUM_CATEGORIES)[number]["id"];
