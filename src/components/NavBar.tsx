import { Link, useLocation } from "react-router-dom";
import { useActiveCharacter } from "../context/ActiveCharacterContext";
import "../assets/lcars.css";

const NavBar = () => {
  const location = useLocation();
  const { userCharacters, activeChar, activeCharId, setActiveCharId } = useActiveCharacter();

  const isActive = (path: string) => location.pathname === path;

  const linkStyle = (path: string) => ({
    color: "black",
    textDecoration: "none",
    fontWeight: "bold",
    padding: "0.4rem 0.75rem",
    borderRadius: "20px",
    backgroundColor: isActive(path) ? "#9933cc" : "transparent",
    transition: "all 0.3s ease",
  });

  return (
    <nav
      className="lcars-navbar"
      style={{
        background: "linear-gradient(90deg, #ff9933 0%, #ffcc33 100%)",
        padding: "1rem 2rem",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        borderBottom: "4px solid #663399",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
      }}
    >
      <Link to="/" style={linkStyle("/")}>
        Star Map
      </Link>
      <Link to="/starbase" style={linkStyle("/starbase")}>
        Starbase
      </Link>
      <Link to="/fleet" style={linkStyle("/fleet")}>
        Fleet
      </Link>
      <Link to="/personnel" style={linkStyle("/personnel")}>
        Personnel
      </Link>
      <Link to="/choose-character" style={linkStyle("/choose-character")}>
        Join Crew
      </Link>
<Link to="/stardate" style={linkStyle("/stardate")}>
        Stardate
      </Link>
      <Link to="/missions" style={linkStyle("/missions")}>
        Missions
      </Link>
      <Link to="/systems" style={linkStyle("/systems")}>
        Star Systems
      </Link>

      <Link to="/reference" style={linkStyle("/reference")}>
        Reference
      </Link>
      <Link to="/forum" style={linkStyle("/forum")}>
        Forum
      </Link>
      <Link to="/settings" style={linkStyle("/settings")}>
        Settings
      </Link>
      <Link
        to="/create-campaign"
        style={{
          ...linkStyle("/create-campaign"),
          background: "linear-gradient(135deg,#F5B942,#FF6A2B)",
          color: "#0B1E3A",
          borderRadius: "20px",
          padding: "0.4rem 0.9rem",
          fontWeight: "bold",
        }}
      >
        + Campaign
      </Link>

      {/* Active Character selector */}
      {userCharacters.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            backgroundColor: "#00000018",
            border: "1px solid #00000030",
            borderRadius: "20px",
            padding: "0.25rem 0.6rem 0.25rem 0.75rem",
          }}
        >
          <span
            style={{
              color: "#00000070",
              fontSize: "0.55rem",
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            Playing as
          </span>
          {userCharacters.length === 1 ? (
            <span
              style={{
                color: "#000",
                fontSize: "0.7rem",
                fontWeight: "bold",
                letterSpacing: "0.5px",
              }}
            >
              {activeChar?.name ?? "—"}
            </span>
          ) : (
            <select
              value={activeCharId ?? ""}
              onChange={(e) => setActiveCharId(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                color: "#000",
                cursor: "pointer",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.7rem",
                fontWeight: "bold",
                letterSpacing: "0.5px",
                outline: "none",
                padding: 0,
              }}
            >
              {userCharacters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.rank ? ` (${c.rank})` : ""}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </nav>
  );
};

export default NavBar;

