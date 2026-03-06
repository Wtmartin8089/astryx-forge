/**
 * POST /api/exploreSystem
 * Body: { campaignId: string, systemId: string }
 *
 * 1. Validates the system exists and belongs to the campaign
 * 2. Generates AI details (non-fatal if Ollama is unavailable)
 * 3. Marks the system discovered and saves details
 * 4. Expands the frontier (creates undiscovered neighbors)
 */

import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getServerDb } from "../../src/server/firebase/serverDb.js";
import { expandFrontier } from "../../src/server/systems/expandFrontier.js";
import { generateSystemDetails, OllamaUnavailableError } from "../../src/server/ai/generateSystemDetails.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { campaignId, systemId } = req.body ?? {};

  if (!campaignId || !systemId) {
    return res.status(400).json({ error: "campaignId and systemId are required." });
  }

  const db = getServerDb();

  // ── Fetch system ──
  const systemRef = doc(db, "systems", systemId);
  let snap;
  try {
    snap = await getDoc(systemRef);
  } catch (err) {
    console.error("[exploreSystem] Firestore getDoc error:", err);
    return res.status(500).json({ error: "Database error." });
  }

  if (!snap.exists()) {
    return res.status(404).json({ error: "System not found." });
  }

  const system = snap.data();

  if (system.campaignId !== campaignId) {
    return res.status(403).json({ error: "System does not belong to this campaign." });
  }

  if (system.discovered) {
    return res.status(400).json({ error: "System already discovered." });
  }

  // ── Generate AI details (best-effort — map still works without Ollama) ──
  let details = null;
  let systemName = `System ${systemId.slice(0, 6).toUpperCase()}`;

  try {
    details = await generateSystemDetails("exploration");
    systemName = details.systemName;
  } catch (err) {
    if (err instanceof OllamaUnavailableError) {
      console.warn("[exploreSystem] Ollama unavailable — skipping AI details.");
    } else {
      console.error("[exploreSystem] AI generation error:", err.message);
    }
    // Provide minimal fallback details so the map still shows something
    details = {
      systemName,
      starType:    "Unknown",
      planetCount: 0,
      anomaly:     "Sensors inconclusive.",
      missionHook: "Further investigation required.",
    };
  }

  // ── Mark discovered and save details ──
  try {
    await updateDoc(systemRef, {
      discovered: true,
      name: systemName,
      details,
    });
  } catch (err) {
    console.error("[exploreSystem] updateDoc error:", err);
    return res.status(500).json({ error: "Failed to update system." });
  }

  // ── Expand frontier ──
  try {
    await expandFrontier(db, { campaignId, x: system.x, y: system.y });
  } catch (err) {
    // Non-fatal — log but don't fail the response
    console.error("[exploreSystem] expandFrontier error:", err);
  }

  return res.status(200).json({
    success: true,
    system: { ...system, discovered: true, name: systemName, details },
  });
}
