import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { getShips, saveShips, RANKS } from "../utils/gameData";
import {
  getCrewMember,
  updateCharacter,
  approveCharacter,
  rejectCharacter,
} from "../utils/crewFirestore";
import { isAdmin } from "../utils/adminAuth";
import type { CrewMember, ShipData } from "../types/fleet";
import "../assets/lcars.css";

const rankColors: Record<string, string> = {
  Captain: "#ff9900",
  Commander: "#cc6666",
  "Lt. Commander": "#ffcc33",
  "Full Lieutenant": "#ffcc33",
  Ensign: "#6699cc",
};

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
    <span style={{ color: "#fff", fontSize: "0.9rem" }}>{value}</span>
  </div>
);

const CrewPage = () => {
  const { crewSlug } = useParams<{ crewSlug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ---- primary state ----
  const [member, setMember] = useState<CrewMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [shipsData, setShipsData] = useState<Record<string, ShipData>>({});
  const [visible, setVisible] = useState(false);
  const [editMode, setEditMode] = useState(() => searchParams.get("edit") === "true");

  // ---- edit-mode transient UI state ----
  const [newAdvantage, setNewAdvantage] = useState("");
  const [newDisadvantage, setNewDisadvantage] = useState("");
  const [newSkill, setNewSkill] = useState("");
  const [showSaved, setShowSaved] = useState(false);

  // timer handle belongs in a ref, not state
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashSaved = useCallback(() => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    setShowSaved(true);
    savedTimerRef.current = setTimeout(() => setShowSaved(false), 1500);
  }, []);

  // cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  // Load Firestore crew member and localStorage ships on mount / when slug changes
  useEffect(() => {
    if (!crewSlug) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setMember(null);
    getCrewMember(crewSlug)
      .then((data) => {
        setMember(data);
      })
      .finally(() => {
        setLoading(false);
      });
    setShipsData(getShips());
  }, [crewSlug]);

  // Fade-in animation
  useEffect(() => {
    setVisible(false);
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, [crewSlug]);

  // Derive auth state — computed on every render, no hooks after this point
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const currentUid = currentUser?.uid ?? null;

  const canEdit =
    member !== null &&
    currentUid !== null &&
    (currentUid === member.ownerId || isAdmin(currentUid));

  const userIsAdmin = currentUid !== null && isAdmin(currentUid);

  const accentColor = member ? rankColors[member.rank] || "#ff9900" : "#ff9900";
  const ship = member ? shipsData[member.shipId] ?? null : null;

  // ---- helpers ----

  /**
   * Optimistically update local state, then persist to Firestore.
   * On success, flash the SAVED indicator. On failure, log the error
   * (local state remains at the optimistic value — a page refresh will
   * re-sync from Firestore).
   */
  const updateMember = useCallback(
    async (updated: CrewMember) => {
      if (!crewSlug) return;
      setMember(updated);
      try {
        await updateCharacter(crewSlug, updated);
        flashSaved();
      } catch (err) {
        console.error("Failed to save crew member to Firestore:", err);
      }
    },
    [crewSlug, flashSaved],
  );

  const handleFieldChange = (field: keyof CrewMember, value: string) => {
    if (!member) return;
    updateMember({ ...member, [field]: value });
  };

  const handleAttributeChange = (attr: keyof CrewMember["attributes"], raw: string) => {
    if (!member) return;
    const trimmed = raw.trim();
    let parsed: number | null = null;
    if (trimmed !== "") {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num)) {
        parsed = Math.min(6, Math.max(0, num));
      }
    }
    updateMember({
      ...member,
      attributes: { ...member.attributes, [attr]: parsed },
    });
  };

  const handleShipChange = async (newShipId: string) => {
    if (!member || !crewSlug) return;

    const oldShipId = member.shipId;

    // Optimistically update local member state
    const updatedMember = { ...member, shipId: newShipId };
    setMember(updatedMember);

    // Update shipsData in localStorage (ships stay local)
    const updatedShips = { ...shipsData };

    // Remove from old ship
    if (oldShipId && updatedShips[oldShipId]) {
      updatedShips[oldShipId] = {
        ...updatedShips[oldShipId],
        crewIds: updatedShips[oldShipId].crewIds.filter((id) => id !== crewSlug),
      };
    }

    // Add to new ship (if not "unassigned")
    if (newShipId && updatedShips[newShipId]) {
      const existing = updatedShips[newShipId].crewIds;
      if (!existing.includes(crewSlug)) {
        updatedShips[newShipId] = {
          ...updatedShips[newShipId],
          crewIds: [...existing, crewSlug],
        };
      }
    }

    setShipsData(updatedShips);
    saveShips(updatedShips);

    // Persist shipId change to Firestore
    try {
      await updateCharacter(crewSlug, { shipId: newShipId });
      flashSaved();
    } catch (err) {
      console.error("Failed to update ship assignment in Firestore:", err);
    }
  };

  const handleAddAdvantage = () => {
    if (!member) return;
    const trimmed = newAdvantage.trim();
    if (!trimmed) return;
    updateMember({ ...member, advantages: [...member.advantages, trimmed] });
    setNewAdvantage("");
  };

  const handleRemoveAdvantage = (index: number) => {
    if (!member) return;
    updateMember({
      ...member,
      advantages: member.advantages.filter((_, i) => i !== index),
    });
  };

  const handleAddDisadvantage = () => {
    if (!member) return;
    const trimmed = newDisadvantage.trim();
    if (!trimmed) return;
    updateMember({ ...member, disadvantages: [...member.disadvantages, trimmed] });
    setNewDisadvantage("");
  };

  const handleRemoveDisadvantage = (index: number) => {
    if (!member) return;
    updateMember({
      ...member,
      disadvantages: member.disadvantages.filter((_, i) => i !== index),
    });
  };

  const handleAddSkill = () => {
    if (!member) return;
    const trimmed = newSkill.trim();
    if (!trimmed) return;
    updateMember({ ...member, skills: [...member.skills, trimmed] });
    setNewSkill("");
  };

  const handleRemoveSkill = (index: number) => {
    if (!member) return;
    updateMember({
      ...member,
      skills: member.skills.filter((_, i) => i !== index),
    });
  };

  const handleDelete = async () => {
    if (!member || !crewSlug) return;
    if (!window.confirm(`Remove ${member.name} from the personnel database?`)) return;

    // Remove from ship's crewIds in localStorage
    if (member.shipId && shipsData[member.shipId]) {
      const updatedShips = {
        ...shipsData,
        [member.shipId]: {
          ...shipsData[member.shipId],
          crewIds: shipsData[member.shipId].crewIds.filter((id) => id !== crewSlug),
        },
      };
      saveShips(updatedShips);
    }

    try {
      await rejectCharacter(crewSlug);
    } catch (err) {
      console.error("Failed to delete crew member from Firestore:", err);
    }

    navigate("/crew");
  };

  const handleApprove = async () => {
    if (!crewSlug) return;
    try {
      await approveCharacter(crewSlug);
      // Refetch to reflect new status
      const refreshed = await getCrewMember(crewSlug);
      setMember(refreshed);
    } catch (err) {
      console.error("Failed to approve character:", err);
    }
  };

  const handleReject = async () => {
    if (!crewSlug || !member) return;
    if (!window.confirm(`Reject and remove ${member.name} from the database?`)) return;
    try {
      await rejectCharacter(crewSlug);
    } catch (err) {
      console.error("Failed to reject character:", err);
    }
    navigate("/crew");
  };

  // ---- loading / not-found states ----
  // Safe conditional return AFTER all hooks/callbacks are declared

  if (loading) {
    return (
      <div
        style={{
          color: "#ff9900",
          textAlign: "center",
          marginTop: "4rem",
          fontFamily: "'Orbitron', sans-serif",
        }}
      >
        <p style={{ fontSize: "1.5rem" }}>Scanning personnel records...</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div
        style={{
          color: "#ff9900",
          textAlign: "center",
          marginTop: "4rem",
          fontFamily: "'Orbitron', sans-serif",
        }}
      >
        <p style={{ fontSize: "1.5rem" }}>Scanning personnel records...</p>
        <p style={{ color: "#6699cc", marginTop: "1rem" }}>Officer not found in database.</p>
        <Link to="/crew" style={{ color: "#9933cc", marginTop: "2rem", display: "inline-block" }}>
          Return to Crew Roster
        </Link>
      </div>
    );
  }

  // ---- render ----
  return (
    <div
      style={{
        maxWidth: "1000px",
        margin: "0 auto",
        padding: "2rem",
        fontFamily: "'Orbitron', sans-serif",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-30px)",
        transition: "opacity 0.5s ease-out, transform 0.5s ease-out",
      }}
    >
      {/* LCARS Header Bar */}
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
              fontSize: "1.6rem",
              fontWeight: "bold",
              letterSpacing: "3px",
              textTransform: "uppercase",
            }}
          >
            {member.name}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {showSaved && (
              <span
                style={{
                  color: "#33cc99",
                  fontSize: "0.7rem",
                  fontWeight: "bold",
                  letterSpacing: "2px",
                  animation: "fadeInOut 1.5s ease-in-out",
                }}
              >
                SAVED
              </span>
            )}
            <span style={{ color: "#000", fontWeight: "bold", fontSize: "0.8rem" }}>
              PERSONNEL FILE
            </span>
          </div>
        </div>

        {/* Edit toggle button — only visible to owner or admin */}
        {canEdit && (
          <>
            <button
              onClick={() => setEditMode((prev) => !prev)}
              style={{
                backgroundColor: editMode ? "#ff6600" : "#9933cc",
                border: "none",
                color: "#000",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.75rem",
                fontWeight: "bold",
                letterSpacing: "2px",
                cursor: "pointer",
                padding: "0 1.25rem",
                flexShrink: 0,
              }}
            >
              {editMode ? "EDITING" : "EDIT"}
            </button>

            <div
              style={{
                width: "20px",
                backgroundColor: editMode ? "#ff6600" : "#9933cc",
                borderRadius: "0 20px 20px 0",
              }}
            />
          </>
        )}

        {/* Right cap when no edit button is shown */}
        {!canEdit && (
          <div
            style={{
              width: "20px",
              backgroundColor: accentColor,
              borderRadius: "0 20px 20px 0",
            }}
          />
        )}
      </div>

      {/* Pending status banner */}
      {member.status === "pending" && (
        <div style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              backgroundColor: "#ffcc3320",
              border: "2px solid #ffcc33",
              color: "#ffcc33",
              padding: "0.75rem 1.5rem",
              textAlign: "center",
              letterSpacing: "2px",
              fontSize: "0.8rem",
              marginBottom: userIsAdmin ? "0.75rem" : 0,
            }}
          >
            AWAITING STARFLEET COMMAND APPROVAL
          </div>

          {/* Admin approve / reject controls */}
          {userIsAdmin && (
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
              <button
                onClick={handleApprove}
                style={{
                  backgroundColor: "#33cc99",
                  border: "none",
                  borderRadius: "4px",
                  color: "#000",
                  cursor: "pointer",
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                  letterSpacing: "2px",
                  padding: "0.5rem 1.5rem",
                }}
              >
                APPROVE
              </button>
              <button
                onClick={handleReject}
                style={{
                  backgroundColor: "#cc3333",
                  border: "none",
                  borderRadius: "4px",
                  color: "#fff",
                  cursor: "pointer",
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                  letterSpacing: "2px",
                  padding: "0.5rem 1.5rem",
                }}
              >
                REJECT
              </button>
            </div>
          )}
        </div>
      )}

      {/* Two-column layout — Identity + Attributes */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        {/* Identity Panel */}
        <div
          style={{
            backgroundColor: "#111",
            border: `2px solid ${accentColor}`,
            borderRadius: "0 30px 0 0",
            padding: "1.5rem",
          }}
        >
          <h2
            style={{
              color: accentColor,
              fontSize: "0.85rem",
              letterSpacing: "2px",
              marginBottom: "1rem",
              textTransform: "uppercase",
            }}
          >
            Identity
          </h2>

          {editMode ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {/* Name */}
              <div>
                <label
                  style={{
                    color: "#888",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    display: "block",
                    marginBottom: "0.25rem",
                  }}
                >
                  Name
                </label>
                <input
                  type="text"
                  value={member.name}
                  onChange={(e) => handleFieldChange("name", e.target.value)}
                  style={inputStyle(accentColor)}
                />
              </div>

              {/* Species */}
              <div>
                <label
                  style={{
                    color: "#888",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    display: "block",
                    marginBottom: "0.25rem",
                  }}
                >
                  Species
                </label>
                <input
                  type="text"
                  value={member.species}
                  onChange={(e) => handleFieldChange("species", e.target.value)}
                  style={inputStyle(accentColor)}
                />
              </div>

              {/* Rank */}
              <div>
                <label
                  style={{
                    color: "#888",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    display: "block",
                    marginBottom: "0.25rem",
                  }}
                >
                  Rank
                </label>
                <select
                  value={member.rank}
                  onChange={(e) => handleFieldChange("rank", e.target.value)}
                  style={selectStyle(accentColor)}
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
                <label
                  style={{
                    color: "#888",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    display: "block",
                    marginBottom: "0.25rem",
                  }}
                >
                  Position
                </label>
                <input
                  type="text"
                  value={member.position}
                  onChange={(e) => handleFieldChange("position", e.target.value)}
                  style={inputStyle(accentColor)}
                />
              </div>

              {/* Ship Assignment */}
              <div>
                <label
                  style={{
                    color: "#888",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    display: "block",
                    marginBottom: "0.25rem",
                  }}
                >
                  Ship Assignment
                </label>
                <select
                  value={member.shipId}
                  onChange={(e) => handleShipChange(e.target.value)}
                  style={selectStyle(accentColor)}
                >
                  <option value="">Unassigned</option>
                  <option value="starbase">Starbase Machida</option>
                  {Object.entries(shipsData).map(([slug, s]) => (
                    <option key={slug} value={slug}>
                      {s.name} ({s.registry})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <IdentityRow label="Name" value={member.name} />
              <IdentityRow label="Species" value={member.species} />
              <IdentityRow label="Rank" value={member.rank} />
              <IdentityRow label="Position" value={member.position} />

              {ship && (
                <div
                  style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0" }}
                >
                  <span
                    style={{
                      color: "#888",
                      fontSize: "0.8rem",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                    }}
                  >
                    Assignment
                  </span>
                  <Link
                    to={`/ship/${member.shipId}`}
                    style={{
                      color: "#66ccff",
                      fontSize: "0.9rem",
                      textDecoration: "none",
                    }}
                  >
                    {ship.name}
                  </Link>
                </div>
              )}

              {!ship && member.shipId === "starbase" && (
                <div
                  style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0" }}
                >
                  <span
                    style={{
                      color: "#888",
                      fontSize: "0.8rem",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                    }}
                  >
                    Assignment
                  </span>
                  <Link
                    to="/starbase"
                    style={{
                      color: "#9933cc",
                      fontSize: "0.9rem",
                      textDecoration: "none",
                    }}
                  >
                    Starbase Machida
                  </Link>
                </div>
              )}

              {!ship && member.shipId === "" && (
                <IdentityRow label="Assignment" value="Unassigned" />
              )}

              {/* Owner info row */}
              <div
                style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0" }}
              >
                <span
                  style={{
                    color: "#888",
                    fontSize: "0.8rem",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  Claimed by
                </span>
                {member.ownerId ? (
                  <span style={{ color: "#66ccff", fontSize: "0.9rem" }}>
                    {member.ownerEmail}
                  </span>
                ) : (
                  <span style={{ color: "#fff", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    Unclaimed
                    {userIsAdmin && currentUser && (
                      <button
                        onClick={async () => {
                          if (!crewSlug || !currentUser) return;
                          try {
                            const { claimCharacter } = await import("../utils/crewFirestore");
                            await claimCharacter(crewSlug, currentUser.uid, currentUser.email ?? "");
                            setMember((prev) => prev ? { ...prev, ownerId: currentUser.uid, ownerEmail: currentUser.email ?? "" } : prev);
                          } catch (err) {
                            console.error("Claim failed:", err);
                          }
                        }}
                        style={{
                          backgroundColor: "#66ccff",
                          border: "none",
                          borderRadius: "10px",
                          color: "#000",
                          cursor: "pointer",
                          fontFamily: "'Orbitron', sans-serif",
                          fontSize: "0.6rem",
                          fontWeight: "bold",
                          letterSpacing: "1px",
                          padding: "0.2rem 0.5rem",
                        }}
                      >
                        CLAIM
                      </button>
                    )}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Attributes Panel */}
        <div
          style={{
            backgroundColor: "#111",
            border: "2px solid #ffcc33",
            borderRadius: "0 30px 0 0",
            padding: "1.5rem",
          }}
        >
          <h2
            style={{
              color: "#ffcc33",
              fontSize: "0.85rem",
              letterSpacing: "2px",
              marginBottom: "1rem",
              textTransform: "uppercase",
            }}
          >
            Attributes
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {(
              Object.entries(member.attributes) as [
                keyof CrewMember["attributes"],
                number | null,
              ][]
            ).map(([attr, value]) => (
              <div key={attr}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.25rem",
                  }}
                >
                  <span style={{ color: "#ffcc33", fontSize: "0.8rem", letterSpacing: "1px" }}>
                    {attr}
                  </span>

                  {editMode ? (
                    <input
                      type="number"
                      min={0}
                      max={6}
                      value={value !== null ? value : ""}
                      placeholder="—"
                      onChange={(e) => handleAttributeChange(attr, e.target.value)}
                      style={{
                        ...inputStyle("#ffcc33"),
                        width: "60px",
                        textAlign: "center",
                      }}
                    />
                  ) : (
                    <span
                      style={{ color: value !== null ? "#fff" : "#444", fontSize: "0.85rem" }}
                    >
                      {value !== null ? value : "---"}
                    </span>
                  )}
                </div>

                {/* Attribute bar */}
                <div
                  style={{
                    background: "#222",
                    height: "8px",
                    borderRadius: "4px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: value !== null ? `${(value / 6) * 100}%` : "0%",
                      height: "100%",
                      backgroundColor: value !== null ? "#ffcc33" : "transparent",
                      borderRadius: "4px",
                      transition: "width 0.3s ease-out",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Advantages & Disadvantages row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        {/* Advantages */}
        <div
          style={{
            backgroundColor: "#111",
            border: "2px solid #33cc99",
            borderRadius: "0 30px 0 0",
            padding: "1.5rem",
          }}
        >
          <h2
            style={{
              color: "#33cc99",
              fontSize: "0.85rem",
              letterSpacing: "2px",
              marginBottom: "0.75rem",
              textTransform: "uppercase",
            }}
          >
            Advantages
          </h2>

          {member.advantages.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
                marginBottom: editMode ? "0.75rem" : 0,
              }}
            >
              {member.advantages.map((adv, i) => (
                <span
                  key={i}
                  style={{
                    backgroundColor: "#33cc9920",
                    border: "1px solid #33cc99",
                    borderRadius: "20px",
                    padding: "0.3rem 0.8rem",
                    color: "#33cc99",
                    fontSize: "0.8rem",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  {adv}
                  {editMode && (
                    <button
                      onClick={() => handleRemoveAdvantage(i)}
                      aria-label={`Remove advantage: ${adv}`}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#cc3333",
                        cursor: "pointer",
                        fontFamily: "'Orbitron', sans-serif",
                        fontSize: "0.9rem",
                        fontWeight: "bold",
                        lineHeight: 1,
                        padding: "0",
                      }}
                    >
                      x
                    </button>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <p
              style={{
                color: "#33cc9960",
                fontSize: "0.85rem",
                fontStyle: "italic",
                margin: 0,
                marginBottom: editMode ? "0.75rem" : 0,
              }}
            >
              NO DATA ON FILE
            </p>
          )}

          {editMode && (
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
              />
              <button
                onClick={handleAddAdvantage}
                style={{
                  backgroundColor: "#33cc99",
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
                }}
              >
                ADD
              </button>
            </div>
          )}
        </div>

        {/* Disadvantages */}
        <div
          style={{
            backgroundColor: "#111",
            border: "2px solid #cc6666",
            borderRadius: "0 30px 0 0",
            padding: "1.5rem",
          }}
        >
          <h2
            style={{
              color: "#cc6666",
              fontSize: "0.85rem",
              letterSpacing: "2px",
              marginBottom: "0.75rem",
              textTransform: "uppercase",
            }}
          >
            Disadvantages
          </h2>

          {member.disadvantages.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
                marginBottom: editMode ? "0.75rem" : 0,
              }}
            >
              {member.disadvantages.map((dis, i) => (
                <span
                  key={i}
                  style={{
                    backgroundColor: "#cc666620",
                    border: "1px solid #cc6666",
                    borderRadius: "20px",
                    padding: "0.3rem 0.8rem",
                    color: "#cc6666",
                    fontSize: "0.8rem",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  {dis}
                  {editMode && (
                    <button
                      onClick={() => handleRemoveDisadvantage(i)}
                      aria-label={`Remove disadvantage: ${dis}`}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#cc3333",
                        cursor: "pointer",
                        fontFamily: "'Orbitron', sans-serif",
                        fontSize: "0.9rem",
                        fontWeight: "bold",
                        lineHeight: 1,
                        padding: "0",
                      }}
                    >
                      x
                    </button>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <p
              style={{
                color: "#cc666660",
                fontSize: "0.85rem",
                fontStyle: "italic",
                margin: 0,
                marginBottom: editMode ? "0.75rem" : 0,
              }}
            >
              NO DATA ON FILE
            </p>
          )}

          {editMode && (
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
              />
              <button
                onClick={handleAddDisadvantage}
                style={{
                  backgroundColor: "#cc6666",
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
                }}
              >
                ADD
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Skills (Specializations) Panel */}
      {(editMode || member.skills.length > 0) && (
        <div
          style={{
            backgroundColor: "#111",
            border: "2px solid #66ccff",
            borderRadius: "0 30px 0 0",
            padding: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <h2
            style={{
              color: "#66ccff",
              fontSize: "0.85rem",
              letterSpacing: "2px",
              marginBottom: "0.75rem",
              textTransform: "uppercase",
            }}
          >
            Skills / Specializations
          </h2>

          {member.skills.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
                marginBottom: editMode ? "0.75rem" : 0,
              }}
            >
              {member.skills.map((skill, i) => (
                <span
                  key={i}
                  style={{
                    backgroundColor: "#66ccff20",
                    border: "1px solid #66ccff",
                    borderRadius: "20px",
                    padding: "0.3rem 0.8rem",
                    color: "#66ccff",
                    fontSize: "0.8rem",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  {skill}
                  {editMode && (
                    <button
                      onClick={() => handleRemoveSkill(i)}
                      aria-label={`Remove skill: ${skill}`}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#3399cc",
                        cursor: "pointer",
                        fontFamily: "'Orbitron', sans-serif",
                        fontSize: "0.9rem",
                        fontWeight: "bold",
                        lineHeight: 1,
                        padding: "0",
                      }}
                    >
                      x
                    </button>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <p
              style={{
                color: "#66ccff60",
                fontSize: "0.85rem",
                fontStyle: "italic",
                margin: 0,
                marginBottom: editMode ? "0.75rem" : 0,
              }}
            >
              NO DATA ON FILE
            </p>
          )}

          {editMode && (
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <input
                type="text"
                value={newSkill}
                placeholder="New skill / specialization..."
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
                style={{ ...inputStyle("#66ccff"), flex: 1 }}
              />
              <button
                onClick={handleAddSkill}
                style={{
                  backgroundColor: "#66ccff",
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
                }}
              >
                ADD
              </button>
            </div>
          )}
        </div>
      )}

      {/* Notes Panel */}
      {(editMode || member.notes) && (
        <div
          style={{
            backgroundColor: "#111",
            border: "2px solid #888",
            borderRadius: "0 30px 0 0",
            padding: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <h2
            style={{
              color: "#888",
              fontSize: "0.85rem",
              letterSpacing: "2px",
              marginBottom: "0.75rem",
              textTransform: "uppercase",
            }}
          >
            Personnel Notes
          </h2>
          {editMode ? (
            <textarea
              value={member.notes}
              placeholder="Enter personnel notes..."
              onChange={(e) => handleFieldChange("notes", e.target.value)}
              rows={4}
              style={{
                ...inputStyle("#888"),
                resize: "vertical",
                lineHeight: "1.6",
              }}
            />
          ) : (
            <p style={{ color: "#aaa", lineHeight: "1.6", fontSize: "0.9rem", margin: 0 }}>
              {member.notes}
            </p>
          )}
        </div>
      )}

      {/* Edit-mode action buttons */}
      {editMode && (
        <div
          style={{
            display: "flex",
            gap: "1rem",
            justifyContent: "flex-end",
            marginBottom: "1.5rem",
          }}
        >
          <button
            onClick={handleDelete}
            style={{
              backgroundColor: "#cc0000",
              border: "none",
              borderRadius: "4px",
              color: "#fff",
              cursor: "pointer",
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "0.75rem",
              fontWeight: "bold",
              letterSpacing: "1px",
              padding: "0.5rem 1.25rem",
            }}
          >
            DELETE CREW MEMBER
          </button>
        </div>
      )}

      {/* Bottom LCARS bar */}
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          height: "45px",
        }}
      >
        <div
          style={{
            width: "80px",
            backgroundColor: "#9933cc",
            borderRadius: "20px 0 0 20px",
          }}
        />
        <Link
          to="/crew"
          style={{
            flex: 1,
            backgroundColor: accentColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#000",
            fontWeight: "bold",
            textDecoration: "none",
            letterSpacing: "2px",
            fontSize: "0.9rem",
          }}
        >
          RETURN TO CREW ROSTER
        </Link>
        <div
          style={{
            width: "20px",
            backgroundColor: accentColor,
            borderRadius: "0 20px 20px 0",
          }}
        />
      </div>
    </div>
  );
};

export default CrewPage;
