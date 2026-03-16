import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import type { AwardEntry } from "../../types/fleet";
import { generateCitation, type CitationEvent } from "./citationGenerator";

export type AwardRequest = {
  crewSlug: string;
  awardId: string;
  awardedBy: string;
  stardate: string;
  /** When provided, a citation is auto-generated from the event. */
  event?: CitationEvent;
  /** When provided, overrides auto-generation entirely. */
  manualCitation?: string;
};

/**
 * Grants an award to a crew member.
 * If `manualCitation` is supplied it is used as-is.
 * Otherwise a citation is generated from `event`.
 * The AwardEntry is written to Firestore and returned.
 */
export async function grantAward(req: AwardRequest): Promise<AwardEntry> {
  const citation =
    req.manualCitation?.trim() ||
    generateCitation({
      eventType: req.event?.eventType || "meritorious_service",
      location: req.event?.location,
      species: req.event?.species,
      ship: req.event?.ship,
      stardate: req.stardate,
    });

  const entry: AwardEntry = {
    awardId: req.awardId,
    citation,
    awardedBy: req.awardedBy,
    stardate: req.stardate,
  };

  await updateDoc(doc(db, "crew", req.crewSlug), {
    awards: arrayUnion(entry),
  });

  return entry;
}
