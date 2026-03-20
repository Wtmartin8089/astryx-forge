import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { subscribeToSystems, createSystem, importStarMapPlanets } from "../utils/systemsFirestore";
import type { StarSystem } from "../utils/systemsFirestore";
import "../assets/lcars.css";

const auth = getAuth();

const SystemsList = () => {
  const [systems, setSystems] = useState<StarSystem[]>([]);
  const [visible, setVisible] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importName, setImportName] = useState("Machida Star System");
  const [importing, setImporting] = useState(false);
  const navigate = useNavigate();

  const blankForm = {
    name: "", region: "", sector: "", stellarClass: "", starType: "",
    numberOfStars: "", numberOfPlanets: "", allegiance: "", explorationStatus: "",
    hazards: "", notableFeatures: "", knownPlanets: "", description: "",
  };
  const [form, setForm] = useState(blankForm);
  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  useEffect(() => {
    const unsub = subscribeToSystems(setSystems);
    const timer = setTimeout(() => setVisible(true), 50);
    return () => { unsub(); clearTimeout(timer); };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const currentUser = auth.currentUser;
    const id = await createSystem({
      ...form,
      name: form.name.trim(),
      createdBy: currentUser?.email || currentUser?.uid || "Unknown",
    });
    setSaving(false);
    setForm(blankForm);
    navigate(`/systems/${id}`);
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importName.trim()) return;
    setImporting(true);
    const currentUser = auth.currentUser;
    const createdBy = currentUser?.email || currentUser?.uid || "Unknown";
    const id = await createSystem({
      name: importName.trim(),
      region: "", sector: "", stellarClass: "", starType: "",
      numberOfStars: "", numberOfPlanets: "", allegiance: "",
      explorationStatus: "Partially Surveyed", hazards: "",
      notableFeatures: "", knownPlanets: "", description: "",
      createdBy,
    });
    await importStarMapPlanets(id, createdBy);
    setImporting(false);
    navigate(`/systems/${id}`);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: "#0a0a0a",
    border: "1px solid #6699cc40",
    borderRadius: "4px",
    color: "#ccc",
    padding: "0.5rem 0.75rem",
    fontFamily: "'Orbitron', sans-serif",
    fontSize: "0.8rem",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "2rem",
        fontFamily: "'Orbitron', sans-serif",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-30px)",
        transition: "opacity 0.5s ease-out, transform 0.5s ease-out",
      }}
    >
      {/* LCARS Header */}
      <div style={{ display: "flex", alignItems: "stretch", marginBottom: "2rem", height: "50px" }}>
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
          <h1 style={{ margin: 0, color: "#000", fontSize: "1.6rem", fontWeight: "bold", letterSpacing: "3px", textTransform: "uppercase" }}>
            Star Systems Database
          </h1>
          <span style={{ color: "#00000080", fontSize: "0.7rem", letterSpacing: "1px" }}>
            {systems.length} SYSTEM{systems.length !== 1 ? "S" : ""}
          </span>
        </div>
        <div style={{ width: "80px", backgroundColor: "#9933cc", borderRadius: "0 20px 20px 0" }} />
      </div>

      {/* Action bar */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <button
          onClick={() => { setShowImport((v) => !v); setShowForm(false); }}
          style={{
            backgroundColor: showImport ? "#33cc9920" : "transparent",
            border: "1px solid #33cc99",
            borderRadius: "20px",
            color: "#33cc99",
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "0.65rem",
            letterSpacing: "1.5px",
            padding: "0.4rem 1.2rem",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          {showImport ? "CANCEL" : "↓ IMPORT STAR MAP"}
        </button>
        <button
          onClick={() => { setShowForm((v) => !v); setShowImport(false); }}
          style={{
            backgroundColor: showForm ? "#ffcc3340" : "#ffcc3320",
            border: "1px solid #ffcc33",
            borderRadius: "20px",
            color: "#ffcc33",
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "0.65rem",
            letterSpacing: "1.5px",
            padding: "0.4rem 1.2rem",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          {showForm ? "CANCEL" : "+ CATALOG NEW SYSTEM"}
        </button>
      </div>

      {/* Import form */}
      {showImport && (
        <form onSubmit={handleImport} style={{ backgroundColor: "#111", border: "1px solid #33cc9930", borderTop: "3px solid #33cc99", borderRadius: "4px", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <p style={{ color: "#33cc99", fontSize: "0.65rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "1rem" }}>
            Import Star Map Planets as a New System
          </p>
          <p style={{ color: "#666", fontSize: "0.72rem", lineHeight: "1.6", marginBottom: "1.2rem" }}>
            This will create a new star system and copy all planets from the star map (Acathla, Kralik, Machida, etc.) into it as catalogued planets. Any data you've already edited on those planet pages will carry over.
          </p>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", color: "#555", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.4rem" }}>System Name *</label>
            <input
              type="text"
              value={importName}
              onChange={(e) => setImportName(e.target.value)}
              style={{ width: "100%", backgroundColor: "#0a0a0a", border: "1px solid #33cc9940", borderRadius: "4px", color: "#ccc", padding: "0.5rem 0.75rem", fontFamily: "'Orbitron', sans-serif", fontSize: "0.8rem", boxSizing: "border-box" }}
              required
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" disabled={importing || !importName.trim()} style={{ backgroundColor: importing ? "#33cc9940" : "#33cc99", border: "none", borderRadius: "20px", color: "#000", fontFamily: "'Orbitron', sans-serif", fontSize: "0.65rem", fontWeight: "bold", letterSpacing: "1.5px", padding: "0.5rem 1.4rem", cursor: importing ? "not-allowed" : "pointer" }}>
              {importing ? "IMPORTING..." : "IMPORT PLANETS"}
            </button>
          </div>
        </form>
      )}

      {/* New System Form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          style={{
            backgroundColor: "#111",
            border: "1px solid #ffcc3330",
            borderTop: "3px solid #ffcc33",
            borderRadius: "4px",
            padding: "1.75rem",
            marginBottom: "1.5rem",
          }}
        >
          {/* Row 1: Name + Region */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ display: "block", color: "#555", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.4rem" }}>System Name *</label>
              <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Machida System" style={inputStyle} required />
            </div>
            <div>
              <label style={{ display: "block", color: "#555", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.4rem" }}>Region</label>
              <input type="text" value={form.region} onChange={(e) => set("region", e.target.value)} placeholder="e.g. Delta Quadrant" style={inputStyle} />
            </div>
          </div>

          {/* Row 2: Sector + Allegiance */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ display: "block", color: "#555", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.4rem" }}>Sector</label>
              <input type="text" value={form.sector} onChange={(e) => set("sector", e.target.value)} placeholder="e.g. Sector 001, Grid 26" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", color: "#555", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.4rem" }}>Allegiance</label>
              <select value={form.allegiance} onChange={(e) => set("allegiance", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="">— Select —</option>
                <option>Federation Space</option>
                <option>Klingon Empire</option>
                <option>Romulan Empire</option>
                <option>Cardassian Union</option>
                <option>Dominion</option>
                <option>Neutral Zone</option>
                <option>Independent</option>
                <option>Unknown / Unexplored</option>
              </select>
            </div>
          </div>

          {/* Row 3: Stellar Class + Star Type + Number of Stars */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ display: "block", color: "#555", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.4rem" }}>Stellar Class</label>
              <select value={form.stellarClass} onChange={(e) => set("stellarClass", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="">— Select —</option>
                <option>Class O (Blue)</option>
                <option>Class B (Blue-White)</option>
                <option>Class A (White)</option>
                <option>Class F (Yellow-White)</option>
                <option>Class G (Yellow)</option>
                <option>Class K (Orange)</option>
                <option>Class M (Red)</option>
                <option>Class L (Red Dwarf)</option>
                <option>White Dwarf</option>
                <option>Neutron Star</option>
                <option>Black Hole</option>
                <option>Unknown</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", color: "#555", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.4rem" }}>Star Type</label>
              <select value={form.starType} onChange={(e) => set("starType", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="">— Select —</option>
                <option>Single</option>
                <option>Binary</option>
                <option>Trinary</option>
                <option>Variable</option>
                <option>Pulsar</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", color: "#555", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.4rem" }}>Number of Stars</label>
              <input type="text" value={form.numberOfStars} onChange={(e) => set("numberOfStars", e.target.value)} placeholder="e.g. 1, 2" style={inputStyle} />
            </div>
          </div>

          {/* Row 4: Number of Planets + Exploration Status */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ display: "block", color: "#555", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.4rem" }}>Number of Planets / Orbital Bodies</label>
              <input type="text" value={form.numberOfPlanets} onChange={(e) => set("numberOfPlanets", e.target.value)} placeholder="e.g. 6 planets, 2 asteroid belts" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", color: "#555", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.4rem" }}>Exploration Status</label>
              <select value={form.explorationStatus} onChange={(e) => set("explorationStatus", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="">— Select —</option>
                <option>Unexplored</option>
                <option>Partially Surveyed</option>
                <option>Fully Surveyed</option>
                <option>Restricted</option>
                <option>Classified</option>
              </select>
            </div>
          </div>

          {/* Row 5: Notable Features */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", color: "#555", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.4rem" }}>Notable Features</label>
            <textarea value={form.notableFeatures} onChange={(e) => set("notableFeatures", e.target.value)} placeholder="Nebulae, wormholes, anomalies, asteroid fields, ancient ruins..." rows={2} style={{ ...inputStyle, resize: "vertical" }} />
          </div>

          {/* Row 5b: Known Planets */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", color: "#555", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.4rem" }}>Planet Names</label>
            <textarea value={form.knownPlanets} onChange={(e) => set("knownPlanets", e.target.value)} placeholder="e.g. Machida Prime, Machida II, Larconis..." rows={2} style={{ ...inputStyle, resize: "vertical" }} />
          </div>

          {/* Row 6: Hazards */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", color: "#555", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.4rem" }}>Hazards</label>
            <textarea value={form.hazards} onChange={(e) => set("hazards", e.target.value)} placeholder="Radiation belts, subspace interference, hostile fauna, ion storms..." rows={2} style={{ ...inputStyle, resize: "vertical" }} />
          </div>

          {/* Row 7: Description */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", color: "#555", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.4rem" }}>Description</label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="General overview of this star system..." rows={4} style={{ ...inputStyle, resize: "vertical" }} />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              style={{
                backgroundColor: saving || !form.name.trim() ? "#ffcc3340" : "#ffcc33",
                border: "none",
                borderRadius: "20px",
                color: "#000",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.65rem",
                fontWeight: "bold",
                letterSpacing: "1.5px",
                padding: "0.5rem 1.4rem",
                cursor: saving || !form.name.trim() ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "CREATING..." : "CREATE SYSTEM"}
            </button>
          </div>
        </form>
      )}

      {/* Systems Grid */}
      {systems.length === 0 ? (
        <p style={{ color: "#555", textAlign: "center", fontSize: "0.9rem", marginTop: "3rem" }}>
          No star systems catalogued yet.
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {systems.map((s) => (
            <Link key={s.id} to={`/systems/${s.id}`} style={{ textDecoration: "none" }}>
              <div
                style={{
                  backgroundColor: "#111",
                  border: "1px solid #ffcc3330",
                  borderLeft: "4px solid #ffcc33",
                  borderRadius: "0 12px 0 0",
                  padding: "1.1rem 1.25rem",
                  cursor: "pointer",
                  transition: "border-color 0.25s, box-shadow 0.25s",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = "#ffcc33";
                  el.style.boxShadow = "0 0 15px #ffcc3325";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = "#ffcc3330";
                  el.style.borderLeftColor = "#ffcc33";
                  el.style.boxShadow = "none";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.3rem" }}>
                  <h3 style={{ color: "#ffcc33", fontSize: "1rem", margin: 0 }}>{s.name}</h3>
                  {s.explorationStatus && (
                    <span style={{ backgroundColor: "#ffcc3315", border: "1px solid #ffcc3340", borderRadius: "10px", color: "#ffcc33", fontSize: "0.58rem", padding: "0.15rem 0.5rem", letterSpacing: "1px", whiteSpace: "nowrap", marginLeft: "0.5rem" }}>
                      {s.explorationStatus.toUpperCase()}
                    </span>
                  )}
                </div>
                {(s.region || s.sector) && (
                  <p style={{ color: "#888", fontSize: "0.7rem", margin: "0 0 0.4rem", letterSpacing: "1px", textTransform: "uppercase" }}>
                    {[s.region, s.sector].filter(Boolean).join(" · ")}
                  </p>
                )}
                {(s.stellarClass || s.starType || s.allegiance) && (
                  <p style={{ color: "#666", fontSize: "0.68rem", margin: "0 0 0.4rem", letterSpacing: "1px" }}>
                    {[s.stellarClass, s.starType, s.allegiance].filter(Boolean).join(" · ")}
                  </p>
                )}
                {s.description && (
                  <p style={{ color: "#aaa", fontSize: "0.78rem", margin: 0, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" } as any}>
                    {s.description}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Bottom bar */}
      <div style={{ display: "flex", alignItems: "stretch", height: "45px" }}>
        <div style={{ width: "80px", backgroundColor: "#9933cc", borderRadius: "20px 0 0 20px" }} />
        <Link
          to="/"
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
          RETURN TO STAR MAP
        </Link>
        <div style={{ width: "20px", backgroundColor: "#ffcc33", borderRadius: "0 20px 20px 0" }} />
      </div>
    </div>
  );
};

export default SystemsList;
