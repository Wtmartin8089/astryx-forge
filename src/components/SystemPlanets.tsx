import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getSystem, subscribeToSystemPlanets } from "../utils/systemsFirestore";
import type { StarSystem, SystemPlanet } from "../utils/systemsFirestore";
import "../assets/lcars.css";

const SystemPlanets = () => {
  const { systemId } = useParams<{ systemId: string }>();
  const [system, setSystem] = useState<StarSystem | null>(null);
  const [planets, setPlanets] = useState<SystemPlanet[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!systemId) return;
    getSystem(systemId).then(setSystem);
    const unsub = subscribeToSystemPlanets(systemId, setPlanets);
    const timer = setTimeout(() => setVisible(true), 50);
    return () => { unsub(); clearTimeout(timer); };
  }, [systemId]);

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
        <Link to={`/systems/${systemId}`} style={{ color: "#ffcc3380", textDecoration: "none" }}>{system?.name || "..."}</Link>
        {" / "}
        <span style={{ color: "#6699cc" }}>Planets</span>
      </p>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "stretch", marginBottom: "2rem", height: "50px" }}>
        <div style={{ width: "20px", backgroundColor: "#6699cc", borderRadius: "20px 0 0 0" }} />
        <div style={{ flex: 1, backgroundColor: "#6699cc", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2rem" }}>
          <h1 style={{ margin: 0, color: "#000", fontSize: "1.4rem", fontWeight: "bold", letterSpacing: "3px", textTransform: "uppercase" }}>
            {system?.name} — Planets
          </h1>
          <span style={{ color: "#00000080", fontSize: "0.7rem", letterSpacing: "1px" }}>{planets.length} RECORD{planets.length !== 1 ? "S" : ""}</span>
        </div>
        <div style={{ width: "80px", backgroundColor: "#9933cc", borderRadius: "0 20px 20px 0" }} />
      </div>

      {/* Action */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1.5rem" }}>
        <Link
          to={`/systems/${systemId}/planets/new`}
          style={{
            backgroundColor: "#6699cc20",
            border: "1px solid #6699cc",
            borderRadius: "20px",
            color: "#6699cc",
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "0.65rem",
            letterSpacing: "1.5px",
            padding: "0.4rem 1.2rem",
            textDecoration: "none",
            fontWeight: "bold",
          }}
        >
          + CATALOG NEW PLANET
        </Link>
      </div>

      {/* Grid */}
      {planets.length === 0 ? (
        <p style={{ color: "#555", textAlign: "center", fontSize: "0.9rem", marginTop: "3rem" }}>
          No planets catalogued for this system yet.
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {planets.map((p) => (
            <Link key={p.id} to={`/systems/${systemId}/planets/${p.id}`} style={{ textDecoration: "none" }}>
              <div
                style={{ backgroundColor: "#111", border: "1px solid #6699cc30", borderLeft: "4px solid #6699cc", borderRadius: "0 12px 0 0", padding: "1.1rem 1.25rem", cursor: "pointer", transition: "border-color 0.25s, box-shadow 0.25s" }}
                onMouseEnter={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = "#6699cc"; el.style.boxShadow = "0 0 15px #6699cc25"; }}
                onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = "#6699cc30"; el.style.borderLeftColor = "#6699cc"; el.style.boxShadow = "none"; }}
              >
                <h3 style={{ color: "#fff", fontSize: "1rem", margin: "0 0 0.3rem" }}>{p.name}</h3>
                {p.classification && (
                  <span style={{ backgroundColor: "#6699cc15", border: "1px solid #6699cc40", borderRadius: "10px", color: "#6699cc", fontSize: "0.6rem", padding: "0.15rem 0.6rem", letterSpacing: "1px" }}>
                    {p.classification}
                  </span>
                )}
                {p.description && (
                  <p style={{ color: "#aaa", fontSize: "0.78rem", margin: "0.5rem 0 0", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" } as any}>
                    {p.description}
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
        <Link to={`/systems/${systemId}`} style={{ flex: 1, backgroundColor: "#6699cc", display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: "bold", textDecoration: "none", letterSpacing: "2px", fontSize: "0.9rem" }}>
          RETURN TO SYSTEM DASHBOARD
        </Link>
        <div style={{ width: "20px", backgroundColor: "#6699cc", borderRadius: "0 20px 20px 0" }} />
      </div>
    </div>
  );
};

export default SystemPlanets;
