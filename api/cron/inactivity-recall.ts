import type { VercelRequest, VercelResponse } from "@vercel/node";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { Resend } from "resend";

/* ── Firebase Admin — initialize once ── */
function getDb() {
  if (!getApps().length) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccount) throw new Error("FIREBASE_SERVICE_ACCOUNT env var is not set");
    initializeApp({ credential: cert(JSON.parse(serviceAccount)) });
  }
  return getFirestore();
}

const resend = new Resend(process.env.RESEND_API_KEY);

const INACTIVE_DAYS = 4;
const RECALL_COOLDOWN_DAYS = 3;

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  /* ── Protect route with a secret token ── */
  const token = req.headers["x-cron-secret"] ?? req.query.secret;
  if (token !== process.env.CRON_SECRET) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  console.log("[inactivity-recall] Cron job started");

  try {
    const db = getDb();

    /* ── Find ships with active missions ── */
    const missionsSnap = await db
      .collection("missions")
      .where("status", "==", "active")
      .get();

    const activeShipIds = new Set<string>();
    missionsSnap.forEach((d) => {
      const shipId = d.data().shipId;
      if (shipId) activeShipIds.add(shipId);
    });

    if (activeShipIds.size === 0) {
      console.log("[inactivity-recall] No active missions — nothing to do");
      return res.status(200).json({ success: true, notified: 0, reason: "No active missions" });
    }

    /* ── Fetch active crew ── */
    const crewSnap = await db
      .collection("crew")
      .where("status", "==", "active")
      .get();

    const inactivityCutoff = Timestamp.fromDate(daysAgo(INACTIVE_DAYS));
    const recallCooldown = Timestamp.fromDate(daysAgo(RECALL_COOLDOWN_DAYS));

    const toNotify: Array<{ ref: FirebaseFirestore.DocumentReference; email: string; name: string; shipName: string }> = [];

    crewSnap.forEach((d) => {
      const data = d.data();

      if (!activeShipIds.has(data.shipId)) return;
      if (!data.ownerEmail) return;

      const lastPost: Timestamp | null = data.lastPost ?? null;
      if (lastPost && lastPost.toMillis() > inactivityCutoff.toMillis()) return;

      const lastRecall: Timestamp | null = data.lastRecallSent ?? null;
      if (lastRecall && lastRecall.toMillis() > recallCooldown.toMillis()) return;

      toNotify.push({
        ref: d.ref,
        email: data.ownerEmail,
        name: data.name || "Officer",
        shipName: data.shipName || "your vessel",
      });
    });

    console.log(`[inactivity-recall] ${toNotify.length} crew member(s) to notify`);

    let notified = 0;
    for (const crew of toNotify) {
      const html = `
        <div style="font-family: monospace; background: #0a0a0a; color: #e0e0e0; padding: 24px; border-left: 4px solid #cc3333; max-width: 600px;">
          <p style="color: #cc3333; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 8px;">
            ⚠ Status Request — ${crew.shipName}
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
        await resend.emails.send({
          from: "Fleet Command <command@astryxforge.com>",
          to: crew.email,
          subject: `Status Request — ${crew.shipName}`,
          html,
        });
        await crew.ref.update({ lastRecallSent: Timestamp.now() });
        notified++;
        console.log(`[inactivity-recall] Sent recall to ${crew.email}`);
      } catch (err) {
        console.error(`[inactivity-recall] Failed for ${crew.email}:`, err);
      }
    }

    console.log(`[inactivity-recall] Done — notified ${notified}/${toNotify.length}`);
    return res.status(200).json({ success: true, notified, total: toNotify.length });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[inactivity-recall] Fatal error:", err);
    return res.status(500).json({ success: false, error: message });
  }
}
