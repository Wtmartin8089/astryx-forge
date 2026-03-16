import { useState, useEffect } from "react";
import { collection, query, orderBy, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

type Transmission = {
  id: string;
  author: string;
  rank: string;
  location: string;
  title: string;
  message: string;
  stardate: number;
  timestamp: number;
  targetShip: string;
  priority?: "urgent" | "command" | "standard";
  // legacy field from older records
  sender?: string;
};

type Props = {
  /** When provided, shows global (*) + ship-targeted transmissions.
   *  When omitted, shows only global transmissions. */
  shipName?: string;
  /** Maximum number of transmissions to show (default: no limit) */
  limit?: number;
};

const PRIORITY_COLOR: Record<string, string> = {
  urgent:   "#FF4444",
  command:  "#F5B942",
  standard: "#8AAAD0",
};

const FleetTransmissions = ({ shipName, limit }: Props) => {
  const [transmissions, setTransmissions] = useState<Transmission[]>([]);

  useEffect(() => {
    const targets = ["*"];
    if (shipName) targets.push(shipName);

    const q = query(
      collection(db, "fleet_transmissions"),
      where("targetShip", "in", targets),
      orderBy("timestamp", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      let docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transmission));
      if (limit) docs = docs.slice(0, limit);
      setTransmissions(docs);
    });

    return () => unsub();
  }, [shipName, limit]);

  if (transmissions.length === 0) return null;

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <span style={{
          backgroundColor: "#F5B94220",
          border: "1px solid #F5B942",
          borderRadius: "20px",
          color: "#F5B942",
          fontSize: "0.65rem",
          fontFamily: "'Orbitron', sans-serif",
          letterSpacing: "2px",
          padding: "0.2rem 0.75rem",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}>
          Fleet Command
        </span>
        <div style={{ flex: 1, height: "1px", backgroundColor: "#F5B94230" }} />
      </div>

      {transmissions.map((tx) => {
        const priorityColor = PRIORITY_COLOR[tx.priority || "standard"];
        const displayAuthor = tx.author || tx.sender || "Starfleet Command";

        return (
          <div key={tx.id} style={{
            backgroundColor: "#0D1E0D",
            border: "1px solid #F5B94240",
            borderLeft: `3px solid ${priorityColor}`,
            borderRadius: "4px",
            padding: "1rem 1.25rem",
            marginBottom: "0.75rem",
            fontFamily: "'Orbitron', sans-serif",
          }}>
            {/* Header row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.3rem", flexWrap: "wrap", gap: "0.4rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                <span style={{ color: "#F5B942", fontSize: "0.65rem", letterSpacing: "2px", textTransform: "uppercase" }}>
                  Starfleet Command Transmission
                </span>
                {tx.priority && tx.priority !== "standard" && (
                  <span style={{ color: priorityColor, fontSize: "0.6rem", letterSpacing: "1.5px", textTransform: "uppercase" }}>
                    [{tx.priority}]
                  </span>
                )}
              </div>
              <span style={{ color: "#555", fontSize: "0.68rem", whiteSpace: "nowrap" }}>
                SD {tx.stardate}
              </span>
            </div>

            {/* Title */}
            <p style={{ color: "#F5B942", fontSize: "0.82rem", fontWeight: "bold", margin: "0.3rem 0 0.6rem", letterSpacing: "1px" }}>
              {tx.title}
            </p>

            {/* Message body */}
            <p style={{ color: "#C8D8F0", margin: "0 0 0.75rem", fontSize: "0.88rem", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {tx.message}
            </p>

            {/* Signature */}
            <div style={{ borderTop: "1px solid #F5B94220", paddingTop: "0.6rem" }}>
              <span style={{ color: "#888", fontSize: "0.72rem", fontStyle: "italic" }}>
                — {displayAuthor}
              </span>
              {tx.location && (
                <span style={{ color: "#555", fontSize: "0.68rem", marginLeft: "0.5rem" }}>
                  · {tx.location}
                </span>
              )}
            </div>
          </div>
        );
      })}

      <div style={{ height: "1px", backgroundColor: "#F5B94220", marginBottom: "1.25rem" }} />
    </div>
  );
};

export default FleetTransmissions;
