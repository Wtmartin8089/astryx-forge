import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import planetsData from "../data/planetsData.json";
import "../assets/lcars.css";

// Import all planet images
import acathlaImg from "../assets/acathla.png";
import kralikImg from "../assets/kralik.png";
import dhoffrynImg from "../assets/dhoffryn.png";
import larconisImg from "../assets/lucronis.png";
import machidaImg from "../assets/machida.png";
import starbaseImg from "../assets/starbase_v2.png";
import tarakaImg from "../assets/taraka.png";
import lagosImg from "../assets/lagos.png";
import kakistosImg from "../assets/kakistos.png";

const planetImages: Record<string, string> = {
  acathla: acathlaImg,
  kralik: kralikImg,
  dhoffryn: dhoffrynImg,
  larconis: larconisImg,
  machida: machidaImg,
  starbase: starbaseImg,
  taraka: tarakaImg,
  lagos: lagosImg,
  kakistos: kakistosImg,
};

const planetColors: Record<string, { primary: string; accent: string }> = {
  acathla: { primary: "#8b0000", accent: "#ff4444" },
  kralik: { primary: "#006400", accent: "#00cc66" },
  dhoffryn: { primary: "#cc8800", accent: "#ffcc33" },
  larconis: { primary: "#004466", accent: "#66ccff" },
  machida: { primary: "#993300", accent: "#ff6600" },
  starbase: { primary: "#333366", accent: "#6699cc" },
  taraka: { primary: "#330066", accent: "#9933cc" },
  lagos: { primary: "#003366", accent: "#3399ff" },
  kakistos: { primary: "#4a3600", accent: "#cc9933" },
};

type PlanetData = {
  name: string;
  description: string;
  resources: string[];
  logs: string[];
};

const PlanetPage = () => {
  const { planetName } = useParams();
  const planetData = (planetsData as Record<string, PlanetData>)[planetName!] || null;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, [planetName]);

  if (!planetData) {
    return (
      <div style={{ color: "#ff9900", textAlign: "center", marginTop: "4rem", fontFamily: "'Orbitron', sans-serif" }}>
        <p style={{ fontSize: "1.5rem" }}>Scanning sector...</p>
        <p style={{ color: "#6699cc", marginTop: "1rem" }}>Planet not found in database.</p>
        <Link to="/" style={{ color: "#9933cc", marginTop: "2rem", display: "inline-block" }}>
          Return to Star Map
        </Link>
      </div>
    );
  }

  const colors = planetColors[planetName!] || { primary: "#333", accent: "#ff9900" };
  const image = planetImages[planetName!];

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
            backgroundColor: colors.accent,
            borderRadius: "20px 0 0 0",
          }} />
          <div style={{
            flex: 1,
            backgroundColor: colors.accent,
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
              {planetData.name}
            </h1>
            <span style={{ color: "#000", fontWeight: "bold", fontSize: "0.8rem" }}>
              PLANETARY DATABASE
            </span>
          </div>
          <div style={{
            width: "80px",
            backgroundColor: "#9933cc",
            borderRadius: "0 20px 20px 0",
          }} />
        </div>

        {/* Main Content Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: image ? "1fr 1fr" : "1fr",
          gap: "2rem",
          marginBottom: "2rem",
        }}>

          {/* Planet Image */}
          {image && (
            <div style={{
              position: "relative",
              borderRadius: "12px",
              overflow: "hidden",
              border: `3px solid ${colors.accent}`,
              boxShadow: `0 0 30px ${colors.accent}40`,
            }}>
              <img
                src={image}
                alt={planetData.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                  minHeight: "300px",
                }}
              />
              <div style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                background: `linear-gradient(transparent, ${colors.primary})`,
                padding: "2rem 1rem 1rem",
              }}>
                <span style={{
                  color: colors.accent,
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                  letterSpacing: "2px",
                }}>
                  VISUAL SCAN COMPLETE
                </span>
              </div>
            </div>
          )}

          {/* Planet Info Panel */}
          <div>
            {/* Description */}
            <div style={{
              backgroundColor: "#111",
              border: `2px solid ${colors.accent}`,
              borderRadius: "0 30px 0 0",
              padding: "1.5rem",
              marginBottom: "1.5rem",
            }}>
              <h2 style={{
                color: colors.accent,
                fontSize: "0.85rem",
                letterSpacing: "2px",
                marginBottom: "0.75rem",
                textTransform: "uppercase",
              }}>
                Survey Report
              </h2>
              <p style={{
                color: "#ccc",
                lineHeight: "1.8",
                fontSize: "1rem",
              }}>
                {planetData.description}
              </p>
            </div>

            {/* Resources */}
            <div style={{
              backgroundColor: "#111",
              border: "2px solid #ffcc33",
              borderRadius: "0 30px 0 0",
              padding: "1.5rem",
            }}>
              <h2 style={{
                color: "#ffcc33",
                fontSize: "0.85rem",
                letterSpacing: "2px",
                marginBottom: "0.75rem",
                textTransform: "uppercase",
              }}>
                Detected Resources
              </h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {planetData.resources?.map((res: string, idx: number) => (
                  <span key={idx} style={{
                    backgroundColor: "#ffcc3320",
                    border: "1px solid #ffcc33",
                    borderRadius: "20px",
                    padding: "0.4rem 1rem",
                    color: "#ffcc33",
                    fontSize: "0.85rem",
                    fontWeight: "bold",
                  }}>
                    {res}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Mission Logs Section */}
        <div style={{
          backgroundColor: "#111",
          border: "2px solid #6699cc",
          borderRadius: "0 30px 0 0",
          padding: "1.5rem",
          marginBottom: "2rem",
        }}>
          <h2 style={{
            color: "#6699cc",
            fontSize: "0.85rem",
            letterSpacing: "2px",
            marginBottom: "1rem",
            textTransform: "uppercase",
          }}>
            Captain's Log Entries
          </h2>
          {planetData.logs?.map((log: string, idx: number) => (
            <div key={idx} style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "1rem",
              padding: "0.75rem 0",
              borderBottom: idx < planetData.logs.length - 1 ? "1px solid #333" : "none",
            }}>
              <div style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#6699cc",
                marginTop: "0.5rem",
                flexShrink: 0,
              }} />
              <p style={{
                color: "#aaa",
                margin: 0,
                lineHeight: "1.6",
                fontSize: "0.95rem",
              }}>
                {log}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom LCARS bar with navigation */}
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
            backgroundColor: colors.accent,
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
            backgroundColor: colors.accent,
            borderRadius: "0 20px 20px 0",
          }} />
        </div>
      </div>
  );
};

export default PlanetPage;
