import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { createCreature } from "../utils/creaturesFirestore";
import { getUserCharacterName } from "../utils/crewFirestore";
import "../assets/lcars.css";

const auth = getAuth();

const CreatureNew = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const systemId: string | undefined = (location.state as any)?.systemId;
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return auth.onAuthStateChanged((u) => setCurrentUser(u));
  }, []);

  const [form, setForm] = useState({
    name: "",
    type: "",
    size: "",
    form: "",
    attributes: "",
    baseMovement: "",
    resistance: "",
    specialAbilities: "",
    weapons: "",
    description: "",
    isHostile: false,
    isDomesticated: false,
  });

  const set = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !currentUser) return;
    setSubmitting(true);
    try {
      const characterName = await getUserCharacterName(currentUser.uid);
      const id = await createCreature({
        ...form,
        ...(systemId ? { systemId } : {}),
        createdBy: characterName || currentUser.email || currentUser.uid,
      });
      // If came from a system, return there; otherwise go to creature detail
      navigate(systemId ? `/systems/${systemId}/creatures` : `/creatures/${id}`);
    } catch (err) {
      console.error("Failed to create creature:", err);
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: "#0a0a0a",
    border: "1px solid #33cc9940",
    borderRadius: "4px",
    color: "#ccc",
    padding: "0.5rem 0.75rem",
    fontFamily: "'Orbitron', sans-serif",
    fontSize: "0.8rem",
    boxSizing: "border-box",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    color: "#555",
    fontSize: "0.6rem",
    letterSpacing: "2px",
    textTransform: "uppercase",
    marginBottom: "0.4rem",
  };

  const fieldWrap: React.CSSProperties = { marginBottom: "1.1rem" };

  return (
    <div
      style={{
        maxWidth: "720px",
        margin: "0 auto",
        padding: "2rem",
        fontFamily: "'Orbitron', sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "stretch", marginBottom: "2rem", height: "50px" }}>
        <div style={{ width: "20px", backgroundColor: "#33cc99", borderRadius: "20px 0 0 0" }} />
        <div
          style={{
            flex: 1,
            backgroundColor: "#33cc99",
            display: "flex",
            alignItems: "center",
            padding: "0 2rem",
          }}
        >
          <h1
            style={{
              margin: 0,
              color: "#000",
              fontSize: "1.4rem",
              fontWeight: "bold",
              letterSpacing: "3px",
              textTransform: "uppercase",
            }}
          >
            Catalog New Creature
          </h1>
        </div>
        <div style={{ width: "80px", backgroundColor: "#9933cc", borderRadius: "0 20px 20px 0" }} />
      </div>

      {/* System context banner */}
      {systemId && (
        <div style={{ backgroundColor: "#33cc9910", border: "1px solid #33cc9940", borderRadius: "4px", padding: "0.6rem 1rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ color: "#33cc99", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase" }}>
            ◆ This creature will be linked to the current star system
          </span>
        </div>
      )}

      <div
        style={{
          backgroundColor: "#111",
          border: "1px solid #33cc9930",
          borderTop: "3px solid #33cc99",
          borderRadius: "4px",
          padding: "2rem",
        }}
      >
        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div style={fieldWrap}>
            <label style={labelStyle}>Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Enter creature name..."
              style={inputStyle}
              required
            />
          </div>

          {/* Type */}
          <div style={fieldWrap}>
            <label style={labelStyle}>Type</label>
            <textarea
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
              placeholder="e.g. Pack hunter, avian, warm-blooded..."
              rows={2}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {/* Size / Form row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.1rem" }}>
            <div>
              <label style={labelStyle}>Size</label>
              <input
                type="text"
                value={form.size}
                onChange={(e) => set("size", e.target.value)}
                placeholder="e.g. 300kg, 6 meters"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Base Movement</label>
              <input
                type="text"
                value={form.baseMovement}
                onChange={(e) => set("baseMovement", e.target.value)}
                placeholder="e.g. 20 walking, 30 flying"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Form */}
          <div style={fieldWrap}>
            <label style={labelStyle}>Form</label>
            <textarea
              value={form.form}
              onChange={(e) => set("form", e.target.value)}
              placeholder="Physical description of body structure..."
              rows={2}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {/* Attributes / Resistance row */}
          <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: "1rem", marginBottom: "1.1rem" }}>
            <div>
              <label style={labelStyle}>Attributes</label>
              <textarea
                value={form.attributes}
                onChange={(e) => set("attributes", e.target.value)}
                placeholder="Fitness, Coordination, Presence, Instinct..."
                rows={2}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>
            <div>
              <label style={labelStyle}>Resistance</label>
              <input
                type="text"
                value={form.resistance}
                onChange={(e) => set("resistance", e.target.value)}
                placeholder="e.g. 5"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Special Abilities */}
          <div style={fieldWrap}>
            <label style={labelStyle}>Special Abilities / Unusual Skills</label>
            <textarea
              value={form.specialAbilities}
              onChange={(e) => set("specialAbilities", e.target.value)}
              placeholder="Night vision, camouflage, telepathy..."
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {/* Weapons */}
          <div style={fieldWrap}>
            <label style={labelStyle}>Weapons</label>
            <textarea
              value={form.weapons}
              onChange={(e) => set("weapons", e.target.value)}
              placeholder="Claws (4 damage), Bite (3 damage)..."
              rows={2}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {/* Description */}
          <div style={fieldWrap}>
            <label style={labelStyle}>Description and Additional Notes</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Behavior, habitat, cultural significance..."
              rows={5}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {/* Toggles */}
          <div
            style={{
              display: "flex",
              gap: "2rem",
              marginBottom: "1.5rem",
              padding: "1rem 1.25rem",
              backgroundColor: "#0a0a0a",
              border: "1px solid #33cc9920",
              borderRadius: "4px",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                cursor: "pointer",
                color: form.isHostile ? "#cc3333" : "#555",
                fontSize: "0.7rem",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                transition: "color 0.2s",
              }}
            >
              <input
                type="checkbox"
                checked={form.isHostile}
                onChange={(e) => set("isHostile", e.target.checked)}
                style={{ accentColor: "#cc3333", width: "14px", height: "14px" }}
              />
              Hostile
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                cursor: "pointer",
                color: form.isDomesticated ? "#6699cc" : "#555",
                fontSize: "0.7rem",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                transition: "color 0.2s",
              }}
            >
              <input
                type="checkbox"
                checked={form.isDomesticated}
                onChange={(e) => set("isDomesticated", e.target.checked)}
                style={{ accentColor: "#6699cc", width: "14px", height: "14px" }}
              />
              Domesticated
            </label>
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
            <Link
              to="/creatures"
              style={{
                backgroundColor: "transparent",
                border: "1px solid #333",
                borderRadius: "20px",
                color: "#666",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.65rem",
                letterSpacing: "1.5px",
                padding: "0.5rem 1.2rem",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
              }}
            >
              CANCEL
            </Link>
            <button
              type="submit"
              disabled={submitting || !form.name.trim()}
              style={{
                backgroundColor:
                  submitting || !form.name.trim() ? "#33cc9940" : "#33cc99",
                border: "none",
                borderRadius: "20px",
                color: "#000",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.65rem",
                fontWeight: "bold",
                letterSpacing: "1.5px",
                padding: "0.5rem 1.4rem",
                cursor: submitting || !form.name.trim() ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "CATALOGUING..." : "CREATE CREATURE"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatureNew;
