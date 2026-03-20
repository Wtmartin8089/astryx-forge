import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import {
  getSystem,
  subscribeToSystemPlanets,
  subscribeToSystemSpecies,
  subscribeToCreaturesBySystem,
  deleteSystem,
  updateSystem,
  importStarMapPlanets,
} from "../utils/systemsFirestore";
import type { StarSystem } from "../utils/systemsFirestore";
import "../assets/lcars.css";

const SystemDashboard = () => {
  const { systemId } = useParams<{ systemId: string }>();
  const navigate = useNavigate();
  const [system, setSystem] = useState<StarSystem | null>(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [planetCount, setPlanetCount] = useState(0);
  const [speciesCount, setSpeciesCount] = useState(0);
  const [creatureCount, setCreatureCount] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");

  const openEdit = () => {
    if (!system) return;
    setForm({
      name: system.name || "",
      region: system.region || "",
      sector: system.sector || "",
      stellarClass: system.stellarClass || "",
      starType: system.starType || "",
      numberOfStars: system.numberOfStars || "",
      numberOfPlanets: system.numberOfPlanets || "",
      allegiance: system.allegiance || "",
      explorationStatus: system.explorationStatus || "",
      notableFeatures: system.notableFeatures || "",
      knownPlanets: system.knownPlanets || "",
      hazards: system.hazards || "",
      description: system.description || "",
    });
    setEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!systemId) return;
    setSaving(true);
    await updateSystem(systemId, form);
    setSystem((prev) => prev ? { ...prev, ...form } : prev);
    setSaving(false);
    setEditing(false);
  };

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!systemId) return;
    getSystem(systemId).then((s) => {
      setSystem(s);
      setLoading(false);
      setTimeout(() => setVisible(true), 50);
    });
    const unsubPlanets = subscribeToSystemPlanets(systemId, (p) => setPlanetCount(p.length));
    const unsubSpecies = subscribeToSystemSpecies(systemId, (s) => setSpeciesCount(s.length));
    const unsubCreatures = subscribeToCreaturesBySystem(systemId, (c) => setCreatureCount(c.length));
    return () => { unsubPlanets(); unsubSpecies(); unsubCreatures(); };
  }, [systemId]);

  if (loading) {
    return (
      <p style={{ color: "#ffcc33", textAlign: "center", fontFamily: "'Orbitron', sans-serif", marginTop: "4rem" }}>
        Accessing system database...
      </p>
    );
  }

  if (!system) {
    return (
      <p style={{ color: "#cc3333", textAlign: "center", fontFamily: "'Orbitron', sans-serif", marginTop: "4rem" }}>
        System not found.
      </p>
    );
  }

  const sections = [
    {
      label: "Planets",
      count: planetCount,
      color: "#6699cc",
      icon: "◉",
      path: `/systems/${systemId}/planets`,
      desc: "Surveyed worlds and planetary bodies",
    },
    {
      label: "Species",
      count: speciesCount,
      color: "#cc6666",
      icon: "◈",
      path: `/systems/${systemId}/species`,
      desc: "Humanoid races and biological catalogues",
    },
    {
      label: "Creatures",
      count: creatureCount,
      color: "#33cc99",
      icon: "◆",
      path: `/systems/${systemId}/creatures`,
      desc: "Indigenous fauna and xenobiology",
    },
    {
      label: "Discoveries",
      count: 0,
      color: "#9933cc",
      icon: "◎",
      path: `/systems/${systemId}/discoveries`,
      desc: "Anomalies, artifacts, and field notes",
      placeholder: true,
    },
  ];

  return (
    <div
      style={{
        maxWidth: "960px",
        margin: "0 auto",
        padding: "2rem",
        fontFamily: "'Orbitron', sans-serif",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-30px)",
        transition: "opacity 0.5s ease-out, transform 0.5s ease-out",
      }}
    >
      {/* Breadcrumb */}
      <p style={{ color: "#555", fontSize: "0.65rem", letterSpacing: "2px", marginBottom: "1rem", textTransform: "uppercase" }}>
        <Link to="/systems" style={{ color: "#ffcc3380", textDecoration: "none" }}>Star Systems</Link>
        {" / "}
        <span style={{ color: "#ffcc33" }}>{system.name}</span>
      </p>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "stretch", marginBottom: "2rem", height: "56px" }}>
        <div style={{ width: "20px", backgroundColor: "#ffcc33", borderRadius: "20px 0 0 0" }} />
        <div
          style={{
            flex: 1,
            backgroundColor: "#ffcc33",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 2rem",
          }}
        >
          <div>
            <h1 style={{ margin: 0, color: "#000", fontSize: "1.5rem", fontWeight: "bold", letterSpacing: "3px", textTransform: "uppercase" }}>
              {system.name}
            </h1>
            {system.region && (
              <p style={{ margin: 0, color: "#00000060", fontSize: "0.65rem", letterSpacing: "2px", textTransform: "uppercase" }}>
                {system.region}
              </p>
            )}
          </div>
          <button
            onClick={openEdit}
            style={{ backgroundColor: "#00000025", border: "none", borderRadius: "20px", color: "#000", fontFamily: "'Orbitron', sans-serif", fontSize: "0.6rem", fontWeight: "bold", letterSpacing: "1.5px", padding: "0.35rem 1rem", cursor: "pointer" }}
          >
            EDIT SYSTEM
          </button>
        </div>
        <div style={{ width: "80px", backgroundColor: "#9933cc", borderRadius: "0 20px 20px 0" }} />
      </div>

      {/* Edit form */}
      {editing && (() => {
        const iStyle: React.CSSProperties = { width: "100%", backgroundColor: "#0a0a0a", border: "1px solid #ffcc3340", borderRadius: "4px", color: "#ccc", padding: "0.5rem 0.75rem", fontFamily: "'Orbitron', sans-serif", fontSize: "0.8rem", boxSizing: "border-box" };
        const lbl = (t: string) => <label style={{ display: "block", color: "#555", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.4rem" }}>{t}</label>;
        return (
          <form onSubmit={handleSave} style={{ backgroundColor: "#111", border: "1px solid #ffcc3330", borderTop: "3px solid #ffcc33", borderRadius: "4px", padding: "1.75rem", marginBottom: "1.5rem" }}>
            <p style={{ color: "#ffcc33", fontSize: "0.65rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "1.25rem" }}>— Edit System Record —</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>{lbl("System Name *")}<input value={form.name} onChange={(e) => set("name", e.target.value)} style={iStyle} required /></div>
              <div>{lbl("Region")}<input value={form.region} onChange={(e) => set("region", e.target.value)} placeholder="e.g. Delta Quadrant" style={iStyle} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>{lbl("Sector")}<input value={form.sector} onChange={(e) => set("sector", e.target.value)} placeholder="e.g. Sector 001" style={iStyle} /></div>
              <div>{lbl("Allegiance")}
                <select value={form.allegiance} onChange={(e) => set("allegiance", e.target.value)} style={{ ...iStyle, cursor: "pointer" }}>
                  <option value="">— Select —</option>
                  <option>Federation Space</option><option>Klingon Empire</option><option>Romulan Empire</option>
                  <option>Cardassian Union</option><option>Dominion</option><option>Neutral Zone</option>
                  <option>Independent</option><option>Unknown / Unexplored</option>
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>{lbl("Stellar Class")}
                <select value={form.stellarClass} onChange={(e) => set("stellarClass", e.target.value)} style={{ ...iStyle, cursor: "pointer" }}>
                  <option value="">— Select —</option>
                  <option>Class O (Blue)</option><option>Class B (Blue-White)</option><option>Class A (White)</option>
                  <option>Class F (Yellow-White)</option><option>Class G (Yellow)</option><option>Class K (Orange)</option>
                  <option>Class M (Red)</option><option>Class L (Red Dwarf)</option><option>White Dwarf</option>
                  <option>Neutron Star</option><option>Black Hole</option><option>Unknown</option>
                </select>
              </div>
              <div>{lbl("Star Type")}
                <select value={form.starType} onChange={(e) => set("starType", e.target.value)} style={{ ...iStyle, cursor: "pointer" }}>
                  <option value="">— Select —</option>
                  <option>Single</option><option>Binary</option><option>Trinary</option>
                  <option>Variable</option><option>Pulsar</option><option>Other</option>
                </select>
              </div>
              <div>{lbl("Number of Stars")}<input value={form.numberOfStars} onChange={(e) => set("numberOfStars", e.target.value)} placeholder="e.g. 1" style={iStyle} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>{lbl("Number of Planets / Orbital Bodies")}<input value={form.numberOfPlanets} onChange={(e) => set("numberOfPlanets", e.target.value)} placeholder="e.g. 6 planets, 2 asteroid belts" style={iStyle} /></div>
              <div>{lbl("Exploration Status")}
                <select value={form.explorationStatus} onChange={(e) => set("explorationStatus", e.target.value)} style={{ ...iStyle, cursor: "pointer" }}>
                  <option value="">— Select —</option>
                  <option>Unexplored</option><option>Partially Surveyed</option><option>Fully Surveyed</option>
                  <option>Restricted</option><option>Classified</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: "1rem" }}>{lbl("Notable Features")}<textarea value={form.notableFeatures} onChange={(e) => set("notableFeatures", e.target.value)} rows={2} style={{ ...iStyle, resize: "vertical" }} /></div>
            <div style={{ marginBottom: "1rem" }}>{lbl("Planet Names")}<textarea value={form.knownPlanets} onChange={(e) => set("knownPlanets", e.target.value)} rows={2} style={{ ...iStyle, resize: "vertical" }} /></div>
            <div style={{ marginBottom: "1rem" }}>{lbl("Hazards")}<textarea value={form.hazards} onChange={(e) => set("hazards", e.target.value)} rows={2} style={{ ...iStyle, resize: "vertical" }} /></div>
            <div style={{ marginBottom: "1.25rem" }}>{lbl("Description")}<textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={4} style={{ ...iStyle, resize: "vertical" }} /></div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button type="button" onClick={() => setEditing(false)} style={{ backgroundColor: "transparent", border: "1px solid #333", borderRadius: "20px", color: "#666", fontFamily: "'Orbitron', sans-serif", fontSize: "0.65rem", letterSpacing: "1.5px", padding: "0.5rem 1.2rem", cursor: "pointer" }}>CANCEL</button>
              <button type="submit" disabled={saving || !form.name.trim()} style={{ backgroundColor: saving ? "#ffcc3340" : "#ffcc33", border: "none", borderRadius: "20px", color: "#000", fontFamily: "'Orbitron', sans-serif", fontSize: "0.65rem", fontWeight: "bold", letterSpacing: "1.5px", padding: "0.5rem 1.4rem", cursor: saving ? "not-allowed" : "pointer" }}>{saving ? "SAVING..." : "SAVE SYSTEM"}</button>
            </div>
          </form>
        );
      })()}

      {/* System stats grid */}
      {(system.stellarClass || system.starType || system.numberOfStars || system.numberOfPlanets || system.sector || system.allegiance || system.explorationStatus) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.6rem", marginBottom: "1.25rem" }}>
          {[
            { label: "Stellar Class", value: system.stellarClass },
            { label: "Star Type", value: system.starType },
            { label: "Stars", value: system.numberOfStars },
            { label: "Orbital Bodies", value: system.numberOfPlanets },
            { label: "Sector", value: system.sector },
            { label: "Allegiance", value: system.allegiance },
            { label: "Exploration Status", value: system.explorationStatus },
          ].filter((f) => f.value).map((f) => (
            <div key={f.label} style={{ backgroundColor: "#111", border: "1px solid #ffcc3318", borderRadius: "4px", padding: "0.6rem 0.8rem" }}>
              <p style={{ color: "#555", fontSize: "0.58rem", letterSpacing: "1.5px", textTransform: "uppercase", margin: "0 0 0.2rem" }}>{f.label}</p>
              <p style={{ color: "#ffcc33", fontSize: "0.8rem", margin: 0 }}>{f.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Known Planets */}
      {system.knownPlanets && (
        <div style={{ backgroundColor: "#111", border: "1px solid #6699cc20", borderLeft: "3px solid #6699cc", borderRadius: "0 8px 0 0", padding: "0.8rem 1rem", marginBottom: "1.25rem" }}>
          <p style={{ color: "#555", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.3rem" }}>Planet Names</p>
          <p style={{ color: "#ccc", fontSize: "0.85rem", margin: 0 }}>{system.knownPlanets}</p>
        </div>
      )}

      {/* Notable Features + Hazards */}
      {(system.notableFeatures || system.hazards) && (
        <div style={{ display: "grid", gridTemplateColumns: system.notableFeatures && system.hazards ? "1fr 1fr" : "1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
          {system.notableFeatures && (
            <div style={{ backgroundColor: "#111", border: "1px solid #9933cc20", borderLeft: "3px solid #9933cc", borderRadius: "0 8px 0 0", padding: "0.8rem 1rem" }}>
              <p style={{ color: "#555", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.3rem" }}>Notable Features</p>
              <p style={{ color: "#ccc", fontSize: "0.82rem", lineHeight: "1.6", margin: 0 }}>{system.notableFeatures}</p>
            </div>
          )}
          {system.hazards && (
            <div style={{ backgroundColor: "#111", border: "1px solid #cc333320", borderLeft: "3px solid #cc3333", borderRadius: "0 8px 0 0", padding: "0.8rem 1rem" }}>
              <p style={{ color: "#555", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.3rem" }}>Hazards</p>
              <p style={{ color: "#ccc", fontSize: "0.82rem", lineHeight: "1.6", margin: 0 }}>{system.hazards}</p>
            </div>
          )}
        </div>
      )}

      {/* Description */}
      {system.description && (
        <div
          style={{
            backgroundColor: "#111",
            border: "1px solid #ffcc3320",
            borderLeft: "3px solid #ffcc33",
            borderRadius: "0 8px 0 0",
            padding: "1rem 1.25rem",
            marginBottom: "2rem",
          }}
        >
          <p style={{ color: "#555", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.3rem" }}>Overview</p>
          <p style={{ color: "#aaa", fontSize: "0.88rem", lineHeight: "1.7", margin: 0 }}>{system.description}</p>
        </div>
      )}

      {/* Section cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>
        {sections.map((sec) => (
          <Link
            key={sec.label}
            to={sec.path}
            style={{ textDecoration: "none", pointerEvents: sec.placeholder ? "none" : "auto" }}
          >
            <div
              style={{
                backgroundColor: "#111",
                border: `1px solid ${sec.color}30`,
                borderLeft: `4px solid ${sec.placeholder ? sec.color + "60" : sec.color}`,
                borderRadius: "0 16px 0 0",
                padding: "1.4rem 1.5rem",
                cursor: sec.placeholder ? "default" : "pointer",
                transition: "border-color 0.25s, box-shadow 0.25s",
                opacity: sec.placeholder ? 0.55 : 1,
              }}
              onMouseEnter={(e) => {
                if (sec.placeholder) return;
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = sec.color;
                el.style.boxShadow = `0 0 18px ${sec.color}20`;
              }}
              onMouseLeave={(e) => {
                if (sec.placeholder) return;
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = `${sec.color}30`;
                el.style.borderLeftColor = sec.color;
                el.style.boxShadow = "none";
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.6rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ color: sec.color, fontSize: "1.4rem", lineHeight: 1 }}>{sec.icon}</span>
                  <h2 style={{ color: "#fff", fontSize: "1rem", margin: 0, letterSpacing: "1.5px" }}>{sec.label}</h2>
                </div>
                <span
                  style={{
                    backgroundColor: `${sec.color}15`,
                    border: `1px solid ${sec.color}40`,
                    borderRadius: "12px",
                    color: sec.color,
                    fontSize: "0.65rem",
                    padding: "0.2rem 0.65rem",
                    letterSpacing: "1px",
                  }}
                >
                  {sec.placeholder ? "COMING SOON" : `${sec.count} RECORD${sec.count !== 1 ? "S" : ""}`}
                </span>
              </div>
              <p style={{ color: "#666", fontSize: "0.72rem", margin: 0, letterSpacing: "1px", textTransform: "uppercase" }}>
                {sec.desc}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Import star map planets */}
      {planetCount === 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "1rem", gap: "0.5rem" }}>
          <button
            onClick={async () => {
              if (!systemId) return;
              setImporting(true);
              setImportError("");
              try {
                const user = getAuth().currentUser;
                const createdBy = user?.email || user?.uid || "Unknown";
                const count = await importStarMapPlanets(systemId, createdBy);
                if (count === 0) setImportError("No planets found in the planets collection. Run 'npm run seed' first.");
              } catch (err: any) {
                setImportError(err?.message || "Import failed. Check Firestore rules.");
              }
              setImporting(false);
            }}
            disabled={importing}
            style={{ backgroundColor: importing ? "#6699cc20" : "#6699cc15", border: "1px solid #6699cc", borderRadius: "20px", color: "#6699cc", fontFamily: "'Orbitron', sans-serif", fontSize: "0.65rem", fontWeight: "bold", letterSpacing: "1.5px", padding: "0.5rem 1.4rem", cursor: importing ? "not-allowed" : "pointer" }}
          >
            {importing ? "IMPORTING PLANETS..." : "↓ IMPORT STAR MAP PLANETS"}
          </button>
          {importError && <p style={{ color: "#cc3333", fontSize: "0.7rem", fontFamily: "'Orbitron', sans-serif", margin: 0 }}>{importError}</p>}
        </div>
      )}

      {/* Delete system */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1.5rem" }}>
        {confirmDelete ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ color: "#cc3333", fontSize: "0.7rem", letterSpacing: "1px" }}>DELETE THIS SYSTEM?</span>
            <button
              onClick={async () => { setDeleting(true); await deleteSystem(systemId!); navigate("/systems"); }}
              disabled={deleting}
              style={{ backgroundColor: "#cc3333", border: "none", borderRadius: "20px", color: "#fff", fontFamily: "'Orbitron', sans-serif", fontSize: "0.65rem", fontWeight: "bold", letterSpacing: "1.5px", padding: "0.45rem 1.2rem", cursor: "pointer" }}
            >
              {deleting ? "DELETING..." : "YES, DELETE"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{ backgroundColor: "transparent", border: "1px solid #333", borderRadius: "20px", color: "#666", fontFamily: "'Orbitron', sans-serif", fontSize: "0.65rem", letterSpacing: "1.5px", padding: "0.45rem 1.2rem", cursor: "pointer" }}
            >
              CANCEL
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{ backgroundColor: "transparent", border: "1px solid #cc333360", borderRadius: "20px", color: "#cc3333", fontFamily: "'Orbitron', sans-serif", fontSize: "0.65rem", letterSpacing: "1.5px", padding: "0.45rem 1.2rem", cursor: "pointer" }}
          >
            DELETE SYSTEM
          </button>
        )}
      </div>

      {/* Bottom bar */}
      <div style={{ display: "flex", alignItems: "stretch", height: "45px" }}>
        <div style={{ width: "80px", backgroundColor: "#9933cc", borderRadius: "20px 0 0 20px" }} />
        <Link
          to="/systems"
          style={{
            flex: 1,
            backgroundColor: "#ffcc33",
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
          RETURN TO STAR SYSTEMS
        </Link>
        <div style={{ width: "20px", backgroundColor: "#ffcc33", borderRadius: "0 20px 20px 0" }} />
      </div>
    </div>
  );
};

export default SystemDashboard;
