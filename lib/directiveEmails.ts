import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../src/firebase/firebaseConfig";

interface NotifyDirectiveCrewOptions {
  shipId: string;
  shipName: string;
  directiveTitle: string;
  directiveContent: string;
  authorName: string;
  authorRank?: string;
}

/**
 * Query crew assigned to a ship, filter to active members with email,
 * and send them a fleet directive notification.
 */
export async function notifyDirectiveCrew({
  shipId,
  shipName,
  directiveTitle,
  directiveContent,
  authorName,
  authorRank,
}: NotifyDirectiveCrewOptions): Promise<void> {
  // Query crew on this ship
  const q = query(
    collection(db, "crew"),
    where("shipId", "==", shipId),
    where("status", "==", "active"),
  );
  const snapshot = await getDocs(q);

  const emails: string[] = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data.ownerEmail && typeof data.ownerEmail === "string") {
      emails.push(data.ownerEmail);
    }
  });

  if (emails.length === 0) return;

  const issuedBy = authorRank ? `${authorName} — ${authorRank}` : authorName;
  const html = `
    <div style="font-family: monospace; background: #0a0a0a; color: #e0e0e0; padding: 24px; border-left: 4px solid #ff9900; max-width: 600px;">
      <p style="color: #ff9900; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 8px;">
        ⚡ Fleet Directive — ${shipName}
      </p>
      <p style="color: #aaa; font-size: 13px; margin: 0 0 16px;">Issued by ${issuedBy}</p>
      <p style="color: #F5B942; font-size: 15px; font-weight: bold; margin: 0 0 12px;">
        SUBJECT: ${directiveTitle}
      </p>
      <p style="color: #ccc; font-size: 14px; line-height: 1.7; white-space: pre-wrap; margin: 0 0 24px;">
        ${directiveContent}
      </p>
      <p style="color: #555; font-size: 11px; border-top: 1px solid #333; padding-top: 12px;">
        Report to your station and acknowledge receipt via the ship forum.<br/>
        <a href="https://www.astryxforge.com/forum" style="color: #ff9900;">Open Ship Forum →</a>
      </p>
    </div>
  `;

  await fetch("/api/notify-directive", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      emails,
      subject: `Fleet Directive — ${shipName}`,
      html,
    }),
  });
}
