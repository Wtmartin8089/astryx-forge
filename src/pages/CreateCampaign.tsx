import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../firebase/firebaseConfig";
import { STARSHIP_CLASSES } from "../data/starshipClasses";
import AIGenerateCampaign, { type GeneratedCampaign } from "../components/AIGenerateCampaign";

// ─── Types ────────────────────────────────────────────────────────────────────

type Visibility = "private" | "invite-only" | "public";
type WorldType = "fleet-command" | "dark-nights" | "galactic-conflict" | "fantasy-realms" | null;

interface CampaignForm {
  name: string;
  description: string;
  visibility: Visibility;
}

interface UnitForm {
  name: string;
  shipClass: string;
  missionType: string;
}

// ─── World Cards Data ─────────────────────────────────────────────────────────

const WORLDS: { id: WorldType; label: string; desc: string; active: boolean }[] = [
  { id: "fleet-command",     label: "Fleet Command",     desc: "Starship exploration campaigns.",          active: true  },
  { id: "dark-nights",       label: "Dark Nights",       desc: "Urban gothic vampire campaigns.",          active: false },
  { id: "galactic-conflict", label: "Galactic Conflict", desc: "Space opera faction warfare.",             active: false },
  { id: "fantasy-realms",    label: "Fantasy Realms",    desc: "Classic fantasy adventure campaigns.",     active: false },
];

