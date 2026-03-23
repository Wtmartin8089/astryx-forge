import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import styles from "../../styles/lcars.module.css";
import { getUserCrewRole } from "../utils/crewFirestore";
import { getAuthorizationLabel } from "../utils/permissions";

type QueryLink = { label: string; to: string };

type ConsoleEntry = {
  role: "user" | "computer";
  text: string;
  at: string;
  links?: QueryLink[];
};

// ── Intent detection ────────────────────────────────────────────────────────

function detectIntent(input: string): string {
  const s = input.toLowerCase();
  if (/\b(help|command|query|available|protocol)\b/.test(s)) return "help";
  if (/\b(status|online|system|core|diagnostic)\b/.test(s)) return "status";
  if (/\b(reference|regulation|law|order|article|charter|directive)\b/.test(s)) return "reference";
  if (/\b(crew|personnel|officer|roster|manifest|staff|captain|commander)\b/.test(s)) return "crew";
  if (/\b(mission|briefing|objective|assignment|operation|log)\b/.test(s)) return "mission";
  if (/\b(ship|vessel|registry|class|fleet)\b/.test(s)) return "ships";
  return "unknown";
}

// ── Firestore query handlers ─────────────────────────────────────────────────

async function queryCrewByShip(
  shipId: string,
): Promise<{ text: string; links: QueryLink[] }> {
  const snap = await getDocs(
    query(
      collection(db, "crew"),
      where("shipId", "==", shipId),
      where("status", "==", "active"),
    ),
  );
  if (snap.empty) {
    return {
      text: `COMPUTER — No active crew records found for vessel ${shipId.toUpperCase()}.\nConfirm ship designation and retry.`,
      links: [{ label: "Crew Roster", to: "/crew" }],
    };
  }
  const crew = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  crew.sort((a, b) => (a.rank ?? "").localeCompare(b.rank ?? ""));
  const lines = crew
    .map((c) => `  ${(c.rank || "—").padEnd(20)} ${c.name || "Unknown"} — ${c.position || "—"}`)
    .join("\n");
  return {
    text: `COMPUTER — CREW MANIFEST: ${shipId.toUpperCase()} (${crew.length} active)\n${lines}`,
    links: crew.slice(0, 6).map((c) => ({ label: c.name, to: `/crew/${c.id}` })),
  };
}

async function queryMissionsByShip(
  shipId: string,
): Promise<{ text: string; links: QueryLink[] }> {
  const snap = await getDocs(
    query(collection(db, "missions"), where("shipId", "==", shipId)),
  );
  if (snap.empty) {
    return {
      text: `COMPUTER — No mission assignments found for vessel ${shipId.toUpperCase()}.`,
      links: [{ label: "Mission Board", to: "/missions" }],
    };
  }
  const missions = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  const active = missions.filter((m) => m.status === "active");
  const other = missions.filter((m) => m.status !== "active");
  const fmtLine = (m: any) =>
    `  [${(m.status ?? "UNKNOWN").toUpperCase()}] ${m.title} — ${m.system ?? "Unknown System"}`;
  const lines = [...active, ...other].map(fmtLine).join("\n");
  return {
    text:
      `COMPUTER — MISSION DATA: ${shipId.toUpperCase()}\n` +
      `  Active Assignments: ${active.length} / Total: ${missions.length}\n` +
      lines,
    links: [{ label: "Mission Board", to: "/missions" }],
  };
}

async function queryFleet(): Promise<{ text: string; links: QueryLink[] }> {
  const snap = await getDocs(collection(db, "ships"));
  if (snap.empty) {
    return {
      text: "COMPUTER — Fleet registry unavailable. Database may require resync.",
      links: [{ label: "Fleet Registry", to: "/fleet" }],
    };
  }
  const ships = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  const lines = ships
    .map((s) => `  ${(s.registry ?? "—").padEnd(12)} ${s.name ?? "Unknown"} — ${s.class ?? "—"} class`)
    .join("\n");
  return {
    text: `COMPUTER — FLEET REGISTRY (${ships.length} vessels)\n${lines}`,
    links: [{ label: "Fleet Registry", to: "/fleet" }],
  };
}

