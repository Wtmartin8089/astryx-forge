import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { getSystem, subscribeToCreaturesBySystem, migrateSpeciesToCreatures } from "../utils/systemsFirestore";
import { getUserCharacterName } from "../utils/crewFirestore";
import type { StarSystem } from "../utils/systemsFirestore";
import type { Creature } from "../utils/creaturesFirestore";
import "../assets/lcars.css";

const SystemCreatures = () => {
  const { systemId } = useParams<{ systemId: string }>();
  const navigate = useNavigate();
  const [system, setSystem] = useState<StarSystem | null>(null);
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [visible, setVisible] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrateError, setMigrateError] = useState("");

  useEffect(() => {
    if (!systemId) return;
    getSystem(systemId).then(setSystem);
    const unsub = subscribeToCreaturesBySystem(systemId, setCreatures);
    const timer = setTimeout(() => setVisible(true), 50);
    return () => { unsub(); clearTimeout(timer); };
  }, [systemId]);

  const handleAddCreature = () => {
    // Navigate to creature creation, passing systemId via state
    navigate("/creatures/new", { state: { systemId } });
  };

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
        <span style={{ color: "#33cc99" }}>Creatures</span>
      </p>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "stretch", marginBottom: "2rem", height: "50px" }}>
        <div style={{ width: "20px", backgroundColor: "#33cc99", borderRadius: "20px 0 0 0" }} />
        <div style={{ flex: 1, backgroundColor: "#33cc99", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2rem" }}>
          <h1 style={{ margin: 0, color: "#000", fontSize: "1.4rem", fontWeight: "bold", letterSpacing: "3px", textTransform: "uppercase" }}>
            {system?.name} — Creatures
          </h1>
          <span style={{ color: "#00000080", fontSize: "0.7rem", letterSpacing: "1px" }}>{creatures.length} RECORD{creatures.length !== 1 ? "S" : ""}</span>
        </div>
        <div style={{ width: "80px", backgroundColor: "#9933cc", borderRadius: "0 20px 20px 0" }} />
      </div>

      {/* Action */}
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginBottom: migrateError ? "0.5rem" : "1.5rem", flexWrap: "wrap" }}>
        <button
          onClick={async () => {
            if (!systemId) return;
            setMigrating(true);
            setMigrateError("");
            try {
              const user = getAuth().currentUser;
              const characterName = user ? await getUserCharacterName(user.uid) : null;
              const createdBy = characterName || user?.email || user?.uid || "Unknown";
              const count = await migrateSpeciesToCreatures(systemId, createdBy);
              if (count === 0) setMigrateError("No creatures found in Species section to move.");
            } catch (err: any) {
              setMigrateError(err?.message || "Migration failed.");
            }
            setMigrating(false);
          }}
          disabled={migrating}
          style={{ backgroundColor: "#33cc9915", border: "1px solid #33cc9960", borderRadius: "20px", color: "#33cc99", fontFamily: "'Orbitron', sans-serif", fontSize: "0.65rem", fontWeight: "bold", letterSpacing: "1.5px", padding: "0.4rem 1.2rem", cursor: migrating ? "not-allowed" : "pointer" }}
        >
          {migrating ? "MOVING..." : "↓ MOVE FROM SPECIES SECTION"}
        </button>
        <button
          onClick={handleAddCreature}
          style={{ backgroundColor: "#33cc9920", border: "1px solid #33cc99", borderRadius: "20px", color: "#33cc99", fontFamily: "'Orbitron', sans-serif", fontSize: "0.65rem", letterSpacing: "1.5px", padding: "0.4rem 1.2rem", cursor: "pointer", fontWeight: "bold" }}
        >
          + CATALOG NEW CREATURE HERE
        </button>
      </div>
      {migrateError && <p style={{ color: "#cc3333", fontSize: "0.7rem", fontFamily: "'Orbitron', sans-serif", textAlign: "right", marginBottom: "1rem" }}>{migrateError}</p>}

      {/* Grid */}
      {creatures.length === 0 ? (
        <p style={{ color: "#555", textAlign: "center", fontSize: "0.9rem", marginTop: "3rem" }}>
          No creatures linked to this system yet. Catalog a new creature and it will appear here.
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {creatures.map((c) => (
            <Link key={(c as any).id} to={`/creatures/${(c as any).id}`} style={{ textDecoration: "none" }}>
              <div
                style={{ backgroundColor: "#111", border: "1px solid #33cc9930", borderLeft: "4px solid #33cc99", borderRadius: "0 12px 0 0", padding: "1.1rem 1.25rem", cursor: "pointer", transition: "border-color 0.25s, box-shadow 0.25s" }}
                onMouseEnter={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = "#33cc99"; el.style.boxShadow = "0 0 15px #33cc9925"; }}
                onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = "#33cc9930"; el.style.borderLeftColor = "#33cc99"; el.style.boxShadow = "none"; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.4rem" }}>
                  <h3 style={{ color: "#fff", fontSize: "1rem", margin: 0 }}>{c.name}</h3>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    {c.isHostile && <span style={{ backgroundColor: "#cc333315", border: "1px solid #cc333360", borderRadius: "10px", color: "#cc3333", fontSize: "0.58rem", padding: "0.15rem 0.5rem", letterSpacing: "1px" }}>HOSTILE</span>}
                    {c.isDomesticated && <span style={{ backgroundColor: "#6699cc15", border: "1px solid #6699cc60", borderRadius: "10px", color: "#6699cc", fontSize: "0.58rem", padding: "0.15rem 0.5rem", letterSpacing: "1px" }}>DOMESTICATED</span>}
                  </div>
                </div>
                {c.type && <p style={{ color: "#33cc99", fontSize: "0.78rem", margin: "0 0 0.3rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.type}</p>}
                {c.size && <p style={{ color: "#888", fontSize: "0.72rem", margin: 0 }}>{c.size}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Bottom bar */}
      <div style={{ display: "flex", alignItems: "stretch", height: "45px" }}>
        <div style={{ width: "80px", backgroundColor: "#9933cc", borderRadius: "20px 0 0 20px" }} />
        <Link to={`/systems/${systemId}`} style={{ flex: 1, backgroundColor: "#33cc99", display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: "bold", textDecoration: "none", letterSpacing: "2px", fontSize: "0.9rem" }}>
          RETURN TO SYSTEM DASHBOARD
        </Link>
        <div style={{ width: "20px", backgroundColor: "#33cc99", borderRadius: "0 20px 20px 0" }} />
      </div>
    </div>
  );
};

export default SystemCreatures;
