import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getSystem, getSystemPlanet } from "../utils/systemsFirestore";
import type { StarSystem, SystemPlanet } from "../utils/systemsFirestore";
import "../assets/lcars.css";

const SystemPlanetDetail = () => {
  const { systemId, planetId } = useParams<{ systemId: string; planetId: string }>();
  const [system, setSystem] = useState<StarSystem | null>(null);
  const [planet, setPlanet] = useState<SystemPlanet | null>(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!systemId || !planetId) return;
    Promise.all([getSystem(systemId), getSystemPlanet(planetId)]).then(([s, p]) => {
      setSystem(s);
      setPlanet(p);
      setLoading(false);
      setTimeout(() => setVisible(true), 50);
    });
  }, [systemId, planetId]);

  if (loading) return <p style={{ color: "#6699cc", textAlign: "center", fontFamily: "'Orbitron', sans-serif", marginTop: "4rem" }}>Accessing planetary database...</p>;
  if (!planet) return <p style={{ color: "#cc3333", textAlign: "center", fontFamily: "'Orbitron', sans-serif", marginTop: "4rem" }}>Planet record not found.</p>;

  const field = (label: string, value: string | undefined) => {
    if (!value) return null;
    return (
      <div style={{ marginBottom: "1.25rem", padding: "0.9rem 1.1rem", backgroundColor: "#0d0d0d", border: "1px solid #6699cc18", borderLeft: "3px solid #6699cc", borderRadius: "0 8px 0 0" }}>
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
        <Link to={`/systems/${systemId}/planets`} style={{ color: "#6699cc80", textDecoration: "none" }}>Planets</Link>
        {" / "}
        <span style={{ color: "#6699cc" }}>{planet.name}</span>
      </p>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "stretch", marginBottom: "2rem", height: "50px" }}>
        <div style={{ width: "20px", backgroundColor: "#6699cc", borderRadius: "20px 0 0 0" }} />
        <div style={{ flex: 1, backgroundColor: "#6699cc", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2rem" }}>
          <h1 style={{ margin: 0, color: "#000", fontSize: "1.5rem", fontWeight: "bold", letterSpacing: "3px", textTransform: "uppercase" }}>{planet.name}</h1>
          {planet.classification && (
            <span style={{ backgroundColor: "#00000020", borderRadius: "12px", color: "#000", fontSize: "0.65rem", fontWeight: "bold", padding: "0.2rem 0.75rem", letterSpacing: "1px" }}>
              {planet.classification}
            </span>
          )}
        </div>
        <div style={{ width: "80px", backgroundColor: "#9933cc", borderRadius: "0 20px 20px 0" }} />
      </div>

      {/* Quick stats */}
      {planet.type && (
        <div style={{ backgroundColor: "#111", border: "1px solid #6699cc20", borderRadius: "4px", padding: "0.65rem 1rem", marginBottom: "1.5rem" }}>
          <p style={{ color: "#555", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.2rem" }}>Type</p>
          <p style={{ color: "#6699cc", fontSize: "0.85rem", margin: 0 }}>{planet.type}</p>
        </div>
      )}

      {field("Description", planet.description)}
      {field("Resources", planet.resources)}
      {field("Additional Notes", planet.notes)}

      <p style={{ color: "#333", fontSize: "0.6rem", letterSpacing: "1px", textAlign: "right", marginBottom: "1rem" }}>
        Catalogued by: {planet.createdBy}
      </p>

      {/* Bottom bar */}
      <div style={{ display: "flex", alignItems: "stretch", height: "45px" }}>
        <div style={{ width: "80px", backgroundColor: "#9933cc", borderRadius: "20px 0 0 20px" }} />
        <Link to={`/systems/${systemId}/planets`} style={{ flex: 1, backgroundColor: "#6699cc", display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: "bold", textDecoration: "none", letterSpacing: "2px", fontSize: "0.9rem" }}>
          RETURN TO PLANETS
        </Link>
        <div style={{ width: "20px", backgroundColor: "#6699cc", borderRadius: "0 20px 20px 0" }} />
      </div>
    </div>
  );
};

export default SystemPlanetDetail;
