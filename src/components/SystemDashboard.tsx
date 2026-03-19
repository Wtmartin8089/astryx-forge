import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getSystem,
  subscribeToSystemPlanets,
  subscribeToSystemSpecies,
  subscribeToCreaturesBySystem,
} from "../utils/systemsFirestore";
import type { StarSystem } from "../utils/systemsFirestore";
import "../assets/lcars.css";

const SystemDashboard = () => {
  const { systemId } = useParams<{ systemId: string }>();
  const [system, setSystem] = useState<StarSystem | null>(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [planetCount, setPlanetCount] = useState(0);
  const [speciesCount, setSpeciesCount] = useState(0);
  const [creatureCount, setCreatureCount] = useState(0);

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
          <span style={{ color: "#00000060", fontSize: "0.65rem", letterSpacing: "1px" }}>SYSTEM DATABASE</span>
        </div>
        <div style={{ width: "80px", backgroundColor: "#9933cc", borderRadius: "0 20px 20px 0" }} />
      </div>

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
