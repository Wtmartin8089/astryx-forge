import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { getSystem, createSystemPlanet } from "../utils/systemsFirestore";
import type { StarSystem } from "../utils/systemsFirestore";
import "../assets/lcars.css";

const auth = getAuth();

const blank = {
  name: "", classification: "", systemData: "", gravity: "",
  yearAndDay: "", atmosphere: "", hydrosphere: "", climate: "",
  sapientSpecies: "", techLevel: "", government: "", culture: "",
  affiliation: "", resources: "", placesOfNote: "", shipFacilities: "", otherDetail: "",
};

const SystemPlanetNew = () => {
  const { systemId } = useParams<{ systemId: string }>();
  const navigate = useNavigate();
  const [system, setSystem] = useState<StarSystem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(blank);

  useEffect(() => {
    if (systemId) getSystem(systemId).then(setSystem);
  }, [systemId]);

  const set = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !systemId) return;
    setSubmitting(true);
    const currentUser = auth.currentUser;
    const id = await createSystemPlanet({
      systemId,
      ...form,
      createdBy: currentUser?.email || currentUser?.uid || "Unknown",
    });
    navigate(`/systems/${systemId}/planets/${id}`);
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

  const lbl = (text: string) => (
    <label style={{ display: "block", color: "#555", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.4rem" }}>
      {text}
    </label>
  );

  const field1 = (label: string, key: string, placeholder = "") => (
    <div style={{ marginBottom: "1rem" }}>
      {lbl(label)}
      <input type="text" value={(form as any)[key]} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} style={inputStyle} />
    </div>
  );

  const fieldTA = (label: string, key: string, placeholder = "", rows = 2) => (
    <div style={{ marginBottom: "1rem" }}>
      {lbl(label)}
      <textarea value={(form as any)[key]} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} rows={rows} style={{ ...inputStyle, resize: "vertical" }} />
    </div>
  );

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto", padding: "2rem", fontFamily: "'Orbitron', sans-serif" }}>
      {/* Breadcrumb */}
      <p style={{ color: "#555", fontSize: "0.65rem", letterSpacing: "2px", marginBottom: "1rem", textTransform: "uppercase" }}>
        <Link to="/systems" style={{ color: "#ffcc3380", textDecoration: "none" }}>Star Systems</Link>
        {" / "}
        <Link to={`/systems/${systemId}`} style={{ color: "#ffcc3380", textDecoration: "none" }}>{system?.name || "..."}</Link>
        {" / "}
        <Link to={`/systems/${systemId}/planets`} style={{ color: "#6699cc80", textDecoration: "none" }}>Planets</Link>
        {" / "}
        <span style={{ color: "#6699cc" }}>New</span>
      </p>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "stretch", marginBottom: "2rem", height: "50px" }}>
        <div style={{ width: "20px", backgroundColor: "#6699cc", borderRadius: "20px 0 0 0" }} />
        <div style={{ flex: 1, backgroundColor: "#6699cc", display: "flex", alignItems: "center", padding: "0 2rem" }}>
          <h1 style={{ margin: 0, color: "#000", fontSize: "1.3rem", fontWeight: "bold", letterSpacing: "3px", textTransform: "uppercase" }}>
            Planetary Template
          </h1>
        </div>
        <div style={{ width: "80px", backgroundColor: "#9933cc", borderRadius: "0 20px 20px 0" }} />
      </div>

      <div style={{ backgroundColor: "#111", border: "1px solid #6699cc30", borderTop: "3px solid #6699cc", borderRadius: "4px", padding: "2rem" }}>
        <form onSubmit={handleSubmit}>

          {/* Row: Planet Name + Class */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              {lbl("Planet Name *")}
              <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Machida" style={inputStyle} required />
            </div>
            <div>
              {lbl("Class")}
              <input type="text" value={form.classification} onChange={(e) => set("classification", e.target.value)} placeholder="e.g. M" style={inputStyle} />
            </div>
          </div>

          {/* Row: System Data + Gravity */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              {lbl("System Data")}
              <input type="text" value={form.systemData} onChange={(e) => set("systemData", e.target.value)} placeholder="e.g. 2 Moons" style={inputStyle} />
            </div>
            <div>
              {lbl("Gravity")}
              <input type="text" value={form.gravity} onChange={(e) => set("gravity", e.target.value)} placeholder="e.g. 1.18 G" style={inputStyle} />
            </div>
          </div>

          {field1("Year and Day", "yearAndDay", "e.g. 360 days / 30 hrs. / day")}
          {field1("Atmosphere", "atmosphere", "e.g. Oxy/Nitro / High Ozone content / Earth-Norm. pressure")}
          {field1("Hydrosphere", "hydrosphere", "e.g. 50% Water (surface)")}
          {field1("Climate", "climate", "e.g. Sub-tropical")}
          {fieldTA("Sapient Species", "sapientSpecies", "e.g. Human - 20 mill. / Centaur - 20 mill. / Mixed races 10 mill.", 2)}
          {field1("Tech Level", "techLevel", "e.g. Lvl. 5-6")}
          {fieldTA("Government", "government", "e.g. Theocracy", 2)}
          {fieldTA("Culture", "culture", "e.g. Description of society and customs...", 3)}
          {field1("Affiliation", "affiliation", "e.g. Independent - UFP")}
          {fieldTA("Resources", "resources", "e.g. Dilithium (any form) / Gold & precious metals / Starship building materials", 2)}
          {fieldTA("Places of Note", "placesOfNote", "e.g. Drake Falls - 375 ft. H / 1.5 mil. W", 2)}
          {fieldTA("Ship Facilities", "shipFacilities", "e.g. Starship repair facilities / Starship building yards / Starbase orbiting planet", 3)}
          {fieldTA("Other Detail", "otherDetail", "Any additional planetary information...", 3)}

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
            <Link
              to={`/systems/${systemId}/planets`}
              style={{ backgroundColor: "transparent", border: "1px solid #333", borderRadius: "20px", color: "#666", fontFamily: "'Orbitron', sans-serif", fontSize: "0.65rem", letterSpacing: "1.5px", padding: "0.5rem 1.2rem", textDecoration: "none", display: "flex", alignItems: "center" }}
            >
              CANCEL
            </Link>
            <button
              type="submit"
              disabled={submitting || !form.name.trim()}
              style={{ backgroundColor: submitting || !form.name.trim() ? "#6699cc40" : "#6699cc", border: "none", borderRadius: "20px", color: "#000", fontFamily: "'Orbitron', sans-serif", fontSize: "0.65rem", fontWeight: "bold", letterSpacing: "1.5px", padding: "0.5rem 1.4rem", cursor: submitting || !form.name.trim() ? "not-allowed" : "pointer" }}
            >
              {submitting ? "CATALOGUING..." : "CREATE PLANET"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SystemPlanetNew;
