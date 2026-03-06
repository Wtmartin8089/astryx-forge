/**
 * ChooseCharacter.tsx
 *
 * Multi-step LCARS-styled "Choose Your Character" page for the Star Trek RPG site.
 *
 * Flow:
 *   Step 1 "pick-ship"    — Pick a ship (or starbase) from a 2-column grid.
 *   Step 2 "pick-crew"    — View available (unclaimed, active) crew on that ship;
 *                           claim one or create a new character.
 *   Step 3a "confirm-claim" — Read-only character detail; confirm or cancel.
 *   Step 3b "create-new"  — Form to create a new pending character.
 *
 * Usage:
 *   import ChooseCharacter from "./components/ChooseCharacter";
 *   // Add to App.tsx routes:
 *   <Route path="/choose-character" element={<ChooseCharacter />} />
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { getShips, RANKS } from "../utils/gameData";
import { subscribeToAllCrew, claimCharacter, createCharacter } from "../utils/crewFirestore";
import type { ShipData, CrewMember } from "../types/fleet";
import "../assets/lcars.css";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Step = "pick-ship" | "pick-crew" | "confirm-claim" | "create-new";

interface NewCharacterForm {
  name: string;
  species: string;
  rank: string;
  position: string;
  fitness: string;
  coordination: string;
  presence: string;
  intellect: string;
  psi: string;
  advantages: string[];
  disadvantages: string[];
  notes: string;
}

// ---------------------------------------------------------------------------
// Style helpers (mirrors CrewPage patterns)
// ---------------------------------------------------------------------------

const inputStyle = (accentColor: string): React.CSSProperties => ({
  backgroundColor: "#0a0a0a",
  border: `1px solid ${accentColor}40`,
  borderRadius: "4px",
  color: "#ccc",
  padding: "0.4rem 0.6rem",
  fontFamily: "'Orbitron', sans-serif",
  fontSize: "0.85rem",
  width: "100%",
  boxSizing: "border-box",
});

const selectStyle = (accentColor: string): React.CSSProperties => ({
  ...inputStyle(accentColor),
  cursor: "pointer",
});

const labelStyle: React.CSSProperties = {
  color: "#888",
  fontSize: "0.75rem",
  textTransform: "uppercase",
  letterSpacing: "1px",
  display: "block",
  marginBottom: "0.25rem",
};

const sectionHeaderStyle = (color: string): React.CSSProperties => ({
  color,
  fontSize: "0.85rem",
  letterSpacing: "2px",
  marginBottom: "0.75rem",
  textTransform: "uppercase",
  margin: 0,
  marginBottom: "0.75rem",
} as React.CSSProperties);

const panelStyle = (borderColor: string): React.CSSProperties => ({
  backgroundColor: "#111",
  border: `2px solid ${borderColor}`,
  borderRadius: "0 30px 0 0",
  padding: "1.5rem",
});

const pillStyle = (color: string): React.CSSProperties => ({
  backgroundColor: `${color}20`,
  border: `1px solid ${color}`,
  borderRadius: "20px",
  padding: "0.3rem 0.8rem",
  color,
  fontSize: "0.8rem",
  fontWeight: "bold",
  display: "flex",
  alignItems: "center",
  gap: "0.4rem",
});

const pillRemoveBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#cc3333",
  cursor: "pointer",
  fontFamily: "'Orbitron', sans-serif",
  fontSize: "0.9rem",
  fontWeight: "bold",
  lineHeight: 1,
  padding: "0",
};

const addBtnStyle = (color: string): React.CSSProperties => ({
  backgroundColor: color,
  border: "none",
  borderRadius: "4px",
  color: "#000",
  cursor: "pointer",
  fontFamily: "'Orbitron', sans-serif",
  fontSize: "0.75rem",
  fontWeight: "bold",
  letterSpacing: "1px",
  padding: "0.4rem 0.75rem",
  flexShrink: 0,
});

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** LCARS top header bar used across all steps. */
const LcarsHeader = ({
  title,
  subtitle,
  accentColor,
}: {
  title: string;
  subtitle?: string;
  accentColor: string;
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "stretch",
      marginBottom: "2rem",
      height: "50px",
    }}
  >
    <div
      style={{
        width: "20px",
        backgroundColor: accentColor,
        borderRadius: "20px 0 0 0",
      }}
    />
    <div
      style={{
        flex: 1,
        backgroundColor: accentColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 2rem",
      }}
    >
      <h1
        style={{
          margin: 0,
          color: "#000",
          fontSize: "1.4rem",
          fontWeight: "bold",
          letterSpacing: "3px",
          textTransform: "uppercase",
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <span
          style={{
            color: "#000",
            fontWeight: "bold",
            fontSize: "0.75rem",
            letterSpacing: "2px",
            opacity: 0.8,
          }}
        >
          {subtitle}
        </span>
      )}
    </div>
    <div
      style={{
        width: "20px",
        backgroundColor: accentColor,
        borderRadius: "0 20px 20px 0",
      }}
    />
  </div>
);

