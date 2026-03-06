import { useState } from "react";

export interface GeneratedCampaign {
  campaignName: string;
  synopsis: string;
  startingMission: string;
  primaryThreat: string;
}

interface Props {
  worldType: string | null;
  onGenerate: (data: GeneratedCampaign) => void;
}

export default function AIGenerateCampaign({ worldType, onGenerate }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedCampaign | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/generateCampaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ worldType: worldType ?? "fleet-command" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed.");
      setResult(data as GeneratedCampaign);
      onGenerate(data as GeneratedCampaign);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.wrapper}>
      {/* Divider */}
      <div style={s.divider}>
        <span style={s.dividerLine} />
        <span style={s.dividerText}>or</span>
        <span style={s.dividerLine} />
      </div>

      {/* Generate button */}
      <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} onClick={generate} disabled={loading}>
        {loading ? (
          <span style={s.loadingRow}>
            <Spinner />
            Generating campaign idea...
          </span>
        ) : (
          <span style={s.btnRow}>
            <span style={s.sparkle}>✦</span>
            Generate Campaign Idea
          </span>
        )}
      </button>

      {/* Error */}
      {error && <p style={s.error}>{error}</p>}

      {/* Preview card — shown after generation so GM can review before accepting */}
      {result && !loading && (
        <div style={s.preview}>
          <p style={s.previewHeading}>AI Generated — fields have been populated above. Edit freely.</p>
          <PreviewRow label="Name"             value={result.campaignName} />
          <PreviewRow label="Synopsis"         value={result.synopsis} />
          <PreviewRow label="Starting Mission" value={result.startingMission} />
          <PreviewRow label="Primary Threat"   value={result.primaryThreat} />
          <button style={s.regenBtn} onClick={generate}>
            ↻ Regenerate
          </button>
        </div>
      )}
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={pr.row}>
      <span style={pr.label}>{label}</span>
      <span style={pr.value}>{value}</span>
    </div>
  );
}

function Spinner() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 14,
        height: 14,
        border: "2px solid #F5B94240",
        borderTop: "2px solid #F5B942",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    marginTop: "0.25rem",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#1E3A5F",
    display: "block",
  },
  dividerText: {
    color: "#3A5A80",
    fontSize: "0.75rem",
    fontFamily: "Orbitron,sans-serif",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    flexShrink: 0,
  },
  btn: {
    background: "linear-gradient(135deg, #1A3050, #1E3A5F)",
    border: "1px solid #F5B94250",
    color: "#F5B942",
    borderRadius: "6px",
    padding: "0.75rem 1.5rem",
    cursor: "pointer",
    fontFamily: "Orbitron,sans-serif",
    fontSize: "0.78rem",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    width: "100%",
    transition: "opacity 0.2s, border-color 0.2s",
  },
  btnRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
  },
  loadingRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.6rem",
  },
  sparkle: {
    fontSize: "1rem",
  },
  error: {
    color: "#FF6A2B",
    fontSize: "0.82rem",
    background: "#FF6A2B18",
    border: "1px solid #FF6A2B40",
    borderRadius: "6px",
    padding: "0.6rem 0.9rem",
    margin: 0,
  },
  preview: {
    backgroundColor: "#07152B",
    border: "1px solid #F5B94230",
    borderRadius: "8px",
    padding: "1rem 1.1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  previewHeading: {
    color: "#F5B942",
    fontFamily: "Orbitron,sans-serif",
    fontSize: "0.65rem",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    margin: "0 0 0.5rem",
  },
  regenBtn: {
    background: "none",
    border: "1px solid #1E3A5F",
    color: "#8AAAD0",
    borderRadius: "4px",
    padding: "0.4rem 0.75rem",
    cursor: "pointer",
    fontFamily: "Orbitron,sans-serif",
    fontSize: "0.68rem",
    letterSpacing: "1px",
    alignSelf: "flex-start",
    marginTop: "0.25rem",
  },
};

const pr: Record<string, React.CSSProperties> = {
  row:   { display: "flex", flexDirection: "column", gap: "0.15rem", paddingBottom: "0.5rem", borderBottom: "1px solid #1E3A5F" },
  label: { color: "#4A6A90", fontFamily: "Orbitron,sans-serif", fontSize: "0.62rem", letterSpacing: "1px", textTransform: "uppercase" },
  value: { color: "#C8D8F0", fontSize: "0.85rem", lineHeight: 1.5 },
};
