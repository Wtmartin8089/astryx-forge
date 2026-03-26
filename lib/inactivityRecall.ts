import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../src/firebase/firebaseConfig";

const INACTIVE_DAYS = 4;
const RECALL_COOLDOWN_DAYS = 3;

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

/**
 * Find crew assigned to active missions who have not posted recently,
 * and send them an in-universe recall notification.
 * Deduplicates: will not re-send within RECALL_COOLDOWN_DAYS.
 */
export async function sendInactivityRecalls(): Promise<{ notified: number }> {
  const inactivityCutoff = Timestamp.fromDate(daysAgo(INACTIVE_DAYS));
  const recallCooldown = Timestamp.fromDate(daysAgo(RECALL_COOLDOWN_DAYS));

  // Get all active missions to know which shipIds are currently engaged
  const missionsSnap = await getDocs(
    query(collection(db, "missions"), where("status", "==", "active")),
  );
  const activeShipIds = new Set<string>();
  missionsSnap.forEach((d) => {
    const shipId = d.data().shipId;
    if (shipId) activeShipIds.add(shipId);
  });

  if (activeShipIds.size === 0) return { notified: 0 };

  // Query active crew on those ships
  const crewSnap = await getDocs(
    query(collection(db, "crew"), where("status", "==", "active")),
  );

  const toNotify: Array<{ id: string; email: string; name: string; shipName?: string }> = [];

  crewSnap.forEach((d) => {
    const data = d.data();

    // Must be on an active-mission ship
    if (!activeShipIds.has(data.shipId)) return;

    // Must have an email
    if (!data.ownerEmail) return;

    // Check inactivity: lastPost must be older than cutoff (or never set)
    const lastPost: Timestamp | null = data.lastPost ?? null;
    if (lastPost && lastPost.toMillis() > inactivityCutoff.toMillis()) return;

    // Check cooldown: don't re-send within RECALL_COOLDOWN_DAYS
    const lastRecall: Timestamp | null = data.lastRecallSent ?? null;
    if (lastRecall && lastRecall.toMillis() > recallCooldown.toMillis()) return;

    toNotify.push({
      id: d.id,
      email: data.ownerEmail,
      name: data.name || "Officer",
      shipName: data.shipName,
    });
  });

  let notified = 0;
  for (const crew of toNotify) {
    const html = `
      <div style="font-family: monospace; background: #0a0a0a; color: #e0e0e0; padding: 24px; border-left: 4px solid #cc3333; max-width: 600px;">
        <p style="color: #cc3333; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 8px;">
          ⚠ Status Request — ${crew.shipName ?? "Your Vessel"}
        </p>
        <p style="color: #ccc; font-size: 14px; line-height: 1.7; margin: 0 0 20px;">
          ${crew.name},<br/><br/>
          Your absence from active duty has been noted by Fleet Command.
          You are currently assigned to an active mission and your status is unaccounted for.<br/><br/>
          Report your status immediately via the ship forum or risk reassignment.
        </p>
        <p style="color: #555; font-size: 11px; border-top: 1px solid #333; padding-top: 12px;">
          <a href="https://www.astryxforge.com/forum" style="color: #cc3333;">Report to Duty →</a>
        </p>
      </div>
    `;

    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: crew.email,
          subject: `Status Request — ${crew.shipName ?? "Your Vessel"}`,
          html,
        }),
      });

      if (res.ok) {
        // Mark last recall sent to prevent duplicate within cooldown window
        await updateDoc(doc(db, "crew", crew.id), {
          lastRecallSent: Timestamp.now(),
        });
        notified++;
      }
    } catch (err) {
      console.error(`[inactivity-recall] Failed for ${crew.email}:`, err);
    }
  }

  return { notified };
}
