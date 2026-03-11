import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getShips } from "../utils/gameData";
import { subscribeToShipCrew, createCharacter } from "../utils/crewFirestore";
import { isAdmin } from "../utils/adminAuth";
import { getAuth } from "firebase/auth";
import type { ShipData, CrewMember } from "../types/fleet";
import "../assets/lcars.css";

const STARBASE_ID = "starbase";

const Starbase = () => {
  const [ships, setShips] = useState<Record<string, ShipData>>({});
  const [starbaseCrew, setStarbaseCrew] = useState<Record<string, CrewMember>>({});
  const navigate = useNavigate();
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const userIsAdmin = currentUser ? isAdmin(currentUser.uid) : false;

  useEffect(() => {
    setShips(getShips());
    const unsubscribe = subscribeToShipCrew(STARBASE_ID, (data) => setStarbaseCrew(data));
    return () => unsubscribe();
  }, []);

  const starbaseCrewEntries = Object.entries(starbaseCrew);

  const handleAddStarbaseCrew = async () => {
    const slug = `crew-${Date.now()}`;
    const newMember: CrewMember = {
      name: "New Crew Member",
      rank: "Ensign",
      position: "Unassigned",
      species: "Unknown",
      shipId: STARBASE_ID,
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
      ownerId: userIsAdmin ? null : (currentUser?.uid ?? null),
      ownerEmail: userIsAdmin ? null : (currentUser?.email ?? null),
      status: userIsAdmin ? "active" : "pending",
    };
    await createCharacter(slug, newMember);
    navigate(`/crew/${slug}?edit=true`);
  };

  return (
    <div className="lcars-container">
      <h1 className="lcars-header">Starbase Machida — Command Center</h1>
      
      <div className="lcars-panel">
        <h2>Mission Logs</h2>
        <p>Latest starship and planetary mission logs will appear here.</p>
        <Link to="/missionlogs">View All Logs</Link>
      </div>

      <div className="lcars-panel">
        <h2>Docked Ships</h2>
        {Object.entries(ships).map(([slug, ship]) => (
          <p key={slug}>
            <Link to={`/ship/${slug}`} style={{ color: "#000", textDecoration: "underline" }}>
              {ship.name}
            </Link>
            {" "}({ship.registry}) — {ship.status}
          </p>
        ))}
      </div>

      <div className="lcars-panel">
        <h2>Starbase Crew Roster</h2>
        {starbaseCrewEntries.length > 0 ? (
          starbaseCrewEntries.map(([slug, member]) => (
            <p key={slug} style={{ margin: "0.25rem 0" }}>
              <Link to={`/crew/${slug}`} style={{ color: "#000", textDecoration: "underline" }}>
                {member.rank} {member.name}
              </Link>
              {" "}— {member.position}
            </p>
          ))
        ) : (
          <p>No starbase personnel on file.</p>
        )}
        <button
          onClick={handleAddStarbaseCrew}
          style={{
            marginTop: "0.75rem",
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
          + ADD STARBASE CREW
        </button>
      </div>

      <div className="lcars-panel">
        <h2>Resource Status</h2>
        <p>Energy reserves: 92%</p>
        <p>Medical supplies: Fully stocked</p>
      </div>

      <div className="lcars-panel">
        <h2>Community Forum</h2>
        <Link to="/forum">Enter the Forum</Link>
      </div>

      <Link to="/" className="lcars-button">Return to Star Map</Link>
    </div>
  );
};

export default Starbase;

