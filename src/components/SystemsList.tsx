import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { subscribeToSystems, createSystem } from "../utils/systemsFirestore";
import type { StarSystem } from "../utils/systemsFirestore";
import "../assets/lcars.css";

const auth = getAuth();

const SystemsList = () => {
  const [systems, setSystems] = useState<StarSystem[]>([]);
  const [visible, setVisible] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = subscribeToSystems(setSystems);
    const timer = setTimeout(() => setVisible(true), 50);
    return () => { unsub(); clearTimeout(timer); };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const currentUser = auth.currentUser;
    const id = await createSystem({
      name: name.trim(),
      region: region.trim(),
      description: description.trim(),
      createdBy: currentUser?.email || currentUser?.uid || "Unknown",
    });
    setSaving(false);
    navigate(`/systems/${id}`);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: "#0a0a0a",
    border: "1px solid #6699cc40",
    borderRadius: "4px",
    color: "#ccc",
    padding: "0.5rem 0.75rem",
    fontFamily: "'Orbitron', sans-serif",
    fontSize: "0.8rem",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "2rem",
        fontFamily: "'Orbitron', sans-serif",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-30px)",
        transition: "opacity 0.5s ease-out, transform 0.5s ease-out",
      }}
    >
      {/* LCARS Header */}
      <div style={{ display: "flex", alignItems: "stretch", marginBottom: "2rem", height: "50px" }}>
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
          <h1 style={{ margin: 0, color: "#000", fontSize: "1.6rem", fontWeight: "bold", letterSpacing: "3px", textTransform: "uppercase" }}>
            Star Systems Database
          </h1>
          <span style={{ color: "#00000080", fontSize: "0.7rem", letterSpacing: "1px" }}>
            {systems.length} SYSTEM{systems.length !== 1 ? "S" : ""}
          </span>
        </div>
        <div style={{ width: "80px", backgroundColor: "#9933cc", borderRadius: "0 20px 20px 0" }} />
      </div>

      {/* Action bar */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1.5rem" }}>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{
            backgroundColor: showForm ? "#ffcc3340" : "#ffcc3320",
            border: "1px solid #ffcc33",
            borderRadius: "20px",
            color: "#ffcc33",
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "0.65rem",
            letterSpacing: "1.5px",
            padding: "0.4rem 1.2rem",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          {showForm ? "CANCEL" : "+ CATALOG NEW SYSTEM"}
        </button>
      </div>

      {/* New System Form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          style={{
            backgroundColor: "#111",
            border: "1px solid #ffcc3330",
            borderTop: "3px solid #ffcc33",
            borderRadius: "4px",
            padding: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ display: "block", color: "#555", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                System Name *
              </label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Machida System" style={inputStyle} required />
            </div>
            <div>
              <label style={{ display: "block", color: "#555", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                Region
              </label>
              <input type="text" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g. Delta Quadrant, Sector 7" style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", color: "#555", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.4rem" }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Overview of this star system..."
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              style={{
                backgroundColor: saving || !name.trim() ? "#ffcc3340" : "#ffcc33",
                border: "none",
                borderRadius: "20px",
                color: "#000",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.65rem",
                fontWeight: "bold",
                letterSpacing: "1.5px",
                padding: "0.5rem 1.4rem",
                cursor: saving || !name.trim() ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "CREATING..." : "CREATE SYSTEM"}
            </button>
          </div>
        </form>
      )}

      {/* Systems Grid */}
      {systems.length === 0 ? (
        <p style={{ color: "#555", textAlign: "center", fontSize: "0.9rem", marginTop: "3rem" }}>
          No star systems catalogued yet.
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {systems.map((s) => (
            <Link key={s.id} to={`/systems/${s.id}`} style={{ textDecoration: "none" }}>
              <div
                style={{
                  backgroundColor: "#111",
                  border: "1px solid #ffcc3330",
                  borderLeft: "4px solid #ffcc33",
                  borderRadius: "0 12px 0 0",
                  padding: "1.1rem 1.25rem",
                  cursor: "pointer",
                  transition: "border-color 0.25s, box-shadow 0.25s",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = "#ffcc33";
                  el.style.boxShadow = "0 0 15px #ffcc3325";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = "#ffcc3330";
                  el.style.borderLeftColor = "#ffcc33";
                  el.style.boxShadow = "none";
                }}
              >
                <h3 style={{ color: "#ffcc33", fontSize: "1rem", margin: "0 0 0.4rem" }}>{s.name}</h3>
                {s.region && (
                  <p style={{ color: "#888", fontSize: "0.72rem", margin: "0 0 0.5rem", letterSpacing: "1px", textTransform: "uppercase" }}>
                    {s.region}
                  </p>
                )}
                {s.description && (
                  <p
                    style={{
                      color: "#aaa",
                      fontSize: "0.8rem",
                      margin: 0,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    } as any}
                  >
                    {s.description}
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
        <Link
          to="/"
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
          RETURN TO STAR MAP
        </Link>
        <div style={{ width: "20px", backgroundColor: "#ffcc33", borderRadius: "0 20px 20px 0" }} />
      </div>
    </div>
  );
};

export default SystemsList;
