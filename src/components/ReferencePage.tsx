import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../assets/lcars.css";

interface DocumentCard {
  title: string;
  description: string;
  color: string;
  path: string;
  badge?: string;
  comingSoon?: boolean;
}

const documents: DocumentCard[] = [
  {
    title: "Articles of the Federation",
    description: "The founding charter of the United Federation of Planets",
    color: "#6699cc",
    path: "/reference/articles-of-federation",
    badge: "DECLASSIFIED",
  },
  {
    title: "Starfleet General Orders",
    description: "Standing directives governing all Starfleet officers and vessels",
    color: "#33cc99",
    path: "/reference/general-orders",
    comingSoon: true,
  },
  {
    title: "Federation Law Compendium",
    description: "Codified statutes and interstellar legal precedents",
    color: "#9933cc",
    path: "/reference/federation-law",
    comingSoon: true,
  },
];

const ReferencePage = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

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
      <p
        style={{
          color: "#555",
          fontSize: "0.65rem",
          letterSpacing: "2px",
          marginBottom: "1rem",
          textTransform: "uppercase",
        }}
      >
        <Link to="/" style={{ color: "#ffcc3380", textDecoration: "none" }}>
          Star Map
        </Link>
        {" / "}
        <span style={{ color: "#ffcc33" }}>Reference</span>
      </p>

      {/* Header bar */}
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          marginBottom: "0.75rem",
          height: "56px",
        }}
      >
        <div
          style={{
            width: "20px",
            backgroundColor: "#ffcc33",
            borderRadius: "20px 0 0 0",
          }}
        />
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
          <div>
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
              Starfleet Reference Library
            </h1>
          </div>
        </div>
        <div
          style={{
            width: "80px",
            backgroundColor: "#9933cc",
            borderRadius: "0 20px 20px 0",
          }}
        />
      </div>

      {/* Subtitle strip */}
      <div
        style={{
          backgroundColor: "#121826",
          border: "1px solid #ffcc3320",
          borderTop: "none",
          borderRadius: "0 0 8px 8px",
          padding: "0.6rem 2rem",
          marginBottom: "2.5rem",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "#ffcc3360",
            fontSize: "0.65rem",
            letterSpacing: "3px",
            textTransform: "uppercase",
          }}
        >
          Classified Documents — Authorized Personnel Only
        </p>
      </div>

      {/* Section label */}
      <p
        style={{
          color: "#555",
          fontSize: "0.6rem",
          letterSpacing: "3px",
          textTransform: "uppercase",
          marginBottom: "1.25rem",
        }}
      >
        Available Documents
      </p>

      {/* Document cards grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "1.25rem",
          marginBottom: "3rem",
        }}
      >
        {documents.map((doc) => {
          const cardInner = (
            <div
              style={{
                backgroundColor: "#111",
                border: `1px solid ${doc.color}30`,
                borderLeft: `4px solid ${doc.comingSoon ? doc.color + "50" : doc.color}`,
                borderRadius: "0 16px 0 0",
                padding: "1.5rem",
                height: "100%",
                boxSizing: "border-box",
                cursor: doc.comingSoon ? "default" : "pointer",
                opacity: doc.comingSoon ? 0.5 : 1,
                transition: "border-color 0.25s, box-shadow 0.25s",
              }}
              onMouseEnter={(e) => {
                if (doc.comingSoon) return;
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = doc.color;
                el.style.boxShadow = `0 0 18px ${doc.color}20`;
              }}
              onMouseLeave={(e) => {
                if (doc.comingSoon) return;
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = `${doc.color}30`;
                el.style.borderLeftColor = doc.color;
                el.style.boxShadow = "none";
              }}
            >
              {/* Card header row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "0.75rem",
                }}
              >
                <h2
                  style={{
                    color: "#fff",
                    fontSize: "0.85rem",
                    margin: 0,
                    letterSpacing: "1.5px",
                    textTransform: "uppercase",
                    lineHeight: "1.4",
                    flex: 1,
                    paddingRight: "0.75rem",
                  }}
                >
                  {doc.title}
                </h2>
                {doc.badge && (
                  <span
                    style={{
                      backgroundColor: `${doc.color}18`,
                      border: `1px solid ${doc.color}50`,
                      borderRadius: "4px",
                      color: doc.color,
                      fontSize: "0.55rem",
                      padding: "0.2rem 0.5rem",
                      letterSpacing: "1.5px",
                      whiteSpace: "nowrap",
                      fontWeight: "bold",
                    }}
                  >
                    {doc.badge}
                  </span>
                )}
                {doc.comingSoon && (
                  <span
                    style={{
                      backgroundColor: "#ffffff08",
                      border: "1px solid #ffffff20",
                      borderRadius: "4px",
                      color: "#555",
                      fontSize: "0.55rem",
                      padding: "0.2rem 0.5rem",
                      letterSpacing: "1.5px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    COMING SOON
                  </span>
                )}
              </div>

              <p
                style={{
                  color: "#666",
                  fontSize: "0.72rem",
                  margin: 0,
                  letterSpacing: "0.5px",
                  lineHeight: "1.6",
                  textTransform: "uppercase",
                }}
              >
                {doc.description}
              </p>

              {!doc.comingSoon && (
                <p
                  style={{
                    color: doc.color,
                    fontSize: "0.6rem",
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                    marginTop: "1.25rem",
                    marginBottom: 0,
                  }}
                >
                  Access Document &rsaquo;
                </p>
              )}
            </div>
          );

          if (doc.comingSoon) {
            return (
              <div key={doc.title} style={{ textDecoration: "none" }}>
                {cardInner}
              </div>
            );
          }

          return (
            <Link
              key={doc.title}
              to={doc.path}
              style={{ textDecoration: "none" }}
            >
              {cardInner}
            </Link>
          );
        })}
      </div>

      {/* Bottom bar */}
      <div style={{ display: "flex", alignItems: "stretch", height: "45px" }}>
        <div
          style={{
            width: "80px",
            backgroundColor: "#9933cc",
            borderRadius: "20px 0 0 20px",
          }}
        />
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
        <div
          style={{
            width: "20px",
            backgroundColor: "#ffcc33",
            borderRadius: "0 20px 20px 0",
          }}
        />
      </div>
    </div>
  );
};

export default ReferencePage;
