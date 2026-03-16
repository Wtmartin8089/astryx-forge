import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getShips } from "../utils/gameData";
import { subscribeToAllCrew, createCharacter } from "../utils/crewFirestore";
import { isAdmin } from "../utils/adminAuth";
import { getAuth } from "firebase/auth";
import type { CrewMember, ShipData } from "../types/fleet";
import "../assets/lcars.css";

const rankColors: Record<string, string> = {
  "Captain": "#ff9900",
  "Commander": "#cc6666",
  "Lt. Commander": "#ffcc33",
  "Full Lieutenant": "#ffcc33",
  "Ensign": "#6699cc",
};

const CrewRoster = () => {
  const [visible, setVisible] = useState(false);
  const [crew, setCrew] = useState<Record<string, CrewMember>>({});
  const [ships, setShips] = useState<Record<string, ShipData>>({});
  const navigate = useNavigate();

  const auth = getAuth();
  const currentUser = auth.currentUser;
  const userIsAdmin = currentUser ? isAdmin(currentUser.uid) : false;

  useEffect(() => {
    setShips(getShips());
    const unsubscribe = subscribeToAllCrew((data) => setCrew(data));
    const timer = setTimeout(() => setVisible(true), 50);
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleAddCrew = async () => {
    const slug = `crew-${Date.now()}`;
    const newMember: CrewMember = {
      name: "New Crew Member",
      rank: "Ensign",
      position: "Unassigned",
      species: "Unknown",
      shipId: "",
      attributes: {
        Fitness: null,
        Coordination: null,
        Presence: null,
        Intellect: null,
        PSI: null,
      },
      advantages: [],
      disadvantages: [],
      skills: [],
      notes: "",
      biography: "",
      portrait: "",
      awards: [],
      ownerId: userIsAdmin ? null : (currentUser?.uid ?? null),
      ownerEmail: userIsAdmin ? null : (currentUser?.email ?? null),
      status: userIsAdmin ? "active" : "pending",
    };
    await createCharacter(slug, newMember);
    navigate(`/crew/${slug}?edit=true`);
  };

  // Group crew by ship
  const crewByShip: Record<string, { slug: string; member: CrewMember }[]> = {};
  for (const [slug, member] of Object.entries(crew)) {
    const shipId = member.shipId;
    if (!crewByShip[shipId]) crewByShip[shipId] = [];
    crewByShip[shipId].push({ slug, member });
  }

  // Sort crew within each ship by rank importance
  const rankOrder = ["Captain", "Commander", "Lt. Commander", "Full Lieutenant", "Ensign"];
  for (const shipId of Object.keys(crewByShip)) {
    crewByShip[shipId].sort((a, b) => {
      const aIdx = rankOrder.indexOf(a.member.rank);
      const bIdx = rankOrder.indexOf(b.member.rank);
      return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
    });
  }

  const hasData = (member: CrewMember) =>
    Object.values(member.attributes).some((v) => v !== null) ||
    member.advantages.length > 0;

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
          backgroundColor: "#6699cc",
          borderRadius: "20px 0 0 0",
        }} />
        <div style={{
          flex: 1,
          backgroundColor: "#6699cc",
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
            Crew Roster
          </h1>
          <button
            onClick={handleAddCrew}
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
            + ADD NEW CREW
          </button>
        </div>
        <div style={{
          width: "80px",
          backgroundColor: "#9933cc",
          borderRadius: "0 20px 20px 0",
        }} />
      </div>

      {/* Crew grouped by ship */}
      {Object.entries(crewByShip).map(([shipId, members]) => {
        const ship = ships[shipId];
        return (
          <div key={shipId} style={{ marginBottom: "2rem" }}>
            {/* Ship Group Header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              marginBottom: "1rem",
              padding: "0.75rem 1rem",
              backgroundColor: "#111",
              border: "1px solid #ff9933",
              borderRadius: "0 20px 0 0",
            }}>
              <div style={{
                width: "6px",
                height: "30px",
                backgroundColor: "#ff9933",
                borderRadius: "3px",
              }} />
              <div>
                <Link to={shipId === "starbase" ? "/starbase" : `/ship/${shipId}`} style={{
                  color: shipId === "starbase" ? "#9933cc" : "#ff9933",
                  textDecoration: "none",
                  fontSize: "1rem",
                  fontWeight: "bold",
                  letterSpacing: "2px",
                }}>
                  {shipId === "starbase" ? "Starbase Machida" : (ship?.name || shipId.toUpperCase())}
                </Link>
                {ship && (
                  <span style={{ color: "#666", fontSize: "0.75rem", marginLeft: "1rem" }}>
                    {ship.registry}
                  </span>
                )}
              </div>
            </div>

            {/* Crew Cards */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}>
              {members.map(({ slug, member }) => {
                const rankColor = rankColors[member.rank] || "#888";
                const partial = !hasData(member);
                return (
                  <Link
                    key={slug}
                    to={`/crew/${slug}`}
                    style={{ textDecoration: "none" }}
                  >
                    <div style={{
                      backgroundColor: "#111",
                      border: `2px solid ${rankColor}40`,
                      borderLeft: `4px solid ${rankColor}`,
                      borderRadius: "0 12px 0 0",
                      padding: "1rem 1.25rem",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = rankColor;
                      (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 15px ${rankColor}30`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = `${rankColor}40`;
                      (e.currentTarget as HTMLDivElement).style.borderLeftColor = rankColor;
                      (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                    }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <p style={{
                            color: rankColor,
                            fontSize: "0.7rem",
                            margin: "0 0 0.25rem 0",
                            letterSpacing: "1px",
                            textTransform: "uppercase",
                          }}>
                            {member.rank}
                          </p>
                          <h3 style={{
                            color: "#fff",
                            fontSize: "1rem",
                            margin: "0 0 0.4rem 0",
                          }}>
                            {member.name}
                          </h3>
                          <p style={{
                            color: "#888",
                            fontSize: "0.8rem",
                            margin: 0,
                          }}>
                            {member.species !== "Unknown" ? `${member.species} • ` : ""}{member.position}
                          </p>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", alignItems: "flex-end" }}>
                          {member.status === "pending" && (
                            <span style={{
                              fontSize: "0.6rem",
                              color: "#ffcc33",
                              border: "1px solid #ffcc3360",
                              borderRadius: "10px",
                              padding: "0.2rem 0.5rem",
                              whiteSpace: "nowrap",
                            }}>
                              PENDING
                            </span>
                          )}
                          {member.ownerId && (
                            <span style={{
                              fontSize: "0.6rem",
                              color: "#66ccff",
                              border: "1px solid #66ccff60",
                              borderRadius: "10px",
                              padding: "0.2rem 0.5rem",
                              whiteSpace: "nowrap",
                            }}>
                              CLAIMED
                            </span>
                          )}
                          {partial && !member.ownerId && (
                            <span style={{
                              fontSize: "0.6rem",
                              color: "#ff9933",
                              border: "1px solid #ff993360",
                              borderRadius: "10px",
                              padding: "0.2rem 0.5rem",
                              whiteSpace: "nowrap",
                            }}>
                              PARTIAL
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}

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
          backgroundColor: "#6699cc",
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
          backgroundColor: "#6699cc",
          borderRadius: "0 20px 20px 0",
        }} />
      </div>
    </div>
  );
};

export default CrewRoster;
