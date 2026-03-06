import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../firebase/firebaseConfig";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MissionData {
  missionTitle: string;
  briefing: string;
  objective: string;
  complication: string;
  possibleOutcome: string;
}

interface Props {
  campaignId: string;
  onMissionAccepted?: (mission: MissionData) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AIGenerateMission({ campaignId, onMissionAccepted }: Props) {
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [mission, setMission]   = useState<MissionData | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [saved, setSaved]       = useState(false);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setMission(null);
    setSaved(false);
    setOpen(true);
    try {
      const res = await fetch("/api/ai/generateMission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Mission generation failed.");
      setMission(data as MissionData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const regenerate = () => generate();

  const accept = async () => {
    if (!mission) return;
    setSaving(true);
    try {
      const auth = getAuth();
      await addDoc(collection(db, "missions"), {
        ...mission,
        campaignId,
        status: "active",
        gmId: auth.currentUser?.uid ?? null,
        createdAt: serverTimestamp(),
      });
      setSaved(true);
      onMissionAccepted?.(mission);
    } catch (err) {
      setError("Failed to save mission. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setOpen(false);
    setMission(null);
    setError(null);
    setSaved(false);
  };

  return (
    <>
      {/* Trigger button */}
      <button style={s.triggerBtn} onClick={generate} disabled={loading}>
        <span style={s.btnRow}>
          <span>⚡</span>
          Generate Mission Event
        </span>
      </button>

      {/* Modal overlay */}
      {open && (
        <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && cancel()}>
          <div style={s.modal}>

            {/* Header */}
            <div style={s.modalHeader}>
              <span style={s.modalTitle}>Mission Briefing</span>
              <button style={s.closeBtn} onClick={cancel} aria-label="Close">✕</button>
            </div>

            {/* Loading */}
            {loading && (
              <div style={s.loadingBox}>
                <Spinner />
                <span style={s.loadingText}>Forging mission...</span>
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div style={s.errorBox}>
                <p style={s.errorText}>{error}</p>
                <button style={s.btnSecondary} onClick={regenerate}>Try Again</button>
              </div>
            )}

            {/* Mission card */}
            {mission && !loading && !saved && (
              <>
                <div style={s.missionCard}>
                  <h2 style={s.missionTitle}>{mission.missionTitle}</h2>

                  <MissionSection label="Briefing"         value={mission.briefing} />
                  <MissionSection label="Objective"        value={mission.objective} accent="#F5B942" />
                  <MissionSection label="Complication"     value={mission.complication} accent="#FF6A2B" />
                  <MissionSection label="Possible Outcome" value={mission.possibleOutcome} />
                </div>

                <div style={s.actionRow}>
                  <button style={s.btnAccept} onClick={accept} disabled={saving}>
                    {saving ? "Saving..." : "✓ Accept Mission"}
                  </button>
                  <button style={s.btnRegen} onClick={regenerate} disabled={saving}>
                    ↻ Regenerate
                  </button>
                  <button style={s.btnCancel} onClick={cancel} disabled={saving}>
                    Cancel
                  </button>
                </div>
              </>
            )}

            {/* Saved confirmation */}
            {saved && (
              <div style={s.savedBox}>
                <p style={s.savedTitle}>Mission Logged</p>
                <p style={s.savedDesc}>
                  <strong style={{ color: "#F5B942" }}>{mission?.missionTitle}</strong> has been
                  added to the campaign mission log.
                </p>
                <button style={s.btnAccept} onClick={cancel}>Close</button>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MissionSection({
  label,
  value,
  accent = "#8AAAD0",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div style={ms.section}>
      <span style={{ ...ms.label, color: accent }}>{label}</span>
      <p style={ms.value}>{value}</p>
    </div>
  );
}

function Spinner() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 18,
        height: 18,
        border: "2px solid #F5B94230",
        borderTop: "2px solid #F5B942",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }}
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  triggerBtn: {
    background: "linear-gradient(135deg,#F5B942,#FF6A2B)",
    border: "none",
    color: "#0B1E3A",
    borderRadius: "6px",
    padding: "0.7rem 1.5rem",
    cursor: "pointer",
    fontFamily: "Orbitron,sans-serif",
    fontWeight: 700,
    fontSize: "0.78rem",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
  },
  btnRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(7,21,43,0.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "1rem",
  },
  modal: {
    backgroundColor: "#0D2240",
    border: "1px solid #1E3A5F",
    borderRadius: "12px",
    width: "100%",
    maxWidth: 560,
    maxHeight: "90vh",
    overflowY: "auto",
    padding: "1.75rem",
    boxShadow: "0 16px 60px #00000080",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.25rem",
  },
  modalTitle: {
    fontFamily: "Orbitron,sans-serif",
    fontSize: "0.75rem",
    letterSpacing: "2.5px",
    textTransform: "uppercase",
    color: "#4A6A90",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#3A5A80",
    fontSize: "1rem",
    cursor: "pointer",
  },
  loadingBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1rem",
    padding: "3rem 0",
  },
  loadingText: {
    fontFamily: "Orbitron,sans-serif",
    fontSize: "0.8rem",
    letterSpacing: "2px",
    color: "#F5B942",
    textTransform: "uppercase",
  },
  errorBox: {
    textAlign: "center",
    padding: "2rem 0",
  },
  errorText: {
    color: "#FF6A2B",
    fontSize: "0.9rem",
    marginBottom: "1rem",
  },
  missionCard: {
    backgroundColor: "#07152B",
    border: "1px solid #1E3A5F",
    borderRadius: "8px",
    padding: "1.5rem",
    marginBottom: "1.25rem",
  },
  missionTitle: {
    fontFamily: "Orbitron,sans-serif",
    fontSize: "1.1rem",
    fontWeight: 900,
    background: "linear-gradient(135deg,#F5B942,#FF6A2B)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: "2px",
    marginBottom: "1.25rem",
  },
  actionRow: {
    display: "flex",
    gap: "0.75rem",
    flexWrap: "wrap",
  },
  btnAccept: {
    background: "linear-gradient(135deg,#F5B942,#FF6A2B)",
    border: "none",
    color: "#0B1E3A",
    borderRadius: "6px",
    padding: "0.65rem 1.5rem",
    cursor: "pointer",
    fontFamily: "Orbitron,sans-serif",
    fontWeight: 700,
    fontSize: "0.75rem",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
  },
  btnRegen: {
    background: "none",
    border: "1px solid #1E3A5F",
    color: "#8AAAD0",
    borderRadius: "6px",
    padding: "0.65rem 1.25rem",
    cursor: "pointer",
    fontFamily: "Orbitron,sans-serif",
    fontSize: "0.75rem",
    letterSpacing: "1px",
  },
  btnCancel: {
    background: "none",
    border: "1px solid #1E3A5F",
    color: "#4A6A90",
    borderRadius: "6px",
    padding: "0.65rem 1rem",
    cursor: "pointer",
    fontFamily: "Orbitron,sans-serif",
    fontSize: "0.75rem",
    letterSpacing: "1px",
  },
  btnSecondary: {
    background: "none",
    border: "1px solid #F5B942",
    color: "#F5B942",
    borderRadius: "6px",
    padding: "0.6rem 1.25rem",
    cursor: "pointer",
    fontFamily: "Orbitron,sans-serif",
    fontSize: "0.75rem",
    letterSpacing: "1px",
  },
  savedBox: {
    textAlign: "center",
    padding: "2rem 0",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.75rem",
  },
  savedTitle: {
    fontFamily: "Orbitron,sans-serif",
    fontSize: "1rem",
    color: "#F5B942",
    letterSpacing: "2px",
    textTransform: "uppercase",
  },
  savedDesc: {
    color: "#8AAAD0",
    fontSize: "0.9rem",
    lineHeight: 1.6,
    maxWidth: 360,
  },
};

const ms: Record<string, React.CSSProperties> = {
  section: {
    marginBottom: "1rem",
    paddingBottom: "1rem",
    borderBottom: "1px solid #1E3A5F",
  },
  label: {
    display: "block",
    fontFamily: "Orbitron,sans-serif",
    fontSize: "0.62rem",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    marginBottom: "0.3rem",
  },
  value: {
    color: "#C8D8F0",
    fontSize: "0.9rem",
    lineHeight: 1.65,
    margin: 0,
  },
};
