export const FORUM_CATEGORIES = [
  { id: "general", label: "General Discussion", color: "#6699cc" },
  { id: "missions", label: "Mission Briefings", color: "#ff9933" },
  { id: "engineering", label: "Engineering Reports", color: "#ffcc33" },
  { id: "lounge", label: "Off-Duty Lounge", color: "#33cc99" },
] as const;

export type ForumCategoryId = (typeof FORUM_CATEGORIES)[number]["id"];
