export const FORUM_CATEGORIES = [
  { id: "bridge", label: "Bridge", color: "#6699cc" },
  { id: "mission", label: "Mission Briefings", color: "#ff9933" },
  { id: "engineering", label: "Engineering", color: "#ffcc33" },
  { id: "tenForward", label: "Ten Forward", color: "#33cc99" },
  { id: "holodeck", label: "Holodeck", color: "#9933cc" },
] as const;

export type ForumCategoryId = (typeof FORUM_CATEGORIES)[number]["id"];