async function processQuery(
  input: string,
  shipId: string,
): Promise<{ text: string; links?: QueryLink[] }> {
  const intent = detectIntent(input);

  if (intent === "help") {
    return {
      text: [
        "COMPUTER — AVAILABLE QUERY PROTOCOLS:",
        "  CREW / PERSONNEL  — crew manifest for current vessel",
        "  MISSION / BRIEFING — mission assignments for current vessel",
        "  SHIP / FLEET      — Federation fleet registry",
        "  REFERENCE / LAW   — Starfleet reference documents",
        "  STATUS            — computer core system status",
        "",
        "Set vessel context using the SHIP field above.",
      ].join("\n"),
    };
  }

  if (intent === "status") {
    return {
      text: [
        "COMPUTER — SYSTEM STATUS",
        `  Core Systems    : ONLINE`,
        `  Database        : VERIFIED`,
        `  Authorization   : ACTIVE`,
        `  Vessel Context  : ${shipId.toUpperCase() || "NOT SET"}`,
      ].join("\n"),
    };
  }

  if (intent === "reference") {
    return {
      text: [
        "COMPUTER — REFERENCE LIBRARY ACCESS",
        "  [DECLASSIFIED] Articles of the Federation — UFP Founding Charter",
        "  [RESTRICTED]   Starfleet General Orders — Pending Release",
        "  [RESTRICTED]   Federation Law Compendium — Pending Release",
      ].join("\n"),
      links: [
        { label: "Reference Library", to: "/reference" },
        { label: "Articles of the Federation", to: "/reference/articles-of-federation" },
      ],
    };
  }

  if (intent === "crew") return queryCrewByShip(shipId || "starbase");
  if (intent === "mission") return queryMissionsByShip(shipId || "starbase");
  if (intent === "ships") return queryFleet();

  return {
    text: "COMPUTER — Query pattern unrecognized.\nIssue HELP to display available query protocols.",
  };
}

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ComputerCore() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [entries, setEntries] = useState<ConsoleEntry[]>([
    {
      role: "computer",
      text: "Computer core online. Awaiting command.",
      at: nowTime(),
    },
  ]);

  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth();
    return auth.onAuthStateChanged(async (u) => {
      if (u) {
        const role = await getUserCrewRole(u.uid);
        setUserRole(role);
      } else {
        setUserRole(null);
      }
    });
  }, []);

  const defaultShip = useMemo(() => {
    return localStorage.getItem("currentShip") || "starbase";
  }, []);
  const [shipId, setShipId] = useState(defaultShip);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd || busy) return;

    setEntries((prev) => [...prev, { role: "user", text: cmd, at: nowTime() }]);
    setInput("");
    setBusy(true);

    try {
      const result = await processQuery(cmd, shipId.trim() || "starbase");
      setEntries((prev) => [
        ...prev,
        {
          role: "computer",
          text: result.text,
          at: nowTime(),
          links: result.links,
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown computer core fault.";
      setEntries((prev) => [
        ...prev,
        {
          role: "computer",
          text: `COMPUTER ERROR: ${msg}`,
          at: nowTime(),
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className={styles.computerCoreButton}>
        <button onClick={() => setOpen((v) => !v)}>
          {open ? "Close Computer" : "Computer Core"}
        </button>
      </div>

      {open && (
        <div
          style={{
            position: "fixed",
            right: 20,
            bottom: 88,
            width: "min(560px, calc(100vw - 32px))",
            maxHeight: "70vh",
            background: "#070d1a",
            border: "2px solid #f5b942",
            borderRadius: 10,
            boxShadow: "0 10px 30px rgba(0,0,0,0.55)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 1100,
          }}
        >
          <div
            style={{
              background: "linear-gradient(90deg,#f5b942,#ff6a2b)",
              color: "#111",
              padding: "8px 12px",
              fontWeight: 700,
              letterSpacing: 1,
              fontSize: 12,
              textTransform: "uppercase",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>Starfleet Computer Terminal</span>
            <span style={{ fontSize: 10, color: "#8aaad0" }}>
              {getAuthorizationLabel(userRole)}
            </span>
          </div>

          <div
            style={{
              padding: "10px 12px",
              borderBottom: "1px solid #1e3a5f",
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <label style={{ fontSize: 11, color: "#8aaad0", textTransform: "uppercase", letterSpacing: 1 }}>
              Ship
            </label>
            <input
              value={shipId}
              onChange={(e) => {
                const next = e.target.value;
                setShipId(next);
                localStorage.setItem("currentShip", next);
              }}
              style={{
                background: "#0b1e3a",
                border: "1px solid #1e3a5f",
                color: "#c8d8f0",
                borderRadius: 4,
                padding: "5px 8px",
                fontSize: 12,
                width: 170,
              }}
            />
          </div>

          <div
            style={{
              padding: 12,
              overflowY: "auto",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              background: "#030812",
            }}
          >
            {entries.map((entry, idx) => (
              <div
                key={`${entry.at}-${idx}`}
                style={{
                  border: `1px solid ${entry.role === "user" ? "#335d88" : "#3c6b3f"}`,
                  background: entry.role === "user" ? "#0b1e3a" : "#122812",
                  color: "#d8e4f5",
                  borderRadius: 6,
                  padding: "8px 10px",
                  fontSize: 13,
                  lineHeight: 1.35,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    color: "#8aaad0",
                  }}
                >
                  <span>{entry.role === "user" ? "Officer" : "Computer"}</span>
                  <span>{entry.at}</span>
                </div>
                <div style={{ whiteSpace: "pre-wrap" }}>{entry.text}</div>
                {entry.links && entry.links.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, borderTop: "1px solid #1e3a5f", paddingTop: 8 }}>
                    {entry.links.map((lnk) => (
                      <Link
                        key={lnk.to}
                        to={lnk.to}
                        style={{
                          backgroundColor: "#0b2240",
                          border: "1px solid #335d88",
                          borderRadius: 4,
                          color: "#6699cc",
                          fontSize: 10,
                          fontFamily: "'Orbitron', sans-serif",
                          letterSpacing: 1,
                          padding: "3px 8px",
                          textDecoration: "none",
                          textTransform: "uppercase",
                        }}
                      >
                        {lnk.label} ›
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={submit} style={{ borderTop: "1px solid #1e3a5f", padding: 10, display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='Query: crew, mission, ship, reference, status, help'
              style={{
                flex: 1,
                background: "#07152b",
                border: "1px solid #1e3a5f",
                color: "#c8d8f0",
                borderRadius: 6,
                padding: "8px 10px",
                fontSize: 13,
              }}
            />
            <button
              type="submit"
              disabled={busy}
              style={{
                background: "linear-gradient(135deg,#f5b942,#ff6a2b)",
                color: "#111",
                border: "none",
                borderRadius: 6,
                padding: "8px 12px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 1,
                cursor: busy ? "wait" : "pointer",
                opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? "Processing" : "Query"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
