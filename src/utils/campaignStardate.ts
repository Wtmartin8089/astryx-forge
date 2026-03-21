/**
 * Campaign stardate — single source of truth for the RPG's current timeline.
 *
 * ANCHOR_STARDATE: the stardate value on ANCHOR_REAL_DATE.
 * As real days pass, the stardate advances at ~1000 units per year (~2.74/day).
 * To reset the campaign stardate, update both values together.
 */
const ANCHOR_STARDATE = 53220.4;
const ANCHOR_REAL_DATE = new Date("2026-03-21");

/**
 * Format any stardate number as exactly XXXXX.X (5 digits before decimal, 1 after).
 * Pads with leading zeros if the integer part is fewer than 5 digits.
 */
export function formatStardate(sd: number): string {
  const [intPart, decPart] = sd.toFixed(1).split(".");
  return `${intPart.padStart(5, "0")}.${decPart}`;
}

export function getCampaignStardate(): string {
  const msPerDay = 86400000;
  const daysDelta = (Date.now() - ANCHOR_REAL_DATE.getTime()) / msPerDay;
  const sdDelta = (daysDelta / 365.25) * 1000;
  return formatStardate(ANCHOR_STARDATE + sdDelta);
}

/** Static string — convenience alias for getCampaignStardate() */
export const CAMPAIGN_STARDATE = getCampaignStardate();
