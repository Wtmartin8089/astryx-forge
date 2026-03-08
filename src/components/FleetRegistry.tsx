import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getShips, saveShips } from "../utils/gameData";
import type { ShipData } from "../types/fleet";
import "../assets/lcars.css";

const shipColors: Record<string, { primary: string; accent: string }> = {
  "joshua-tree": { primary: "#004466", accent: "#66ccff" },
  "king": { primary: "#660033", accent: "#ff3366" },
  "defiant-a": { primary: "#333366", accent: "#6699cc" },
  "lancelot": { primary: "#006633", accent: "#33cc99" },
};

const FleetRegistry = () => {
  const [visible, setVisible] = useState(false);
  const [ships, setShips] = useState<Record<string, ShipData>>({});
  const navigate = useNavigate();

  useEffect(() => {
    const loadShips = () => {
      setShips(getShips());
    };
    const syncOnFocus = () => {
      loadShips();
    };

    loadShips();
    const timer = setTimeout(() => setVisible(true), 50);

    window.addEventListener("storage", loadShips);
    window.addEventListener("focus", syncOnFocus);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("storage", loadShips);
      window.removeEventListener("focus", syncOnFocus);
    };
  }, []);

  const handleAddShip = () => {
    const slug = `ship-${Date.now()}`;
    const newShip: ShipData = {
      name: "NEW VESSEL",
      registry: "NCC-00000",
      class: "",
      type: "Unknown",
      status: "Active",
      description: "",
      structuralPoints: null,
      crew: null,
      passengers: null,
      evacuationCapacity: null,
      warp: null,
      impulse: null,
      shields: null,
      weapons: [],
      crewIds: [],
    };
    const updated = { ...ships, [slug]: newShip };
    saveShips(updated);
    setShips(updated);
    navigate(`/ship/${slug}?edit=true`);
  };

  return (
    <div style={{
      maxWidth: "1000px",
      margin: "0 auto",
      padding: "2rem",
      fontFamily: "'Orbitron', sans-serif",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateX(0)" : "translateX(-30px)",
      transition: "opacity 0.5s ease-out, transform 0.5s ease-out",
    }}>

      {/* LCARS Header Bar */}
      <div style={{
        display: "flex",
        alignItems: "stretch",
        marginBottom: "2rem",
        height: "50px",
      }}>
        <div style={{
          width: "20px",
          backgroundColor: "#ff9933",
          borderRadius: "20px 0 0 0",
        }} />
        <div style={{
          flex: 1,
          backgroundColor: "#ff9933",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 2rem",
        }}>
          <h1 style={{
            margin: 0,
            color: "#000",
            fontSize: "1.8rem",
            fontWeight: "bold",
            letterSpacing: "3px",
            textTransform: "uppercase",
          }}>
            Fleet Registry
          </h1>
          <button
            onClick={handleAddShip}
            style={{
              background: "#33cc99",
              color: "#000",
              border: "none",
              borderRadius: "15px",
              padding: "0.4rem 1.2rem",
              fontFamily: "'Orbitron', sans-serif",
              fontWeight: "bold",
              fontSize: "0.75rem",
              letterSpacing: "1px",
              cursor: "pointer",
            }}
          >
            + ADD NEW SHIP
          </button>
        </div>
        <div style={{
          width: "80px",
          backgroundColor: "#9933cc",
          borderRadius: "0 20px 20px 0",
        }} />
      </div>

      {/* Ship Cards Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "1.5rem",
        marginBottom: "2rem",
      }}>
        {Object.entries(ships).map(([slug, ship]) => {
          const colors = shipColors[slug] || { primary: "#333", accent: "#ff9900" };
          return (
            <Link
              key={slug}
              to={`/ship/${slug}`}
              style={{ textDecoration: "none" }}
            >
              <div style={{
                backgroundColor: "#111",
                border: `2px solid ${colors.accent}`,
                borderRadius: "0 30px 0 0",
                padding: "1.5rem",
                cursor: "pointer",
                transition: "all 0.3s ease",
                display: "flex",
                gap: "1rem",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 20px ${colors.accent}40`;
                (e.currentTarget as HTMLDivElement).style.borderColor = colors.accent;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
              }}
              >
                {/* Left accent bar */}
                <div style={{
                  width: "8px",
                  backgroundColor: colors.accent,
                  borderRadius: "4px",
                  flexShrink: 0,
                }} />

                <div style={{ flex: 1 }}>
                  {/* Ship Name */}
                  <h2 style={{
                    color: colors.accent,
                    fontSize: "1.2rem",
                    margin: "0 0 0.25rem 0",
                    letterSpacing: "2px",
                  }}>
                    {ship.name}
                  </h2>

                  {/* Registry */}
                  <p style={{
                    color: "#888",
                    fontSize: "0.85rem",
                    margin: "0 0 0.75rem 0",
                    letterSpacing: "1px",
                  }}>
                    {ship.registry}
                  </p>

                  {/* Class & Type */}
                  <p style={{
                    color: "#ccc",
                    fontSize: "0.85rem",
                    margin: "0 0 0.5rem 0",
                  }}>
                    {ship.class} &bull; {ship.type}
                  </p>

                  {/* Status & Crew */}
                  <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    <span style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      fontSize: "0.75rem",
                      color: "#33cc99",
                    }}>
                      <span style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: "#33cc99",
                        display: "inline-block",
                      }} />
                      {ship.status}
                    </span>
                    <span style={{
                      fontSize: "0.75rem",
                      color: "#888",
                    }}>
                      Crew: {ship.crewIds?.length || 0}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Bottom LCARS bar */}
      <div style={{
        display: "flex",
        alignItems: "stretch",
        height: "45px",
      }}>
        <div style={{
          width: "80px",
          backgroundColor: "#9933cc",
          borderRadius: "20px 0 0 20px",
        }} />
        <Link to="/" style={{
          flex: 1,
          backgroundColor: "#ff9933",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#000",
          fontWeight: "bold",
          textDecoration: "none",
          letterSpacing: "2px",
          fontSize: "0.9rem",
        }}>
          RETURN TO STAR MAP
        </Link>
        <div style={{
          width: "20px",
          backgroundColor: "#ff9933",
          borderRadius: "0 20px 20px 0",
        }} />
      </div>
    </div>
  );
};

export default FleetRegistry;