/** Reusable identity read-only row (mirrors CrewPage). */
const IdentityRow = ({ label, value }: { label: string; value: string }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0" }}>
    <span
      style={{
        color: "#888",
        fontSize: "0.8rem",
        textTransform: "uppercase",
        letterSpacing: "1px",
      }}
    >
      {label}
    </span>
    <span style={{ color: "#fff", fontSize: "0.9rem" }}>{value || "—"}</span>
  </div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const ChooseCharacter = () => {
  const navigate = useNavigate();
  const auth = getAuth();

  // --- Step state ---
  const [step, setStep] = useState<Step>("pick-ship");
  const [visible, setVisible] = useState(false);

  // --- Data ---
  const [ships, setShips] = useState<Record<string, ShipData>>({});
  const [allCrew, setAllCrew] = useState<Record<string, CrewMember>>({});

  // --- Selections ---
  const [selectedShipId, setSelectedShipId] = useState<string>("");
  const [selectedCrewId, setSelectedCrewId] = useState<string>("");

  // --- UI feedback ---
  const [claimError, setClaimError] = useState<string>("");
  const [claimLoading, setClaimLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // --- Create form state ---
  const [form, setForm] = useState<NewCharacterForm>({
    name: "",
    species: "",
    rank: RANKS[0],
    position: "",
    fitness: "",
    coordination: "",
    presence: "",
    intellect: "",
    psi: "",
    advantages: [],
    disadvantages: [],
    notes: "",
  });
  const [newAdvantage, setNewAdvantage] = useState("");
  const [newDisadvantage, setNewDisadvantage] = useState("");
  const [formError, setFormError] = useState<string>("");

  // --- Fade-in on step change ---
  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, [step]);

  // --- Load ships once ---
  useEffect(() => {
    setShips(getShips());
  }, []);

  // --- Real-time crew subscription ---
  useEffect(() => {
    const unsubscribe = subscribeToAllCrew((crew) => {
      setAllCrew(crew);
    });
    return unsubscribe;
  }, []);

  // ---------------------------------------------------------------------------
  // Derived data helpers
  // ---------------------------------------------------------------------------

  /** Returns crew that is unclaimed and active for the given shipId. */
  const availableCrewForShip = useCallback(
    (shipId: string): Array<{ id: string; member: CrewMember }> =>
      Object.entries(allCrew)
        .filter(
          ([, m]) =>
            m.shipId === shipId && m.ownerId === null && m.status === "active"
        )
        .map(([id, member]) => ({ id, member })),
    [allCrew]
  );

  /** Returns crew that is unclaimed and active for currently selected ship. */
  const availableCrewOnSelectedShip = availableCrewForShip(selectedShipId);

  const selectedCrewEntry =
    selectedCrewId && allCrew[selectedCrewId]
      ? { id: selectedCrewId, member: allCrew[selectedCrewId] }
      : null;

  const selectedShip = ships[selectedShipId] ?? null;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handlePickShip = (shipId: string) => {
    setSelectedShipId(shipId);
    setClaimError("");
    setStep("pick-crew");
  };

  const handleClaimClick = (crewId: string) => {
    setSelectedCrewId(crewId);
    setClaimError("");
    setStep("confirm-claim");
  };

  const handleConfirmClaim = async () => {
    const user = auth.currentUser;
    if (!user) {
      setClaimError("You must be signed in to claim a character.");
      return;
    }
    setClaimLoading(true);
    setClaimError("");
    try {
      await claimCharacter(selectedCrewId, user.uid, user.email ?? "");
      navigate(`/crew/${selectedCrewId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unknown error occurred.";
      if (message.toLowerCase().includes("already claimed")) {
        setClaimError("This character was just claimed by another user. Please choose a different one.");
      } else {
        setClaimError(`Claim failed: ${message}`);
      }
    } finally {
      setClaimLoading(false);
    }
  };

  const handleCreateSubmit = async () => {
    const user = auth.currentUser;
    if (!user) {
      setFormError("You must be signed in to create a character.");
      return;
    }
    if (!form.name.trim()) {
      setFormError("Character name is required.");
      return;
    }
    if (!form.species.trim()) {
      setFormError("Species is required.");
      return;
    }
    if (!form.position.trim()) {
      setFormError("Position is required.");
      return;
    }

    const parseAttr = (val: string): number | null => {
      const trimmed = val.trim();
      if (trimmed === "") return null;
      const n = parseInt(trimmed, 10);
      return isNaN(n) ? null : Math.min(6, Math.max(0, n));
    };

    const newMember: CrewMember = {
      name: form.name.trim(),
      species: form.species.trim(),
      rank: form.rank,
      position: form.position.trim(),
      shipId: selectedShipId,
      attributes: {
        Fitness: parseAttr(form.fitness),
        Coordination: parseAttr(form.coordination),
        Presence: parseAttr(form.presence),
        Intellect: parseAttr(form.intellect),
        PSI: parseAttr(form.psi),
      },
      advantages: form.advantages,
      disadvantages: form.disadvantages,
      skills: [],
      notes: form.notes.trim(),
      ownerId: user.uid,
      ownerEmail: user.email ?? "",
      status: "pending",
    };

    setSubmitLoading(true);
    setFormError("");
    try {
      const slug = `crew-${Date.now()}`;
      await createCharacter(slug, newMember);
      setSubmitSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unknown error occurred.";
      setFormError(`Submission failed: ${message}`);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleFormField = (field: keyof NewCharacterForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddAdvantage = () => {
    const trimmed = newAdvantage.trim();
    if (!trimmed) return;
    setForm((prev) => ({ ...prev, advantages: [...prev.advantages, trimmed] }));
    setNewAdvantage("");
  };

  const handleRemoveAdvantage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      advantages: prev.advantages.filter((_, i) => i !== index),
    }));
  };

  const handleAddDisadvantage = () => {
    const trimmed = newDisadvantage.trim();
    if (!trimmed) return;
    setForm((prev) => ({ ...prev, disadvantages: [...prev.disadvantages, trimmed] }));
    setNewDisadvantage("");
  };

  const handleRemoveDisadvantage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      disadvantages: prev.disadvantages.filter((_, i) => i !== index),
    }));
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const wrapperStyle: React.CSSProperties = {
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "2rem",
    fontFamily: "'Orbitron', sans-serif",
    opacity: visible ? 1 : 0,
    transform: visible ? "translateX(0)" : "translateX(-30px)",
    transition: "opacity 0.5s ease-out, transform 0.5s ease-out",
  };

  // ---------------------------------------------------------------------------
  // Step 1: Pick Ship
  // ---------------------------------------------------------------------------

  const renderPickShip = () => {
    const shipEntries = Object.entries(ships);

    return (
      <div style={wrapperStyle}>
        <LcarsHeader
          title="Choose Your Character"
          subtitle="STEP 1 OF 3 — SELECT VESSEL"
          accentColor="#ff9900"
        />

        <p
          style={{
            color: "#6699cc",
            fontSize: "0.85rem",
            letterSpacing: "1px",
            marginBottom: "1.5rem",
            textTransform: "uppercase",
          }}
        >
          Select the vessel or installation you wish to serve aboard.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))",
            gap: "1rem",
          }}
        >
          {/* Ship cards */}
          {shipEntries.map(([shipId, ship]) => {
            const available = availableCrewForShip(shipId).length;
            return (
              <ShipCard
                key={shipId}
                shipId={shipId}
                ship={ship}
                availableCount={available}
                onSelect={handlePickShip}
              />
            );
          })}

          {/* Starbase card */}
          <StarbaseCard
            availableCount={availableCrewForShip("starbase").length}
            onSelect={handlePickShip}
          />
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Step 2: Pick Crew
  // ---------------------------------------------------------------------------

  const renderPickCrew = () => {
    const shipLabel =
      selectedShipId === "starbase"
        ? "Starbase"
        : selectedShip
        ? `${selectedShip.name} (${selectedShip.registry})`
        : selectedShipId;

    return (
      <div style={wrapperStyle}>
        <LcarsHeader
          title={shipLabel}
          subtitle="STEP 2 OF 3 — SELECT CREW"
          accentColor="#9933cc"
        />

        {/* Available crew list */}
        <div style={{ ...panelStyle("#9933cc"), marginBottom: "1.5rem" }}>
          <h2 style={sectionHeaderStyle("#9933cc")}>Available Crew Members</h2>

          {availableCrewOnSelectedShip.length === 0 ? (
            <p
              style={{
                color: "#9933cc60",
                fontSize: "0.85rem",
                fontStyle: "italic",
                margin: "1rem 0",
              }}
            >
              No unclaimed crew members on record for this vessel.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
              {availableCrewOnSelectedShip.map(({ id, member }) => (
                <CrewRow
                  key={id}
                  crewId={id}
                  member={member}
                  onClaim={handleClaimClick}
                />
              ))}
            </div>
          )}
        </div>

        {/* Create own character */}
        <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
          <button
            onClick={() => {
              setFormError("");
              setSubmitSuccess(false);
              setForm({
                name: "",
                species: "",
                rank: RANKS[0],
                position: "",
                fitness: "",
                coordination: "",
                presence: "",
                intellect: "",
                psi: "",
                advantages: [],
                disadvantages: [],
                notes: "",
              });
              setStep("create-new");
            }}
            style={{
              backgroundColor: "#ffcc33",
              border: "none",
              borderRadius: "15px",
              color: "#000",
              cursor: "pointer",
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "0.9rem",
              fontWeight: "bold",
              letterSpacing: "2px",
              padding: "0.75rem 2.5rem",
              width: "100%",
              maxWidth: "400px",
            }}
            aria-label="Create your own character"
          >
            CREATE YOUR OWN CHARACTER
          </button>
        </div>

        {/* Back button */}
        <div style={{ display: "flex", alignItems: "stretch", height: "45px" }}>
          <div
            style={{
              width: "80px",
              backgroundColor: "#9933cc",
              borderRadius: "20px 0 0 20px",
            }}
          />
          <button
            onClick={() => setStep("pick-ship")}
            style={{
              flex: 1,
              backgroundColor: "#ff9900",
              border: "none",
              color: "#000",
              fontFamily: "'Orbitron', sans-serif",
              fontWeight: "bold",
              letterSpacing: "2px",
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
            aria-label="Back to ship selection"
          >
            BACK TO SHIP SELECTION
          </button>
          <div
            style={{
              width: "20px",
              backgroundColor: "#ff9900",
              borderRadius: "0 20px 20px 0",
            }}
          />
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Step 3a: Confirm Claim
  // ---------------------------------------------------------------------------

  const renderConfirmClaim = () => {
    if (!selectedCrewEntry) {
      return (
        <div style={wrapperStyle}>
          <p style={{ color: "#cc6666" }}>Character data not found. Please go back and try again.</p>
          <button onClick={() => setStep("pick-crew")} style={{ marginTop: "1rem" }}>
            BACK
          </button>
        </div>
      );
    }

    const { id, member } = selectedCrewEntry;
    const shipLabel =
      selectedShipId === "starbase"
        ? "Starbase"
        : selectedShip
        ? `${selectedShip.name} (${selectedShip.registry})`
        : member.shipId;

    return (
      <div style={wrapperStyle}>
        <LcarsHeader
          title={member.name}
          subtitle="STEP 3 OF 3 — CONFIRM CLAIM"
          accentColor="#6699cc"
        />

        {/* Identity panel */}
        <div style={{ ...panelStyle("#6699cc"), marginBottom: "1.5rem" }}>
          <h2 style={sectionHeaderStyle("#6699cc")}>Personnel Identity</h2>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.4rem",
              marginTop: "0.75rem",
            }}
          >
            <IdentityRow label="Name" value={member.name} />
            <IdentityRow label="Rank" value={member.rank} />
            <IdentityRow label="Species" value={member.species} />
            <IdentityRow label="Position" value={member.position} />
            <IdentityRow label="Vessel" value={shipLabel} />
          </div>
        </div>

        {/* Attributes panel */}
        <div style={{ ...panelStyle("#ffcc33"), marginBottom: "1.5rem" }}>
          <h2 style={sectionHeaderStyle("#ffcc33")}>Attributes</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: "0.75rem",
              marginTop: "0.75rem",
            }}
          >
            {(
              Object.entries(member.attributes) as [
                keyof CrewMember["attributes"],
                number | null
              ][]
            ).map(([attr, val]) => (
              <div key={attr}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "0.25rem",
                  }}
                >
                  <span style={{ color: "#ffcc33", fontSize: "0.8rem", letterSpacing: "1px" }}>
                    {attr}
                  </span>
                  <span style={{ color: val !== null ? "#fff" : "#444", fontSize: "0.85rem" }}>
                    {val !== null ? val : "—"}
                  </span>
                </div>
                <div
                  style={{
                    background: "#222",
                    height: "6px",
                    borderRadius: "3px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: val !== null ? `${(val / 6) * 100}%` : "0%",
                      height: "100%",
                      backgroundColor: val !== null ? "#ffcc33" : "transparent",
                      borderRadius: "3px",
                      transition: "width 0.3s ease-out",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Advantages */}
        {member.advantages.length > 0 && (
          <div style={{ ...panelStyle("#33cc99"), marginBottom: "1.5rem" }}>
            <h2 style={sectionHeaderStyle("#33cc99")}>Advantages</h2>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
                marginTop: "0.75rem",
              }}
            >
              {member.advantages.map((adv, i) => (
                <span key={i} style={pillStyle("#33cc99")}>
                  {adv}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Disadvantages */}
        {member.disadvantages.length > 0 && (
          <div style={{ ...panelStyle("#cc6666"), marginBottom: "1.5rem" }}>
            <h2 style={sectionHeaderStyle("#cc6666")}>Disadvantages</h2>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
                marginTop: "0.75rem",
              }}
            >
              {member.disadvantages.map((dis, i) => (
                <span key={i} style={pillStyle("#cc6666")}>
                  {dis}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {member.notes && (
          <div style={{ ...panelStyle("#888"), marginBottom: "1.5rem" }}>
            <h2 style={sectionHeaderStyle("#888")}>Personnel Notes</h2>
            <p
              style={{
                color: "#aaa",
                lineHeight: "1.6",
                fontSize: "0.9rem",
                margin: "0.75rem 0 0 0",
              }}
            >
              {member.notes}
            </p>
          </div>
        )}

        {/* Error message */}
        {claimError && (
          <div
            role="alert"
            style={{
              backgroundColor: "#cc000020",
              border: "1px solid #cc0000",
              borderRadius: "4px",
              color: "#ff6666",
              fontSize: "0.85rem",
              letterSpacing: "1px",
              marginBottom: "1.5rem",
              padding: "0.75rem 1rem",
            }}
          >
            {claimError}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginBottom: "1rem" }}>
          <button
            onClick={() => {
              setClaimError("");
              setStep("pick-crew");
            }}
            style={{
              backgroundColor: "transparent",
              border: "1px solid #555",
              borderRadius: "4px",
              color: "#888",
              cursor: "pointer",
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "0.75rem",
              fontWeight: "bold",
              letterSpacing: "1px",
              padding: "0.5rem 1.25rem",
            }}
            aria-label="Cancel and go back"
          >
            CANCEL
          </button>
          <button
            onClick={handleConfirmClaim}
            disabled={claimLoading}
            style={{
              backgroundColor: claimLoading ? "#444" : "#6699cc",
              border: "none",
              borderRadius: "4px",
              color: "#000",
              cursor: claimLoading ? "not-allowed" : "pointer",
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "0.85rem",
              fontWeight: "bold",
              letterSpacing: "2px",
              padding: "0.6rem 1.5rem",
              opacity: claimLoading ? 0.7 : 1,
            }}
            aria-label={`Confirm claim for ${member.name}`}
            aria-busy={claimLoading}
          >
            {claimLoading ? "PROCESSING..." : "CONFIRM CLAIM"}
          </button>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Step 3b: Create New Character
  // ---------------------------------------------------------------------------

  const renderCreateNew = () => {
    if (submitSuccess) {
      return (
        <div style={wrapperStyle}>
          <LcarsHeader
            title="Submission Received"
            subtitle="STARFLEET COMMAND"
            accentColor="#33cc99"
          />
          <div
            style={{
              ...panelStyle("#33cc99"),
              textAlign: "center",
              padding: "2.5rem",
            }}
          >
            <p
              style={{
                color: "#33cc99",
                fontSize: "1rem",
                letterSpacing: "2px",
                textTransform: "uppercase",
                lineHeight: "1.8",
                margin: 0,
              }}
            >
              Your character has been submitted for Starfleet Command approval.
            </p>
            <p
              style={{
                color: "#888",
                fontSize: "0.8rem",
                letterSpacing: "1px",
                marginTop: "1rem",
              }}
            >
              You will be notified once your application has been reviewed.
            </p>
            <Link
              to="/"
              style={{
                display: "inline-block",
                marginTop: "2rem",
                backgroundColor: "#ff9900",
                borderRadius: "15px",
                color: "#000",
                fontFamily: "'Orbitron', sans-serif",
                fontWeight: "bold",
                fontSize: "0.85rem",
                letterSpacing: "2px",
                padding: "0.75rem 2rem",
                textDecoration: "none",
              }}
            >
              RETURN TO STAR MAP
            </Link>
          </div>
        </div>
      );
    }

    const shipLabel =
      selectedShipId === "starbase"
        ? "Starbase"
        : selectedShip
        ? `${selectedShip.name} (${selectedShip.registry})`
        : selectedShipId;

    const attrFields: Array<{ label: string; key: keyof NewCharacterForm }> = [
      { label: "Fitness", key: "fitness" },
      { label: "Coordination", key: "coordination" },
      { label: "Presence", key: "presence" },
      { label: "Intellect", key: "intellect" },
      { label: "PSI", key: "psi" },
    ];

    return (
      <div style={wrapperStyle}>
        <LcarsHeader
          title="New Character"
          subtitle="STEP 3 OF 3 — CREATE"
          accentColor="#ffcc33"
        />

        {/* Identity panel */}
        <div style={{ ...panelStyle("#ff9900"), marginBottom: "1.5rem" }}>
          <h2 style={sectionHeaderStyle("#ff9900")}>Identity</h2>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              marginTop: "0.75rem",
            }}
          >
            {/* Vessel (read-only) */}
            <div>
              <label style={labelStyle}>Vessel</label>
              <div
                style={{
                  ...inputStyle("#ff9900"),
                  color: "#ff9900",
                  cursor: "default",
                }}
                aria-readonly="true"
              >
                {shipLabel}
              </div>
            </div>

            {/* Name */}
            <div>
              <label htmlFor="cc-name" style={labelStyle}>
                Name <span style={{ color: "#cc6666" }}>*</span>
              </label>
              <input
                id="cc-name"
                type="text"
                value={form.name}
                onChange={(e) => handleFormField("name", e.target.value)}
                placeholder="Full name..."
                style={inputStyle("#ff9900")}
                aria-required="true"
              />
            </div>

            {/* Species */}
            <div>
              <label htmlFor="cc-species" style={labelStyle}>
                Species <span style={{ color: "#cc6666" }}>*</span>
              </label>
              <input
                id="cc-species"
                type="text"
                value={form.species}
                onChange={(e) => handleFormField("species", e.target.value)}
                placeholder="e.g. Human, Vulcan, Klingon..."
                style={inputStyle("#ff9900")}
                aria-required="true"
              />
            </div>

            {/* Rank */}
            <div>
              <label htmlFor="cc-rank" style={labelStyle}>
                Rank
              </label>
              <select
                id="cc-rank"
                value={form.rank}
                onChange={(e) => handleFormField("rank", e.target.value)}
                style={selectStyle("#ff9900")}
              >
                {RANKS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Position */}
            <div>
              <label htmlFor="cc-position" style={labelStyle}>
                Position <span style={{ color: "#cc6666" }}>*</span>
              </label>
              <input
                id="cc-position"
                type="text"
                value={form.position}
                onChange={(e) => handleFormField("position", e.target.value)}
                placeholder="e.g. Chief Medical Officer, Helmsman..."
                style={inputStyle("#ff9900")}
                aria-required="true"
              />
            </div>
          </div>
        </div>

        {/* Attributes panel */}
        <div style={{ ...panelStyle("#ffcc33"), marginBottom: "1.5rem" }}>
          <h2 style={sectionHeaderStyle("#ffcc33")}>Attributes (0–6)</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: "0.75rem",
              marginTop: "0.75rem",
            }}
          >
            {attrFields.map(({ label, key }) => (
              <div key={key}>
                <label htmlFor={`cc-attr-${key}`} style={labelStyle}>
                  {label}
                </label>
                <input
                  id={`cc-attr-${key}`}
                  type="number"
                  min={0}
                  max={6}
                  value={form[key] as string}
                  onChange={(e) => handleFormField(key, e.target.value)}
                  placeholder="—"
                  style={{ ...inputStyle("#ffcc33"), textAlign: "center" }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Advantages panel */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <div style={panelStyle("#33cc99")}>
            <h2 style={sectionHeaderStyle("#33cc99")}>Advantages</h2>
            {form.advantages.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                  marginTop: "0.5rem",
                  marginBottom: "0.75rem",
                }}
              >
                {form.advantages.map((adv, i) => (
                  <span key={i} style={pillStyle("#33cc99")}>
                    {adv}
                    <button
                      onClick={() => handleRemoveAdvantage(i)}
                      style={pillRemoveBtn}
                      aria-label={`Remove advantage: ${adv}`}
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <input
                type="text"
                value={newAdvantage}
                placeholder="New advantage..."
                onChange={(e) => setNewAdvantage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddAdvantage();
                  }
                }}
                style={{ ...inputStyle("#33cc99"), flex: 1 }}
                aria-label="New advantage input"
              />
              <button
                onClick={handleAddAdvantage}
                style={addBtnStyle("#33cc99")}
                aria-label="Add advantage"
              >
                ADD
              </button>
            </div>
          </div>

          {/* Disadvantages */}
          <div style={panelStyle("#cc6666")}>
            <h2 style={sectionHeaderStyle("#cc6666")}>Disadvantages</h2>
            {form.disadvantages.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                  marginTop: "0.5rem",
                  marginBottom: "0.75rem",
                }}
              >
                {form.disadvantages.map((dis, i) => (
                  <span key={i} style={pillStyle("#cc6666")}>
                    {dis}
                    <button
                      onClick={() => handleRemoveDisadvantage(i)}
                      style={pillRemoveBtn}
                      aria-label={`Remove disadvantage: ${dis}`}
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <input
                type="text"
                value={newDisadvantage}
                placeholder="New disadvantage..."
                onChange={(e) => setNewDisadvantage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddDisadvantage();
                  }
                }}
                style={{ ...inputStyle("#cc6666"), flex: 1 }}
                aria-label="New disadvantage input"
              />
              <button
                onClick={handleAddDisadvantage}
                style={addBtnStyle("#cc6666")}
                aria-label="Add disadvantage"
              >
                ADD
              </button>
            </div>
          </div>
        </div>

        {/* Notes panel */}
        <div style={{ ...panelStyle("#888"), marginBottom: "1.5rem" }}>
          <h2 style={sectionHeaderStyle("#888")}>Personnel Notes</h2>
          <textarea
            id="cc-notes"
            value={form.notes}
            placeholder="Optional background, personality notes..."
            onChange={(e) => handleFormField("notes", e.target.value)}
            rows={4}
            style={{
              ...inputStyle("#888"),
              resize: "vertical",
              lineHeight: "1.6",
              marginTop: "0.75rem",
            }}
            aria-label="Personnel notes"
          />
        </div>

        {/* Form error */}
        {formError && (
          <div
            role="alert"
            style={{
              backgroundColor: "#cc000020",
              border: "1px solid #cc0000",
              borderRadius: "4px",
              color: "#ff6666",
              fontSize: "0.85rem",
              letterSpacing: "1px",
              marginBottom: "1.5rem",
              padding: "0.75rem 1rem",
            }}
          >
            {formError}
          </div>
        )}

        {/* Action row */}
        <div
          style={{
            display: "flex",
            gap: "1rem",
            justifyContent: "flex-end",
            marginBottom: "1.5rem",
          }}
        >
          <button
            onClick={() => setStep("pick-crew")}
            style={{
              backgroundColor: "transparent",
              border: "1px solid #555",
              borderRadius: "4px",
              color: "#888",
              cursor: "pointer",
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "0.75rem",
              fontWeight: "bold",
              letterSpacing: "1px",
              padding: "0.5rem 1.25rem",
            }}
            aria-label="Cancel character creation"
          >
            CANCEL
          </button>
          <button
            onClick={handleCreateSubmit}
            disabled={submitLoading}
            style={{
              backgroundColor: submitLoading ? "#444" : "#ffcc33",
              border: "none",
              borderRadius: "4px",
              color: "#000",
              cursor: submitLoading ? "not-allowed" : "pointer",
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "0.85rem",
              fontWeight: "bold",
              letterSpacing: "2px",
              opacity: submitLoading ? 0.7 : 1,
              padding: "0.6rem 1.5rem",
            }}
            aria-label="Submit character for approval"
            aria-busy={submitLoading}
          >
            {submitLoading ? "TRANSMITTING..." : "SUBMIT FOR APPROVAL"}
          </button>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Root render
  // ---------------------------------------------------------------------------

  switch (step) {
    case "pick-ship":
      return renderPickShip();
    case "pick-crew":
      return renderPickCrew();
    case "confirm-claim":
      return renderConfirmClaim();
    case "create-new":
      return renderCreateNew();
    default:
      return null;
  }
};

// ---------------------------------------------------------------------------
// ShipCard sub-component
// ---------------------------------------------------------------------------

interface ShipCardProps {
  shipId: string;
  ship: ShipData;
  availableCount: number;
  onSelect: (shipId: string) => void;
}

const ShipCard = ({ shipId, ship, availableCount, onSelect }: ShipCardProps) => {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={() => onSelect(shipId)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      aria-label={`Select ${ship.name}, ${availableCount} crew available`}
      style={{
        backgroundColor: hovered ? "#1a1a1a" : "#111",
        border: `2px solid ${hovered ? "#ff9900" : "#ff990060"}`,
        borderRadius: "0 30px 0 0",
        cursor: "pointer",
        fontFamily: "'Orbitron', sans-serif",
        padding: "1.25rem 1.5rem",
        textAlign: "left",
        transition: "background-color 0.2s ease, border-color 0.2s ease",
        width: "100%",
      }}
    >
      {/* Ship name */}
      <div
        style={{
          color: "#ff9900",
          fontSize: "1rem",
          fontWeight: "bold",
          letterSpacing: "2px",
          marginBottom: "0.4rem",
          textTransform: "uppercase",
        }}
      >
        {ship.name}
      </div>

      {/* Registry */}
      <div
        style={{
          color: "#6699cc",
          fontSize: "0.8rem",
          letterSpacing: "1px",
          marginBottom: "0.25rem",
        }}
      >
        {ship.registry}
      </div>

      {/* Class */}
      <div
        style={{
          color: "#888",
          fontSize: "0.75rem",
          letterSpacing: "1px",
          marginBottom: "0.75rem",
          textTransform: "uppercase",
        }}
      >
        {ship.class}
      </div>

      {/* Available crew count */}
      <div
        style={{
          display: "inline-block",
          backgroundColor: availableCount > 0 ? "#33cc9920" : "#33333320",
          border: `1px solid ${availableCount > 0 ? "#33cc99" : "#333"}`,
          borderRadius: "12px",
          color: availableCount > 0 ? "#33cc99" : "#555",
          fontSize: "0.75rem",
          fontWeight: "bold",
          letterSpacing: "1px",
          padding: "0.2rem 0.8rem",
        }}
      >
        {availableCount} CREW AVAILABLE
      </div>
    </button>
  );
};

// ---------------------------------------------------------------------------
// StarbaseCard sub-component
// ---------------------------------------------------------------------------

interface StarbaseCardProps {
  availableCount: number;
  onSelect: (shipId: string) => void;
}

const StarbaseCard = ({ availableCount, onSelect }: StarbaseCardProps) => {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={() => onSelect("starbase")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      aria-label={`Select Starbase, ${availableCount} crew available`}
      style={{
        backgroundColor: hovered ? "#1a1a1a" : "#111",
        border: `2px solid ${hovered ? "#9933cc" : "#9933cc60"}`,
        borderRadius: "0 30px 0 0",
        cursor: "pointer",
        fontFamily: "'Orbitron', sans-serif",
        padding: "1.25rem 1.5rem",
        textAlign: "left",
        transition: "background-color 0.2s ease, border-color 0.2s ease",
        width: "100%",
      }}
    >
      <div
        style={{
          color: "#9933cc",
          fontSize: "1rem",
          fontWeight: "bold",
          letterSpacing: "2px",
          marginBottom: "0.4rem",
          textTransform: "uppercase",
        }}
      >
        Starbase Machida
      </div>

      <div
        style={{
          color: "#6699cc",
          fontSize: "0.8rem",
          letterSpacing: "1px",
          marginBottom: "0.25rem",
        }}
      >
        SB-MACHIDA
      </div>

      <div
        style={{
          color: "#888",
          fontSize: "0.75rem",
          letterSpacing: "1px",
          marginBottom: "0.75rem",
          textTransform: "uppercase",
        }}
      >
        Federation Starbase Installation
      </div>

      <div
        style={{
          display: "inline-block",
          backgroundColor: availableCount > 0 ? "#9933cc20" : "#33333320",
          border: `1px solid ${availableCount > 0 ? "#9933cc" : "#333"}`,
          borderRadius: "12px",
          color: availableCount > 0 ? "#9933cc" : "#555",
          fontSize: "0.75rem",
          fontWeight: "bold",
          letterSpacing: "1px",
          padding: "0.2rem 0.8rem",
        }}
      >
        {availableCount} CREW AVAILABLE
      </div>
    </button>
  );
};

// ---------------------------------------------------------------------------
// CrewRow sub-component
// ---------------------------------------------------------------------------

interface CrewRowProps {
  crewId: string;
  member: CrewMember;
  onClaim: (crewId: string) => void;
}

const CrewRow = ({ crewId, member, onClaim }: CrewRowProps) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        alignItems: "center",
        backgroundColor: hovered ? "#1a1a1a" : "transparent",
        borderBottom: "1px solid #9933cc30",
        display: "flex",
        gap: "1rem",
        justifyContent: "space-between",
        padding: "0.6rem 0.75rem",
        transition: "background-color 0.2s ease",
      }}
    >
      {/* Rank */}
      <span
        style={{
          color: "#9933cc",
          fontSize: "0.75rem",
          flexShrink: 0,
          letterSpacing: "1px",
          minWidth: "120px",
          textTransform: "uppercase",
        }}
      >
        {member.rank}
      </span>

      {/* Name */}
      <span
        style={{
          color: "#fff",
          flex: 1,
          fontSize: "0.9rem",
          fontWeight: "bold",
          letterSpacing: "1px",
        }}
      >
        {member.name}
      </span>

      {/* Species */}
      <span
        style={{
          color: "#888",
          fontSize: "0.8rem",
          flexShrink: 0,
          letterSpacing: "1px",
          minWidth: "100px",
          textTransform: "uppercase",
        }}
      >
        {member.species}
      </span>

      {/* Position */}
      <span
        style={{
          color: "#6699cc",
          fontSize: "0.8rem",
          flexShrink: 0,
          letterSpacing: "1px",
          minWidth: "140px",
          textTransform: "uppercase",
        }}
      >
        {member.position}
      </span>

      {/* Claim button */}
      <button
        onClick={() => onClaim(crewId)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        aria-label={`Claim ${member.name}`}
        style={{
          backgroundColor: "#6699cc",
          border: "none",
          borderRadius: "15px",
          color: "#000",
          cursor: "pointer",
          flexShrink: 0,
          fontFamily: "'Orbitron', sans-serif",
          fontSize: "0.7rem",
          fontWeight: "bold",
          letterSpacing: "2px",
          padding: "0.3rem 0.9rem",
        }}
      >
        CLAIM
      </button>
    </div>
  );
};

export default ChooseCharacter;
