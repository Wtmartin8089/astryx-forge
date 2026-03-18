import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getSystem, getSystemSpecies } from "../utils/systemsFirestore";
import type { StarSystem, SystemSpecies } from "../utils/systemsFirestore";
import "../assets/lcars.css";

const SystemSpeciesDetail = () => {
  const { systemId, speciesId } = useParams<{ systemId: string; speciesId: string }>();
  const [system, setSystem] = useState<StarSystem | null>(null);
  const [species, setSpecies] = useState<SystemSpecies | null>(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!systemId || !speciesId) return;
    Promise.all([getSystem(systemId), getSystemSpecies(speciesId)]).then(([s, sp]) => {
      setSystem(s);
      setSpecies(sp);
      setLoading(false);
      setTimeout(() => setVisible(true), 50);
    });
  }, [systemId, speciesId]);

  if (loading) return <p style={{ color: "#cc6666", textAlign: "center", fontFamily: "'Orbitron', sans-serif", marginTop: "4rem" }}>Accessing species database...</p>;
  if (!species) return <p style={{ color: "#cc3333", textAlign: "center", fontFamily: "'Orbitron', sans-serif", marginTop: "4rem" }}>Species record not found.</p>;

  const field = (label: string, value: string | undefined) => {
    if (!value) return null;
    return (
      <div style={{ marginBottom: "1.25rem", padding: "0.9rem 1.1rem", backgroundColor: "#0d0d0d", border: "1px solid #cc666618", borderLeft: "3px solid #cc6666", borderRadius: "0 8px 0 0" }}>
        <p style={{ color: "#555", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.3rem" }}>{label}</p>
        <p style={{ color: "#ccc", fontSize: "0.88rem", lineHeight: "1.6", whiteSpace: "pre-wrap", margin: 0 }}>{value}</p>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem", fontFamily: "'Orbitron', sans-serif", opacity: visible ? 1 : 0, transform: visible ? "translateX(0)" : "translateX(-30px)", transition: "opacity 0.5s ease-out, transform 0.5s ease-out" }}>
      {/* Breadcrumb */}
      <p style={{ color: "#555", fontSize: "0.65rem", letterSpacing: "2px", marginBottom: "1rem", textTransform: "uppercase" }}>
        <Link to="/systems" style={{ color: "#ffcc3380", textDecoration: "none" }}>Star Systems</Link>
        {" / "}
        <Link to={`/systems/${systemId}`} style={{ color: "#ffcc3380", textDecoration: "none" }}>{system?.name || "..."}</Link>
        {" / "}
        <Link to={`/systems/${systemId}/species`} style={{ color: "#cc666680", textDecoration: "none" }}>Species</Link>
        {" / "}
        <span style={{ color: "#cc6666" }}>{species.name}</span>
      </p>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "stretch", marginBottom: "2rem", height: "50px" }}>
        <div style={{ width: "20px", backgroundColor: "#cc6666", borderRadius: "20px 0 0 0" }} />
        <div style={{ flex: 1, backgroundColor: "#cc6666", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2rem" }}>
          <h1 style={{ margin: 0, color: "#000", fontSize: "1.5rem", fontWeight: "bold", letterSpacing: "3px", textTransform: "uppercase" }}>{species.name}</h1>
          {species.type && (
            <span style={{ backgroundColor: "#00000020", borderRadius: "12px", color: "#000", fontSize: "0.65rem", fontWeight: "bold", padding: "0.2rem 0.75rem", letterSpacing: "1px" }}>
              {species.type}
            </span>
          )}
        </div>
        <div style={{ width: "80px", backgroundColor: "#9933cc", borderRadius: "0 20px 20px 0" }} />
      </div>

      {/* Quick stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem", marginBottom: "1.75rem" }}>
        {[
          { label: "Type", value: species.type },
          { label: "Homeworld", value: species.homeworld },
          { label: "Catalogued By", value: species.createdBy },
        ].filter((f) => f.value).map((f) => (
          <div key={f.label} style={{ backgroundColor: "#111", border: "1px solid #cc666620", borderRadius: "4px", padding: "0.65rem 0.9rem" }}>
            <p style={{ color: "#555", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.25rem" }}>{f.label}</p>
            <p style={{ color: "#cc6666", fontSize: "0.82rem", margin: 0 }}>{f.value}</p>
          </div>
        ))}
      </div>

      {field("Biology", species.biology)}
      {field("Culture", species.culture)}
      {field("Additional Notes", species.notes)}

      {/* Bottom bar */}
      <div style={{ display: "flex", alignItems: "stretch", height: "45px", marginTop: "2rem" }}>
        <div style={{ width: "80px", backgroundColor: "#9933cc", borderRadius: "20px 0 0 20px" }} />
        <Link to={`/systems/${systemId}/species`} style={{ flex: 1, backgroundColor: "#cc6666", display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: "bold", textDecoration: "none", letterSpacing: "2px", fontSize: "0.9rem" }}>
          RETURN TO SPECIES DATABASE
        </Link>
        <div style={{ width: "20px", backgroundColor: "#cc6666", borderRadius: "0 20px 20px 0" }} />
      </div>
    </div>
  );
};

export default SystemSpeciesDetail;
