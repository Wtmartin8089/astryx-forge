/**
 * Starfleet Personnel Messaging API
 *
 * POST /api/messages  — Send a message between characters
 * GET  /api/messages?to=<crewSlug>  — Retrieve messages sent to a character
 *
 * Uses the Firebase REST API to communicate with Firestore without requiring
 * firebase-admin or a service account in the serverless environment.
 */

const PROJECT_ID = "startrekrpg-40ef7";
const API_KEY = process.env.FIREBASE_API_KEY || "AIzaSyDk-2Dh6xr2G4_pu7RCaFnglSL_p83DXfg";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/** Convert a Firestore REST document to a plain JS object */
function firestoreDocToObject(doc) {
  const fields = doc.fields || {};
  const result = { id: doc.name.split("/").pop() };
  for (const [key, val] of Object.entries(fields)) {
    if (val.stringValue !== undefined) result[key] = val.stringValue;
    else if (val.timestampValue !== undefined) result[key] = val.timestampValue;
    else if (val.integerValue !== undefined) result[key] = Number(val.integerValue);
    else if (val.booleanValue !== undefined) result[key] = val.booleanValue;
    else result[key] = null;
  }
  return result;
}

/** Build a Firestore REST field value */
function toFirestoreValue(value) {
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "number") return { integerValue: String(value) };
  if (typeof value === "boolean") return { booleanValue: value };
  return { nullValue: null };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  // ── POST: Send a message ──────────────────────────────────────────────────
  if (req.method === "POST") {
    const { fromCharacter, toCharacter, message, stardate } = req.body || {};

    if (!fromCharacter || !toCharacter || !message) {
      return res.status(400).json({ error: "fromCharacter, toCharacter, and message are required." });
    }

    const now = new Date().toISOString();

    const body = {
      fields: {
        fromCharacter: toFirestoreValue(fromCharacter),
        toCharacter: toFirestoreValue(toCharacter),
        message: toFirestoreValue(message),
        stardate: toFirestoreValue(stardate || ""),
        createdAt: { timestampValue: now },
      },
    };

    try {
      const response = await fetch(
        `${FIRESTORE_BASE}/character_messages?key=${API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        return res.status(500).json({ error: "Firestore write failed.", detail: err });
      }

      const doc = await response.json();
      return res.status(201).json({ success: true, id: doc.name.split("/").pop() });
    } catch (err) {
      return res.status(500).json({ error: "Internal server error.", detail: String(err) });
    }
  }

  // ── GET: Retrieve messages for a character ────────────────────────────────
  if (req.method === "GET") {
    const { to } = req.query;

    if (!to) {
      return res.status(400).json({ error: "Query parameter 'to' (crewSlug) is required." });
    }

    const queryBody = {
      structuredQuery: {
        from: [{ collectionId: "character_messages" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "toCharacter" },
            op: "EQUAL",
            value: { stringValue: to },
          },
        },
        orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
        limit: 50,
      },
    };

    try {
      const response = await fetch(
        `${FIRESTORE_BASE}:runQuery?key=${API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(queryBody),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        return res.status(500).json({ error: "Firestore query failed.", detail: err });
      }

      const results = await response.json();
      const messages = results
        .filter((r) => r.document)
        .map((r) => firestoreDocToObject(r.document));

      return res.status(200).json({ messages });
    } catch (err) {
      return res.status(500).json({ error: "Internal server error.", detail: String(err) });
    }
  }

  return res.status(405).json({ error: "Method not allowed." });
}