const MISSION_TYPES = ["Exploration", "Combat Patrol", "Diplomatic Mission", "Scientific Survey", "Covert Operation"];

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div style={si.row}>
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <div key={n} style={si.item}>
            <div
              style={{
                ...si.circle,
                background: done ? "#F5B942" : active ? "linear-gradient(135deg,#F5B942,#FF6A2B)" : "#1E3A5F",
                color: done || active ? "#0B1E3A" : "#4A6A90",
                boxShadow: active ? "0 0 12px #F5B94260" : "none",
              }}
            >
              {done ? "✓" : n}
            </div>
            {i < total - 1 && (
              <div style={{ ...si.line, background: done ? "#F5B942" : "#1E3A5F" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

const si: Record<string, React.CSSProperties> = {
  row:    { display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: "2.5rem" },
  item:   { display: "flex", alignItems: "center" },
  circle: { width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Orbitron,sans-serif", fontSize: "0.8rem", fontWeight: 700, transition: "all 0.2s" },
  line:   { width: 60, height: 2, transition: "background 0.2s" },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CreateCampaign() {
  const navigate = useNavigate();
  const auth = getAuth();

  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 4;

  const [campaign, setCampaign] = useState<CampaignForm>({
    name: "",
    description: "",
    visibility: "private",
  });

  const [worldType, setWorldType] = useState<WorldType>(null);
  const [unit, setUnit] = useState<UnitForm>({ name: "", shipClass: "", missionType: "Exploration" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Navigation ──
  const canAdvance = (): boolean => {
    if (step === 1) return campaign.name.trim().length > 0;
    if (step === 2) return worldType !== null;
    if (step === 3) return unit.name.trim().length > 0 && unit.shipClass.length > 0;
    return true;
  };

  const next = () => { if (canAdvance()) setStep((s) => Math.min(s + 1, TOTAL_STEPS)); };
  const back = () => setStep((s) => Math.max(s - 1, 1));

  // ── Submit ──
  const handleCreate = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("You must be logged in to create a campaign.");

      const campaignId = crypto.randomUUID();
      const unitId = crypto.randomUUID();

      await setDoc(doc(collection(db, "campaigns"), campaignId), {
        campaignId,
        name: campaign.name.trim(),
        description: campaign.description.trim(),
        worldType,
        gmId: user.uid,
        visibility: campaign.visibility,
        createdAt: serverTimestamp(),
      });

      await setDoc(doc(collection(db, "campaignUnits"), unitId), {
        unitId,
        campaignId,
        name: unit.name.trim(),
        shipClass: unit.shipClass,
        missionType: unit.missionType,
        type: "Starship",
        createdAt: serverTimestamp(),
      });

      navigate("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render steps ──
  const stepTitles = ["Campaign Info", "Choose World", "Create Unit", "Review"];

  return (
    <div style={s.page}>
      <div style={s.card}>
        {/* Header */}
        <div style={s.cardHeader}>
          <h1 style={s.title}>Create Campaign</h1>
          <p style={s.stepLabel}>Step {step} of {TOTAL_STEPS} — {stepTitles[step - 1]}</p>
        </div>

        <StepIndicator current={step} total={TOTAL_STEPS} />

        {/* ── Step 1: Campaign Info ── */}
        {step === 1 && (
          <div style={s.stepBody}>
            <label style={s.label}>Campaign Name *</label>
            <input
              style={s.input}
              placeholder="e.g. Operation Deep Space"
              value={campaign.name}
              onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
              maxLength={80}
            />

            <label style={s.label}>Description</label>
            <textarea
              style={{ ...s.input, height: 100, resize: "vertical" }}
              placeholder="Describe the campaign setting, tone, and goals..."
              value={campaign.description}
              onChange={(e) => setCampaign({ ...campaign, description: e.target.value })}
              maxLength={500}
            />

            <label style={s.label}>Visibility</label>
            <select
              style={s.input}
              value={campaign.visibility}
              onChange={(e) => setCampaign({ ...campaign, visibility: e.target.value as Visibility })}
            >
              <option value="private">Private</option>
              <option value="invite-only">Invite Only</option>
              <option value="public">Public</option>
            </select>

            <AIGenerateCampaign
              worldType={worldType}
              onGenerate={(data: GeneratedCampaign) => {
                setCampaign((prev) => ({
                  ...prev,
                  name: data.campaignName,
                  description: `${data.synopsis}\n\nStarting Mission: ${data.startingMission}\n\nPrimary Threat: ${data.primaryThreat}`,
                }));
              }}
            />
          </div>
        )}

        {/* ── Step 2: World Type ── */}
        {step === 2 && (
          <div style={s.stepBody}>
            <p style={s.hint}>Select the world module for your campaign.</p>
            <div style={s.worldGrid}>
              {WORLDS.map((w) => (
                <button
                  key={w.id}
                  style={{
                    ...s.worldCard,
                    borderColor: worldType === w.id ? "#F5B942" : "#1E3A5F",
                    boxShadow: worldType === w.id ? "0 0 16px #F5B94240" : "none",
                    opacity: w.active ? 1 : 0.5,
                    cursor: w.active ? "pointer" : "not-allowed",
                  }}
                  onClick={() => w.active && setWorldType(w.id)}
                >
                  <span style={s.worldLabel}>{w.label}</span>
                  {!w.active && (
                    <span style={s.worldBadge}>Coming Soon</span>
                  )}
                  <span style={s.worldDesc}>{w.desc}</span>
                  {worldType === w.id && <span style={s.worldCheck}>✓ Selected</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 3: Unit Creation ── */}
        {step === 3 && (
          <div style={s.stepBody}>
            {worldType === "fleet-command" && (
              <>
                <p style={s.hint}>This starship will be your campaign's primary unit.</p>

                <label style={s.label}>Starship Name *</label>
                <input
                  style={s.input}
                  placeholder="e.g. USS Horizon"
                  value={unit.name}
                  onChange={(e) => setUnit({ ...unit, name: e.target.value })}
                  maxLength={60}
                />

                <label style={s.label}>Ship Class *</label>
                <select
                  style={s.input}
                  value={unit.shipClass}
                  onChange={(e) => setUnit({ ...unit, shipClass: e.target.value })}
                >
                  <option value="">— Select a class —</option>
                  {STARSHIP_CLASSES.map((sc) => (
                    <option key={sc.name} value={sc.name}>
                      {sc.name} — {sc.role}
                    </option>
                  ))}
                </select>

                <label style={s.label}>Mission Type</label>
                <select
                  style={s.input}
                  value={unit.missionType}
                  onChange={(e) => setUnit({ ...unit, missionType: e.target.value })}
                >
                  {MISSION_TYPES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </>
            )}
          </div>
        )}

        {/* ── Step 4: Review ── */}
        {step === 4 && (
          <div style={s.stepBody}>
            <p style={s.hint}>Review your campaign before creating it.</p>

            <div style={s.reviewCard}>
              <ReviewRow label="Campaign Name" value={campaign.name} />
              <ReviewRow label="Description"   value={campaign.description || "—"} />
              <ReviewRow label="Visibility"    value={{ private: "Private", "invite-only": "Invite Only", public: "Public" }[campaign.visibility]} />
              <ReviewRow label="World"         value={WORLDS.find((w) => w.id === worldType)?.label ?? "—"} />
              <ReviewRow label="Unit Name"     value={unit.name} />
              <ReviewRow label="Ship Class"    value={unit.shipClass} />
              <ReviewRow label="Mission Type"  value={unit.missionType} />
            </div>

            {error && <p style={s.error}>{error}</p>}
          </div>
        )}

        {/* ── Footer nav ── */}
        <div style={s.footer}>
          {step > 1 && (
            <button style={s.btnBack} onClick={back} disabled={submitting}>
              ← Back
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < TOTAL_STEPS ? (
            <button
              style={{ ...s.btnNext, opacity: canAdvance() ? 1 : 0.4, cursor: canAdvance() ? "pointer" : "not-allowed" }}
              onClick={next}
              disabled={!canAdvance()}
            >
              Next →
            </button>
          ) : (
            <button
              style={{ ...s.btnCreate, opacity: submitting ? 0.6 : 1 }}
              onClick={handleCreate}
              disabled={submitting}
            >
              {submitting ? "Creating..." : "Create Campaign"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Review Row Helper ────────────────────────────────────────────────────────

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={rr.row}>
      <span style={rr.label}>{label}</span>
      <span style={rr.value}>{value}</span>
    </div>
  );
}

const rr: Record<string, React.CSSProperties> = {
  row:   { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "0.65rem 0", borderBottom: "1px solid #1E3A5F", gap: "1rem" },
  label: { color: "#F5B942", fontFamily: "Orbitron,sans-serif", fontSize: "0.7rem", letterSpacing: "1px", textTransform: "uppercase", flexShrink: 0 },
  value: { color: "#C8D8F0", fontSize: "0.9rem", textAlign: "right" },
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: {
    backgroundColor: "#0B1E3A",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem 1rem",
    fontFamily: "'Segoe UI', sans-serif",
  },
  card: {
    backgroundColor: "#0D2240",
    border: "1px solid #1E3A5F",
    borderRadius: "12px",
    padding: "2.5rem",
    width: "100%",
    maxWidth: "640px",
    boxShadow: "0 8px 40px #00000060",
  },
  cardHeader: {
    textAlign: "center",
    marginBottom: "1.75rem",
  },
  title: {
    fontFamily: "Orbitron,sans-serif",
    fontSize: "1.6rem",
    fontWeight: 900,
    background: "linear-gradient(135deg,#F5B942,#FF6A2B)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: "3px",
    marginBottom: "0.3rem",
  },
  stepLabel: {
    color: "#4A6A90",
    fontFamily: "Orbitron,sans-serif",
    fontSize: "0.72rem",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
  },
  stepBody: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    minHeight: 220,
  },
  hint: {
    color: "#8AAAD0",
    fontSize: "0.9rem",
    margin: 0,
    lineHeight: 1.5,
  },
  label: {
    color: "#F5B942",
    fontFamily: "Orbitron,sans-serif",
    fontSize: "0.7rem",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#07152B",
    border: "1px solid #1E3A5F",
    borderRadius: "6px",
    color: "#C8D8F0",
    fontSize: "0.95rem",
    padding: "0.65rem 0.9rem",
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
    fontFamily: "'Segoe UI', sans-serif",
  },

  /* World cards */
  worldGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1rem",
  },
  worldCard: {
    backgroundColor: "#07152B",
    border: "2px solid",
    borderRadius: "8px",
    padding: "1.25rem 1rem",
    cursor: "pointer",
    textAlign: "left",
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  worldLabel: {
    fontFamily: "Orbitron,sans-serif",
    fontSize: "0.8rem",
    color: "#F5B942",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
  },
  worldBadge: {
    fontSize: "0.65rem",
    color: "#4A6A90",
    fontFamily: "Orbitron,sans-serif",
    letterSpacing: "1px",
  },
  worldDesc: {
    color: "#8AAAD0",
    fontSize: "0.82rem",
    lineHeight: 1.4,
  },
  worldCheck: {
    color: "#F5B942",
    fontFamily: "Orbitron,sans-serif",
    fontSize: "0.7rem",
    marginTop: "0.25rem",
  },

  /* Review */
  reviewCard: {
    backgroundColor: "#07152B",
    border: "1px solid #1E3A5F",
    borderRadius: "8px",
    padding: "1rem 1.25rem",
  },

  /* Footer */
  footer: {
    display: "flex",
    alignItems: "center",
    marginTop: "2rem",
    paddingTop: "1.25rem",
    borderTop: "1px solid #1E3A5F",
    gap: "1rem",
  },
  btnBack: {
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
  btnNext: {
    background: "linear-gradient(135deg,#F5B942,#FF6A2B)",
    border: "none",
    color: "#0B1E3A",
    borderRadius: "6px",
    padding: "0.65rem 1.75rem",
    fontFamily: "Orbitron,sans-serif",
    fontWeight: 700,
    fontSize: "0.8rem",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    transition: "opacity 0.15s",
  },
  btnCreate: {
    background: "linear-gradient(135deg,#F5B942,#FF6A2B)",
    border: "none",
    color: "#0B1E3A",
    borderRadius: "6px",
    padding: "0.75rem 2rem",
    fontFamily: "Orbitron,sans-serif",
    fontWeight: 700,
    fontSize: "0.85rem",
    letterSpacing: "2px",
    textTransform: "uppercase",
    cursor: "pointer",
    transition: "opacity 0.15s",
  },
  error: {
    color: "#FF6A2B",
    fontSize: "0.85rem",
    background: "#FF6A2B18",
    border: "1px solid #FF6A2B40",
    borderRadius: "6px",
    padding: "0.65rem 1rem",
    margin: 0,
  },
};
