export const FORUM_CATEGORIES = [
  // ── Location channels (in-character roleplay scenes) ──
  { id: "bridge",       label: "Bridge",        color: "#6699cc", threadType: "location" },
  { id: "tenForward",   label: "Ten Forward",   color: "#33cc99", threadType: "location" },
  { id: "crewQuarters", label: "Crew Quarters", color: "#9933cc", threadType: "location" },
  { id: "holodeck",     label: "Holodeck",      color: "#cc66ff", threadType: "location" },
  { id: "hallways",     label: "Hallways",      color: "#667788", threadType: "location" },
  { id: "sickbay",      label: "Sickbay",       color: "#cc3333", threadType: "location" },
  // ── Log channels (official Starfleet records) ──
  { id: "missionLog",    label: "Mission Log",       color: "#ff9933", threadType: "log" },
  { id: "personalLog",   label: "Personal Log",      color: "#ffcc33", threadType: "log" },
  { id: "departmentLog", label: "Department Log",    color: "#33cc99", threadType: "log" },
  // ── Legacy (kept for backward compatibility) ──
  { id: "mission",     label: "Mission Briefings", color: "#ff9900", threadType: "log" },
  { id: "engineering", label: "Engineering",       color: "#ffcc33", threadType: "log" },
] as const;

export type ForumCategoryId = (typeof FORUM_CATEGORIES)[number]["id"];
