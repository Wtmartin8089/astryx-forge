import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getCreature } from "../utils/creaturesFirestore";
import type { Creature } from "../utils/creaturesFirestore";
import "../assets/lcars.css";

const CreatureDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [creature, setCreature] = useState<Creature | null>(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!id) return;
    getCreature(id).then((c) => {
      setCreature(c);
      setLoading(false);
      setTimeout(() => setVisible(true), 50);
    });
  }, [id]);

  if (loading) {
    return (
      <p style={{ color: "#33cc99", textAlign: "center", fontFamily: "'Orbitron', sans-serif", marginTop: "4rem" }}>
        Accessing xenobiology database...
      </p>
    );
  }

  if (!creature) {
    return (
      <p style={{ color: "#cc3333", textAlign: "center", fontFamily: "'Orbitron', sans-serif", marginTop: "4rem" }}>
        Record not found.
      </p>
    );
  }

  const fieldLabelStyle: React.CSSProperties = {
    color: "#555",
    fontSize: "0.6rem",
    letterSpacing: "2px",
    textTransform: "uppercase",
    marginBottom: "0.3rem",
  };

  const fieldValueStyle: React.CSSProperties = {
    color: "#ccc",
    fontSize: "0.88rem",
    lineHeight: "1.6",
    whiteSpace: "pre-wrap",
  };

  const section = (label: string, value: string | undefined) => {
    if (!value) return null;
    return (
      <div
        style={{
          marginBottom: "1.25rem",
          padding: "0.9rem 1.1rem",
          backgroundColor: "#0d0d0d",
          border: "1px solid #33cc9918",
          borderLeft: "3px solid #33cc99",
          borderRadius: "0 8px 0 0",
        }}
      >
        <p style={fieldLabelStyle}>{label}</p>
        <p style={fieldValueStyle}>{value}</p>
      </div>
    );
  };

  return (
    <div
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "2rem",
        fontFamily: "'Orbitron', sans-serif",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-30px)",
        transition: "opacity 0.5s ease-out, transform 0.5s ease-out",
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
            justifyContent: "space-between",
            padding: "0 2rem",
          }}
        >
          <h1
            style={{
              margin: 0,
              color: "#000",
              fontSize: "1.5rem",
              fontWeight: "bold",
              letterSpacing: "3px",
              textTransform: "uppercase",
            }}
          >
            {creature.name}
          </h1>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {creature.isHostile && (
              <span
                style={{
                  backgroundColor: "#cc333325",
                  border: "1px solid #cc3333",
                  borderRadius: "12px",
                  color: "#cc3333",
                  fontSize: "0.6rem",
                  padding: "0.2rem 0.7rem",
                  letterSpacing: "1px",
                }}
              >
                HOSTILE
              </span>
            )}
            {creature.isDomesticated && (
              <span
                style={{
                  backgroundColor: "#6699cc25",
                  border: "1px solid #6699cc",
                  borderRadius: "12px",
                  color: "#6699cc",
                  fontSize: "0.6rem",
                  padding: "0.2rem 0.7rem",
                  letterSpacing: "1px",
                }}
              >
                DOMESTICATED
              </span>
            )}
          </div>
        </div>
        <div style={{ width: "80px", backgroundColor: "#9933cc", borderRadius: "0 20px 20px 0" }} />
      </div>

      {/* Quick-stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "0.75rem",
          marginBottom: "1.75rem",
        }}
      >
        {[
          { label: "Type", value: creature.type },
          { label: "Size", value: creature.size },
          { label: "Base Movement", value: creature.baseMovement },
          { label: "Resistance", value: creature.resistance },
          { label: "Catalogued By", value: creature.createdBy },
        ]
          .filter((f) => f.value)
          .map((f) => (
            <div
              key={f.label}
              style={{
                backgroundColor: "#111",
                border: "1px solid #33cc9920",
                borderRadius: "4px",
                padding: "0.65rem 0.9rem",
              }}
            >
              <p style={{ ...fieldLabelStyle, marginBottom: "0.25rem" }}>{f.label}</p>
              <p style={{ color: "#33cc99", fontSize: "0.82rem", margin: 0 }}>{f.value}</p>
            </div>
          ))}
      </div>

      {/* Detail sections */}
      {section("Form", creature.form)}
      {section("Attributes", creature.attributes)}
      {section("Special Abilities / Unusual Skills", creature.specialAbilities)}
      {section("Weapons", creature.weapons)}
      {section("Description and Additional Notes", creature.description)}

      {/* Bottom LCARS bar */}
      <div style={{ display: "flex", alignItems: "stretch", height: "45px", marginTop: "2rem" }}>
        <div style={{ width: "80px", backgroundColor: "#9933cc", borderRadius: "20px 0 0 20px" }} />
        <Link
          to="/creatures"
          style={{
            flex: 1,
            backgroundColor: "#33cc99",
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
          RETURN TO XENOBIOLOGY DATABASE
        </Link>
        <div style={{ width: "20px", backgroundColor: "#33cc99", borderRadius: "0 20px 20px 0" }} />
      </div>
    </div>
  );
};

export default CreatureDetail;
