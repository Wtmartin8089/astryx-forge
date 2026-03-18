import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { subscribeToCreatures, seedCreaturesIfEmpty } from "../utils/creaturesFirestore";
import type { Creature } from "../utils/creaturesFirestore";
import "../assets/lcars.css";

const CreatureDatabase = () => {
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    seedCreaturesIfEmpty();
    const unsub = subscribeToCreatures(setCreatures);
    const timer = setTimeout(() => setVisible(true), 50);
    return () => { unsub(); clearTimeout(timer); };
  }, []);

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
              fontSize: "1.6rem",
              fontWeight: "bold",
              letterSpacing: "3px",
              textTransform: "uppercase",
            }}
          >
            Xenobiology Database
          </h1>
          <span style={{ color: "#00000080", fontSize: "0.7rem", letterSpacing: "1px" }}>
            {creatures.length} RECORD{creatures.length !== 1 ? "S" : ""}
          </span>
        </div>
        <div style={{ width: "80px", backgroundColor: "#9933cc", borderRadius: "0 20px 20px 0" }} />
      </div>

      {/* Action bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "1.5rem",
        }}
      >
        <Link
          to="/creatures/new"
          style={{
            backgroundColor: "#33cc9920",
            border: "1px solid #33cc99",
            borderRadius: "20px",
            color: "#33cc99",
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "0.65rem",
            letterSpacing: "1.5px",
            padding: "0.4rem 1.2rem",
            textDecoration: "none",
            fontWeight: "bold",
          }}
        >
          + CATALOG NEW CREATURE
        </Link>
      </div>

      {/* Grid */}
      {creatures.length === 0 ? (
        <p style={{ color: "#555", textAlign: "center", fontSize: "0.9rem", marginTop: "3rem" }}>
          No creatures on file. Be the first to catalog one.
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          {creatures.map((c) => (
            <Link key={c.id} to={`/creatures/${c.id}`} style={{ textDecoration: "none" }}>
              <div
                style={{
                  backgroundColor: "#111",
                  border: "1px solid #33cc9930",
                  borderLeft: "4px solid #33cc99",
                  borderRadius: "0 12px 0 0",
                  padding: "1.1rem 1.25rem",
                  cursor: "pointer",
                  transition: "border-color 0.25s, box-shadow 0.25s",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = "#33cc99";
                  el.style.boxShadow = "0 0 15px #33cc9925";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = "#33cc9930";
                  el.style.borderLeftColor = "#33cc99";
                  el.style.boxShadow = "none";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "0.6rem",
                  }}
                >
                  <h3 style={{ color: "#fff", fontSize: "1rem", margin: 0 }}>{c.name}</h3>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {c.isHostile && (
                      <span
                        style={{
                          backgroundColor: "#cc333315",
                          border: "1px solid #cc333360",
                          borderRadius: "10px",
                          color: "#cc3333",
                          fontSize: "0.58rem",
                          padding: "0.15rem 0.5rem",
                          letterSpacing: "1px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        HOSTILE
                      </span>
                    )}
                    {c.isDomesticated && (
                      <span
                        style={{
                          backgroundColor: "#6699cc15",
                          border: "1px solid #6699cc60",
                          borderRadius: "10px",
                          color: "#6699cc",
                          fontSize: "0.58rem",
                          padding: "0.15rem 0.5rem",
                          letterSpacing: "1px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        DOMESTICATED
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.3rem 1rem" }}>
                  {c.type && (
                    <div style={{ gridColumn: "1 / -1" }}>
                      <span
                        style={{
                          color: "#555",
                          fontSize: "0.6rem",
                          letterSpacing: "1px",
                          textTransform: "uppercase",
                        }}
                      >
                        Type
                      </span>
                      <p
                        style={{
                          color: "#33cc99",
                          fontSize: "0.78rem",
                          margin: "0.1rem 0 0",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {c.type}
                      </p>
                    </div>
                  )}
                  {c.size && (
                    <div>
                      <span
                        style={{
                          color: "#555",
                          fontSize: "0.6rem",
                          letterSpacing: "1px",
                          textTransform: "uppercase",
                        }}
                      >
                        Size
                      </span>
                      <p style={{ color: "#aaa", fontSize: "0.78rem", margin: "0.1rem 0 0" }}>{c.size}</p>
                    </div>
                  )}
                  <div>
                    <span
                      style={{
                        color: "#555",
                        fontSize: "0.6rem",
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                      }}
                    >
                      Catalogued By
                    </span>
                    <p style={{ color: "#6699cc", fontSize: "0.78rem", margin: "0.1rem 0 0" }}>
                      {c.createdBy}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Bottom LCARS bar */}
      <div style={{ display: "flex", alignItems: "stretch", height: "45px" }}>
        <div style={{ width: "80px", backgroundColor: "#9933cc", borderRadius: "20px 0 0 20px" }} />
        <Link
          to="/"
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
          RETURN TO STAR MAP
        </Link>
        <div style={{ width: "20px", backgroundColor: "#33cc99", borderRadius: "0 20px 20px 0" }} />
      </div>
    </div>
  );
};

export default CreatureDatabase;
