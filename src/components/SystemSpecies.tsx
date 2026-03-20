import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { getSystem, subscribeToSystemSpecies, importCreaturesToSpecies } from "../utils/systemsFirestore";
import type { StarSystem, SystemSpecies as SpeciesType } from "../utils/systemsFirestore";
import "../assets/lcars.css";

const SystemSpecies = () => {
  const { systemId } = useParams<{ systemId: string }>();
  const [system, setSystem] = useState<StarSystem | null>(null);
  const [species, setSpecies] = useState<SpeciesType[]>([]);
  const [visible, setVisible] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");

  useEffect(() => {
    if (!systemId) return;
    getSystem(systemId).then(setSystem);
    const unsub = subscribeToSystemSpecies(systemId, setSpecies);
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
        <span style={{ color: "#cc6666" }}>Species</span>
      </p>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "stretch", marginBottom: "2rem", height: "50px" }}>
        <div style={{ width: "20px", backgroundColor: "#cc6666", borderRadius: "20px 0 0 0" }} />
        <div style={{ flex: 1, backgroundColor: "#cc6666", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2rem" }}>
          <h1 style={{ margin: 0, color: "#000", fontSize: "1.4rem", fontWeight: "bold", letterSpacing: "3px", textTransform: "uppercase" }}>
            {system?.name} — Species
          </h1>
          <span style={{ color: "#00000080", fontSize: "0.7rem", letterSpacing: "1px" }}>{species.length} RECORD{species.length !== 1 ? "S" : ""}</span>
        </div>
        <div style={{ width: "80px", backgroundColor: "#9933cc", borderRadius: "0 20px 20px 0" }} />
      </div>

      {/* Action */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginBottom: "1rem" }}>
        {species.length === 0 && (
          <button
            onClick={async () => {
              if (!systemId) return;
              setImporting(true);
              setImportError("");
              try {
                const user = getAuth().currentUser;
                const createdBy = user?.email || user?.uid || "Unknown";
                const count = await importCreaturesToSpecies(systemId, createdBy);
                if (count === 0) setImportError("No creatures found in Xenobiology database.");
              } catch (err: any) {
                setImportError(err?.message || "Import failed.");
              }
              setImporting(false);
            }}
            disabled={importing}
            style={{ backgroundColor: "#cc666615", border: "1px solid #cc6666", borderRadius: "20px", color: "#cc6666", fontFamily: "'Orbitron', sans-serif", fontSize: "0.65rem", fontWeight: "bold", letterSpacing: "1.5px", padding: "0.4rem 1.2rem", cursor: importing ? "not-allowed" : "pointer" }}
          >
            {importing ? "IMPORTING..." : "↓ IMPORT FROM XENOBIOLOGY"}
          </button>
        )}
        <Link
          to={`/systems/${systemId}/species/new`}
          style={{ backgroundColor: "#cc666620", border: "1px solid #cc6666", borderRadius: "20px", color: "#cc6666", fontFamily: "'Orbitron', sans-serif", fontSize: "0.65rem", letterSpacing: "1.5px", padding: "0.4rem 1.2rem", textDecoration: "none", fontWeight: "bold" }}
        >
          + CATALOG NEW SPECIES
        </Link>
      </div>
      {importError && <p style={{ color: "#cc3333", fontSize: "0.7rem", fontFamily: "'Orbitron', sans-serif", textAlign: "right", marginBottom: "1rem" }}>{importError}</p>}

      {/* Grid */}
      {species.length === 0 ? (
        <p style={{ color: "#555", textAlign: "center", fontSize: "0.9rem", marginTop: "3rem" }}>
          No species catalogued for this system yet.
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {species.map((s) => (
            <Link key={s.id} to={`/systems/${systemId}/species/${s.id}`} style={{ textDecoration: "none" }}>
              <div
                style={{ backgroundColor: "#111", border: "1px solid #cc666630", borderLeft: "4px solid #cc6666", borderRadius: "0 12px 0 0", padding: "1.1rem 1.25rem", cursor: "pointer", transition: "border-color 0.25s, box-shadow 0.25s" }}
                onMouseEnter={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = "#cc6666"; el.style.boxShadow = "0 0 15px #cc666625"; }}
                onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = "#cc666630"; el.style.borderLeftColor = "#cc6666"; el.style.boxShadow = "none"; }}
              >
                <h3 style={{ color: "#fff", fontSize: "1rem", margin: "0 0 0.3rem" }}>{s.name}</h3>
                {s.type && (
                  <span style={{ backgroundColor: "#cc666615", border: "1px solid #cc666640", borderRadius: "10px", color: "#cc6666", fontSize: "0.6rem", padding: "0.15rem 0.6rem", letterSpacing: "1px" }}>
                    {s.type}
                  </span>
                )}
                {s.homeworld && (
                  <p style={{ color: "#888", fontSize: "0.72rem", margin: "0.5rem 0 0", letterSpacing: "1px", textTransform: "uppercase" }}>
                    Homeworld: {s.homeworld}
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
        <Link to={`/systems/${systemId}`} style={{ flex: 1, backgroundColor: "#cc6666", display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: "bold", textDecoration: "none", letterSpacing: "2px", fontSize: "0.9rem" }}>
          RETURN TO SYSTEM DASHBOARD
        </Link>
        <div style={{ width: "20px", backgroundColor: "#cc6666", borderRadius: "0 20px 20px 0" }} />
      </div>
    </div>
  );
};

export default SystemSpecies;
