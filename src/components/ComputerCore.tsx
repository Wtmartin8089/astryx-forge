import { FormEvent, useMemo, useState } from "react";
import styles from "../../styles/lcars.module.css";

type ConsoleEntry = {
  role: "user" | "computer";
  text: string;
  at: string;
};

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
      const res = await fetch("/api/computerCommand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: cmd,
          shipId: shipId.trim() || "starbase",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Computer command failed.");
      }

      setEntries((prev) => [
        ...prev,
        {
          role: "computer",
          text: data?.response || "No response returned.",
          at: nowTime(),
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
            <span style={{ fontSize: 11 }}>Context Memory: Active</span>
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
                  whiteSpace: "pre-wrap",
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
                {entry.text}
              </div>
            ))}
          </div>

          <form onSubmit={submit} style={{ borderTop: "1px solid #1e3a5f", padding: 10, display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='Try: "scan anomaly", then "analyze it"'
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
              {busy ? "Running" : "Send"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
