import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { getSystem, createSystemSpecies } from "../utils/systemsFirestore";
import type { StarSystem } from "../utils/systemsFirestore";
import "../assets/lcars.css";

const auth = getAuth();

const SystemSpeciesNew = () => {
  const { systemId } = useParams<{ systemId: string }>();
  const navigate = useNavigate();
  const [system, setSystem] = useState<StarSystem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    type: "",
    homeworld: "",
    biology: "",
    culture: "",
    notes: "",
  });

  useEffect(() => {
    if (systemId) getSystem(systemId).then(setSystem);
  }, [systemId]);

  const set = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !systemId) return;
    setSubmitting(true);
    const currentUser = auth.currentUser;
    const id = await createSystemSpecies({
      systemId,
      ...form,
      createdBy: currentUser?.email || currentUser?.uid || "Unknown",
    });
    navigate(`/systems/${systemId}/species/${id}`);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: "#0a0a0a",
    border: "1px solid #cc666640",
    borderRadius: "4px",
    color: "#ccc",
    padding: "0.5rem 0.75rem",
    fontFamily: "'Orbitron', sans-serif",
    fontSize: "0.8rem",
    boxSizing: "border-box",
  };

  const label = (text: string) => (
    <label style={{ display: "block", color: "#555", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.4rem" }}>
      {text}
    </label>
  );

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "2rem", fontFamily: "'Orbitron', sans-serif" }}>
      {/* Breadcrumb */}
      <p style={{ color: "#555", fontSize: "0.65rem", letterSpacing: "2px", marginBottom: "1rem", textTransform: "uppercase" }}>
        <Link to="/systems" style={{ color: "#ffcc3380", textDecoration: "none" }}>Star Systems</Link>
        {" / "}
        <Link to={`/systems/${systemId}`} style={{ color: "#ffcc3380", textDecoration: "none" }}>{system?.name || "..."}</Link>
        {" / "}
        <Link to={`/systems/${systemId}/species`} style={{ color: "#cc666680", textDecoration: "none" }}>Species</Link>
        {" / "}
        <span style={{ color: "#cc6666" }}>New</span>
      </p>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "stretch", marginBottom: "2rem", height: "50px" }}>
        <div style={{ width: "20px", backgroundColor: "#cc6666", borderRadius: "20px 0 0 0" }} />
        <div style={{ flex: 1, backgroundColor: "#cc6666", display: "flex", alignItems: "center", padding: "0 2rem" }}>
          <h1 style={{ margin: 0, color: "#000", fontSize: "1.3rem", fontWeight: "bold", letterSpacing: "3px", textTransform: "uppercase" }}>
            Catalog New Species
          </h1>
        </div>
        <div style={{ width: "80px", backgroundColor: "#9933cc", borderRadius: "0 20px 20px 0" }} />
      </div>

      <div style={{ backgroundColor: "#111", border: "1px solid #cc666630", borderTop: "3px solid #cc6666", borderRadius: "4px", padding: "2rem" }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.1rem" }}>
            <div>
              {label("Species Name *")}
              <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Machidans" style={inputStyle} required />
            </div>
            <div>
              {label("Type")}
              <input type="text" value={form.type} onChange={(e) => set("type", e.target.value)} placeholder="e.g. Humanoid, Avian" style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: "1.1rem" }}>
            {label("Homeworld")}
            <input type="text" value={form.homeworld} onChange={(e) => set("homeworld", e.target.value)} placeholder="Primary planet of origin" style={inputStyle} />
          </div>

          <div style={{ marginBottom: "1.1rem" }}>
            {label("Biology")}
            <textarea value={form.biology} onChange={(e) => set("biology", e.target.value)} placeholder="Physical characteristics, lifespan, biology..." rows={4} style={{ ...inputStyle, resize: "vertical" }} />
          </div>

          <div style={{ marginBottom: "1.1rem" }}>
            {label("Culture")}
            <textarea value={form.culture} onChange={(e) => set("culture", e.target.value)} placeholder="Society, traditions, beliefs, government..." rows={4} style={{ ...inputStyle, resize: "vertical" }} />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            {label("Additional Notes")}
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Historical events, notable individuals, Federation relations..." rows={3} style={{ ...inputStyle, resize: "vertical" }} />
          </div>

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
            <Link
              to={`/systems/${systemId}/species`}
              style={{ backgroundColor: "transparent", border: "1px solid #333", borderRadius: "20px", color: "#666", fontFamily: "'Orbitron', sans-serif", fontSize: "0.65rem", letterSpacing: "1.5px", padding: "0.5rem 1.2rem", textDecoration: "none", display: "flex", alignItems: "center" }}
            >
              CANCEL
            </Link>
            <button
              type="submit"
              disabled={submitting || !form.name.trim()}
              style={{ backgroundColor: submitting || !form.name.trim() ? "#cc666640" : "#cc6666", border: "none", borderRadius: "20px", color: "#000", fontFamily: "'Orbitron', sans-serif", fontSize: "0.65rem", fontWeight: "bold", letterSpacing: "1.5px", padding: "0.5rem 1.4rem", cursor: submitting || !form.name.trim() ? "not-allowed" : "pointer" }}
            >
              {submitting ? "CATALOGUING..." : "CREATE SPECIES"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SystemSpeciesNew;
