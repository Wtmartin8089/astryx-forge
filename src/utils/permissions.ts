/**
 * Role-based permission utilities for Starfleet command hierarchy.
 *
 * Role is resolved from CrewMember.role (preferred) or CrewMember.rank (fallback).
 * Matching is case-insensitive.
 */

const DIRECTIVE_ROLES = ["fleet admiral", "admiral", "captain", "commander"];
const MISSION_ROLES   = ["fleet admiral", "admiral", "captain"];

function normalize(role: string | null | undefined): string {
  return (role ?? "").trim().toLowerCase();
}

/** True if this role may issue directives through the Computer Core. */
export function canIssueDirective(role: string | null | undefined): boolean {
  return DIRECTIVE_ROLES.includes(normalize(role));
}

/** True if this role may generate or create missions. */
export function canCreateMission(role: string | null | undefined): boolean {
  return MISSION_ROLES.includes(normalize(role));
}

/**
 * Human-readable authorization label for UI display.
 * e.g. "Authorization Level: Captain" or "Authorization Level: Restricted"
 */
export function getAuthorizationLabel(role: string | null | undefined): string {
  const r = normalize(role);
  const match = [...DIRECTIVE_ROLES, ...MISSION_ROLES].find((lvl) => lvl === r);
  if (!match) return "Authorization Level: Restricted";
  // Title-case the matched level
  const label = match.replace(/\b\w/g, (c) => c.toUpperCase());
  return `Authorization Level: ${label}`;
}
