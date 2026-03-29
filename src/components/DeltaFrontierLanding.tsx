import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "./Header";

const STATUS_ITEMS = [
  { label: "Sensors detecting unstable anomaly",     color: "#F5B942", delay: "0s"    },
  { label: "Communications interference present",    color: "#FF6A2B", delay: "0.6s"  },
  { label: "Nearby systems on elevated alert",       color: "#CC4444", delay: "1.2s"  },
];

const ROLE_ITEMS = [
  { label: "Role",          value: "Starfleet Command Officer"                        },
  { label: "Responsibility", value: "Your decisions impact crew, mission, and outcome" },
  { label: "Environment",   value: "Deep space exploration with unknown threats"       },
];

const FEATURES = [
  "Persistent missions — the world continues even when you're offline",
  "Player-driven crew interaction and command structure",
  "Exploration, diplomacy, and tactical command in the Delta Quadrant",
];

export default function DeltaFrontierLanding() {
  const [mounted, setMounted] = useState(false);
  const [stardateTs, setStardateTs] = useState(Date.now());

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  // Drives the live stardate clock
  useEffect(() => {
    const id = setInterval(() => setStardateTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const stardate = (47000 + Math.floor(stardateTs / 86400)).toFixed(1);

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.15; }
        }
        @keyframes scanPulse {
          0%   { transform: translateY(-100%); opacity: 0;    }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(100vh);  opacity: 0;   }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 0.9; }
        }
        @keyframes transmitFlicker {
          0%, 95%, 100% { opacity: 1;   }
          96%            { opacity: 0.3; }
          97%            { opacity: 1;   }
          98%            { opacity: 0.5; }
          99%            { opacity: 1;   }
        }
        .accept-btn {
          display: inline-block;
          background: linear-gradient(135deg, #F5B942, #FF6A2B);
          color: #07152B;
          text-decoration: none;
          font-family: 'Orbitron', sans-serif;
          font-weight: 700;
          font-size: 0.82rem;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          padding: 0.9rem 2.6rem;
          border-radius: 4px;
          transition: opacity 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
        }
        .accept-btn:hover {
          opacity: 0.88;
          transform: translateY(-2px);
          box-shadow: 0 6px 28px #F5B94248;
        }
        .feature-item::before {
          content: '▸';
          color: #F5B942;
          margin-right: 0.6rem;
          font-size: 0.75rem;
        }
      `}</style>

      {/* Ambient glow */}
      <div style={styles.ambientGlow} />

      {/* Scan line sweep */}
      <div style={styles.scanLine} />

      <Header />

      {/* ── Transmission bar ─────────────────────────────── */}
      <div style={styles.txBar}>
        <span
          style={{
            ...styles.txDot,
            animationName: "blink",
            animationDuration: "1.2s",
            animationTimingFunction: "step-end",
            animationIterationCount: "infinite",
          }}
        />
        <span style={styles.txText}>
          STARFLEET COMMAND · PRIORITY ALPHA · STARDATE {stardate}
        </span>
      </div>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section
        style={{
          ...styles.hero,
          opacity: mounted ? 1 : 0,
          transform: mounted ? "none" : "translateY(14px)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
        }}
      >
        {/* grid overlay */}
        <div style={styles.heroGrid} />

        <p style={styles.worldLabel}>WORLD · DELTA FRONTIER COMMAND</p>

        <h1 style={styles.hookText}>
          An anomaly has been detected<br />
          at the edge of Federation space.<br />
          <span style={styles.hookAccent}>Its origin is unknown.</span><br />
          Orders are being issued.
        </h1>

        <Link to="/auth" className="accept-btn" style={{ marginTop: "2.25rem" }}>
          Accept Command
        </Link>
      </section>

      {/* ── Role ─────────────────────────────────────────── */}
      <section style={styles.section}>
        <p style={styles.sectionLabel}>▸ YOUR ASSIGNMENT</p>
        <div style={styles.roleGrid}>
          {ROLE_ITEMS.map((item) => (
            <div key={item.label} style={styles.roleCard}>
              <span style={styles.roleCardLabel}>{item.label}</span>
              <span style={styles.roleCardValue}>{item.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section style={{ ...styles.section, ...styles.sectionAlt }}>
        <p style={styles.sectionLabel}>▸ MISSION PARAMETERS</p>
        <ul style={styles.featureList}>
          {FEATURES.map((f) => (
            <li key={f} className="feature-item" style={styles.featureItem}>
              {f}
            </li>
          ))}
        </ul>
      </section>

      {/* ── Current Status ───────────────────────────────── */}
      <section style={styles.section}>
        <p style={styles.sectionLabel}>▸ CURRENT SECTOR STATUS</p>
        <div style={styles.statusList}>
          {STATUS_ITEMS.map((s) => (
            <div key={s.label} style={styles.statusRow}>
              <span
                style={{
                  ...styles.statusDot,
                  backgroundColor: s.color,
                  boxShadow: `0 0 6px ${s.color}`,
                  animationName: "blink",
                  animationDuration: "1.8s",
                  animationTimingFunction: "ease-in-out",
                  animationIterationCount: "infinite",
                  animationDelay: s.delay,
                }}
              />
              <span style={{ ...styles.statusLabel, color: s.color }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────── */}
      <section style={styles.ctaSection}>
        <div style={styles.ctaDivider} />
        <p style={styles.ctaSuper}>AWAITING AUTHORIZATION</p>
        <Link to="/auth" className="accept-btn">
          Accept Command
        </Link>
        <p style={styles.ctaSub}>Your assignment begins immediately.</p>
        <div style={styles.ctaDivider} />
      </section>

      <footer style={styles.footer}>
        <span style={styles.footerText}>
          © 2026 Astryx Forge · Delta Frontier Command
        </span>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    backgroundColor: "#07152B",
    minHeight: "100vh",
    color: "#ffffff",
    fontFamily: "'Segoe UI', sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  ambientGlow: {
    position: "fixed",
    top: "40%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "800px",
    height: "500px",
    background: "radial-gradient(ellipse, #0A3A7020 0%, transparent 65%)",
    pointerEvents: "none",
    zIndex: 0,
    animationName: "glowPulse",
    animationDuration: "7s",
    animationTimingFunction: "ease-in-out",
    animationIterationCount: "infinite",
  },
  scanLine: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: "80px",
    background: "linear-gradient(to bottom, transparent, rgba(245,185,66,0.012) 50%, transparent)",
    pointerEvents: "none",
    zIndex: 1,
    animationName: "scanPulse",
    animationDuration: "12s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
    animationDelay: "3s",
  },

  /* Transmission bar */
  txBar: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    justifyContent: "center",
    padding: "0.5rem 2rem",
    backgroundColor: "#040D1A",
    borderBottom: "1px solid #0D2240",
  },
  txDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: "#F5B942",
    flexShrink: 0,
    boxShadow: "0 0 6px #F5B942",
  },
  txText: {
    fontFamily: "Orbitron, sans-serif",
    fontSize: "0.58rem",
    letterSpacing: "2.5px",
    color: "#3A5A80",
    textTransform: "uppercase",
    animationName: "transmitFlicker",
    animationDuration: "8s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
  },

  /* Hero */
  hero: {
    position: "relative",
    zIndex: 2,
    textAlign: "center",
    padding: "4.5rem 2rem 4rem",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  heroGrid: {
    position: "absolute",
    inset: 0,
    backgroundImage: [
      "linear-gradient(rgba(245,185,66,0.025) 1px, transparent 1px)",
      "linear-gradient(90deg, rgba(245,185,66,0.025) 1px, transparent 1px)",
    ].join(", "),
    backgroundSize: "48px 48px",
    pointerEvents: "none",
    maskImage: "radial-gradient(ellipse 80% 100% at 50% 50%, black 40%, transparent 100%)",
    WebkitMaskImage: "radial-gradient(ellipse 80% 100% at 50% 50%, black 40%, transparent 100%)",
  },
  worldLabel: {
    fontFamily: "Orbitron, sans-serif",
    fontSize: "0.62rem",
    letterSpacing: "3.5px",
    color: "#F5B94280",
    textTransform: "uppercase",
    marginBottom: "2rem",
    position: "relative",
  },
  hookText: {
    position: "relative",
    fontFamily: "Orbitron, sans-serif",
    fontSize: "clamp(1.3rem, 3.5vw, 2.2rem)",
    fontWeight: 700,
    color: "#C8D8F0",
    lineHeight: 1.65,
    maxWidth: "700px",
    margin: "0 auto",
    letterSpacing: "1.5px",
  },
  hookAccent: {
    background: "linear-gradient(135deg, #F5B942, #FF6A2B)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },

  /* Shared section */
  section: {
    position: "relative",
    zIndex: 2,
    maxWidth: "860px",
    margin: "0 auto",
    padding: "2.5rem 2rem",
    borderTop: "1px solid #0D2240",
  },
  sectionAlt: {
    backgroundColor: "#040D1A",
    maxWidth: "100%",
  },
  sectionLabel: {
    fontFamily: "Orbitron, sans-serif",
    fontSize: "0.62rem",
    letterSpacing: "3px",
    color: "#3A5A80",
    textTransform: "uppercase",
    margin: "0 0 1.4rem 0",
  },

  /* Role grid */
  roleGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "1rem",
  },
  roleCard: {
    backgroundColor: "#0A1E38",
    border: "1px solid #1A3456",
    borderRadius: "6px",
    padding: "1rem 1.25rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  roleCardLabel: {
    fontFamily: "Orbitron, sans-serif",
    fontSize: "0.58rem",
    letterSpacing: "2px",
    color: "#3A5A80",
    textTransform: "uppercase",
  },
  roleCardValue: {
    fontSize: "0.88rem",
    color: "#C8D8F0",
    lineHeight: 1.4,
  },

  /* Features */
  featureList: {
    listStyle: "none",
    padding: 0,
    margin: "0 auto",
    maxWidth: "640px",
    display: "flex",
    flexDirection: "column",
    gap: "0.85rem",
  },
  featureItem: {
    fontSize: "0.92rem",
    color: "#8AAAD0",
    lineHeight: 1.5,
    display: "flex",
    alignItems: "baseline",
  },

  /* Status */
  statusList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.8rem",
    maxWidth: "480px",
  },
  statusRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.8rem",
  },
  statusDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    flexShrink: 0,
  },
  statusLabel: {
    fontFamily: "Orbitron, sans-serif",
    fontSize: "0.72rem",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
  },

  /* Final CTA */
  ctaSection: {
    position: "relative",
    zIndex: 2,
    textAlign: "center",
    padding: "3.5rem 2rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1.25rem",
  },
  ctaDivider: {
    width: "200px",
    height: "1px",
    background: "linear-gradient(90deg, transparent, #1A3456 30%, #F5B94230 50%, #1A3456 70%, transparent)",
  },
  ctaSuper: {
    fontFamily: "Orbitron, sans-serif",
    fontSize: "0.62rem",
    letterSpacing: "3.5px",
    color: "#2A4A6A",
    textTransform: "uppercase",
    margin: 0,
  },
  ctaSub: {
    fontFamily: "Orbitron, sans-serif",
    fontSize: "0.6rem",
    letterSpacing: "2.5px",
    color: "#2A4A6A",
    textTransform: "uppercase",
    margin: 0,
  },

  /* Footer */
  footer: {
    position: "relative",
    zIndex: 2,
    textAlign: "center",
    padding: "1.25rem",
    borderTop: "1px solid #0D2240",
  },
  footerText: {
    color: "#1A3456",
    fontSize: "0.72rem",
    fontFamily: "Orbitron, sans-serif",
    letterSpacing: "2px",
    textTransform: "uppercase",
  },
};
