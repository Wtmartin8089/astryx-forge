import { Link } from "react-router-dom";
import Header from "./Header";

type WorldStatus = "flagship" | "live" | "in-development" | "planned";

const worlds: { title: string; hook: string; status: WorldStatus; slug: string }[] = [
  {
    title: "Delta Frontier Command",
    hook: "Command a starship at the edge of known space.",
    status: "flagship",
    slug: "delta-frontier-command",
  },
  {
    title: "Iron Constellations",
    hook: "Wage war across a fractured galaxy.",
    status: "in-development",
    slug: "iron-constellations",
  },
  {
    title: "Midnight Dominion",
    hook: "Power is taken in the shadows.",
    status: "planned",
    slug: "midnight-dominion",
  },
  {
    title: "The Shattered Kingdoms",
    hook: "Reclaim a world broken by war and magic.",
    status: "planned",
    slug: "shattered-kingdoms",
  },
];

const statusConfig: Record<WorldStatus, { label: string; color: string }> = {
  flagship:         { label: "FLAGSHIP",       color: "#F5B942" },
  live:             { label: "LIVE",            color: "#4ADE80" },
  "in-development": { label: "IN DEVELOPMENT", color: "#FF6A2B" },
  planned:          { label: "PLANNED",         color: "#4A6A90" },
};

// Fixed star positions — prevents layout shift on re-render
const STARS = [
  { x: 4,  y: 12, s: 1.5 }, { x: 12, y: 28, s: 1 },  { x: 21, y: 7,  s: 1 },
  { x: 33, y: 18, s: 1.5 }, { x: 42, y: 5,  s: 1 },   { x: 53, y: 32, s: 1 },
  { x: 61, y: 11, s: 1.5 }, { x: 72, y: 22, s: 1 },   { x: 80, y: 8,  s: 1.5 },
  { x: 90, y: 30, s: 1 },   { x: 95, y: 14, s: 1 },   { x: 8,  y: 60, s: 1 },
  { x: 18, y: 75, s: 1.5 }, { x: 29, y: 55, s: 1 },   { x: 47, y: 70, s: 1 },
  { x: 58, y: 50, s: 1.5 }, { x: 68, y: 80, s: 1 },   { x: 78, y: 65, s: 1.5 },
  { x: 87, y: 55, s: 1 },   { x: 93, y: 72, s: 1.5 },
];

export default function LandingPage() {
  return (
    <div style={styles.page}>
      <style>{`
        @keyframes glowPulse {
          0%, 100% { opacity: 1;   transform: translate(-50%, -50%) scale(1);    }
          50%       { opacity: 0.6; transform: translate(-50%, -50%) scale(1.12); }
        }
        @keyframes starTwinkle {
          0%, 100% { opacity: 0.25; }
          50%       { opacity: 0.6; }
        }
        .world-card {
          text-decoration: none;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          transition: border-color 0.25s ease, box-shadow 0.25s ease, transform 0.2s ease;
          cursor: pointer;
        }
        .world-card:hover {
          border-color: #F5B94260 !important;
          box-shadow: 0 4px 28px #F5B94215;
          transform: translateY(-3px);
        }
        .world-card.flagship:hover {
          border-color: #F5B942 !important;
          box-shadow: 0 4px 36px #F5B94232;
        }
        .world-card-arrow {
          transition: transform 0.2s ease;
        }
        .world-card:hover .world-card-arrow {
          transform: translateX(5px);
        }
        .enter-btn {
          transition: opacity 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
        }
        .enter-btn:hover {
          opacity: 0.88;
          transform: translateY(-2px);
          box-shadow: 0 6px 24px #F5B94240;
        }
      `}</style>

      <Header />

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section style={styles.hero}>
        <div style={styles.heroGlow} />

        {STARS.map((star, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.s}px`,
              height: `${star.s}px`,
              borderRadius: "50%",
              backgroundColor: "rgba(200, 216, 240, 0.5)",
              pointerEvents: "none",
              animationName: "starTwinkle",
              animationDuration: `${2.5 + (i % 5) * 0.7}s`,
              animationTimingFunction: "ease-in-out",
              animationIterationCount: "infinite",
              animationDelay: `${(i % 7) * 0.4}s`,
            }}
          />
        ))}

        <h1 style={styles.heroTitle}>ASTRYX FORGE</h1>
        <p style={styles.heroSubtitle}>Forge Your Worlds</p>
        <p style={styles.heroDesc}>
          Multiple persistent universes. One engine. Your story.
        </p>
        <Link to="/auth" className="enter-btn" style={styles.btnPrimary}>
          Enter the Forge
        </Link>
      </section>

      {/* ── Worlds ───────────────────────────────────────────── */}
      <section style={styles.worldsSection}>
        <p style={styles.sectionLabel}>▸ ACTIVE UNIVERSES</p>
        <div style={styles.worldsGrid}>
          {worlds.map((w) => {
            const cfg = statusConfig[w.status];
            const isFlagship = w.status === "flagship";
            return (
              <Link
                key={w.slug}
                to={isFlagship ? "/worlds/delta-frontier-command" : "/worlds"}
                className={`world-card${isFlagship ? " flagship" : ""}`}
                style={{
                  ...styles.card,
                  ...(isFlagship ? styles.cardFlagship : {}),
                }}
              >
                <div style={styles.cardHeader}>
                  <h2 style={styles.cardTitle}>{w.title}</h2>
                  <span
                    style={{
                      ...styles.badge,
                      color: cfg.color,
                      borderColor: `${cfg.color}70`,
                      backgroundColor: `${cfg.color}12`,
                    }}
                  >
                    {cfg.label}
                  </span>
                </div>
                <p style={styles.cardHook}>{w.hook}</p>
                <span className="world-card-arrow" style={{ ...styles.cardArrow, color: cfg.color }}>
                  →
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <footer style={styles.footer}>
        <span style={styles.footerText}>© 2026 Astryx Forge · All rights reserved</span>
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
  },

  /* ── Hero ── */
  hero: {
    position: "relative",
    textAlign: "center",
    padding: "3.5rem 2rem 3rem",
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "640px",
    height: "280px",
    background: "radial-gradient(ellipse, #F5B94222 0%, transparent 70%)",
    pointerEvents: "none",
    animationName: "glowPulse",
    animationDuration: "5s",
    animationTimingFunction: "ease-in-out",
    animationIterationCount: "infinite",
  },
  heroTitle: {
    position: "relative",
    fontFamily: "Orbitron, sans-serif",
    fontSize: "clamp(2.2rem, 6vw, 4.5rem)",
    fontWeight: 900,
    background: "linear-gradient(135deg, #F5B942, #FF6A2B)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    marginBottom: "0.4rem",
    letterSpacing: "4px",
  },
  heroSubtitle: {
    position: "relative",
    fontFamily: "Orbitron, sans-serif",
    fontSize: "clamp(0.85rem, 2.2vw, 1.2rem)",
    color: "#C8D8F0",
    marginBottom: "1rem",
    letterSpacing: "3px",
  },
  heroDesc: {
    position: "relative",
    fontSize: "1rem",
    color: "#6A90B8",
    maxWidth: "420px",
    margin: "0 auto 2rem",
    lineHeight: 1.6,
  },
  btnPrimary: {
    position: "relative",
    display: "inline-block",
    background: "linear-gradient(135deg, #F5B942, #FF6A2B)",
    color: "#07152B",
    textDecoration: "none",
    fontFamily: "Orbitron, sans-serif",
    fontWeight: 700,
    fontSize: "0.82rem",
    letterSpacing: "2px",
    padding: "0.8rem 2.2rem",
    borderRadius: "4px",
    textTransform: "uppercase",
  },

  /* ── Worlds ── */
  worldsSection: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "2rem 2rem 3rem",
    borderTop: "1px solid #0D2240",
  },
  sectionLabel: {
    fontFamily: "Orbitron, sans-serif",
    fontSize: "0.68rem",
    letterSpacing: "3px",
    color: "#3A5A80",
    textTransform: "uppercase",
    margin: "0 0 1.25rem 0",
  },
  worldsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "1rem",
  },
  card: {
    backgroundColor: "#0A1E38",
    border: "1px solid #1A3456",
    borderRadius: "8px",
    padding: "1.25rem 1.5rem",
  },
  cardFlagship: {
    border: "1px solid #F5B94248",
    boxShadow: "0 0 24px #F5B94212",
  },
  cardHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "0.75rem",
  },
  cardTitle: {
    fontFamily: "Orbitron, sans-serif",
    fontSize: "0.88rem",
    color: "#D8C090",
    letterSpacing: "1.5px",
    margin: 0,
    lineHeight: 1.4,
  },
  badge: {
    fontSize: "0.58rem",
    fontFamily: "Orbitron, sans-serif",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    border: "1px solid",
    padding: "0.2rem 0.5rem",
    borderRadius: "20px",
    whiteSpace: "nowrap",
    flexShrink: 0,
    marginTop: "2px",
  },
  cardHook: {
    color: "#5A7898",
    fontSize: "0.86rem",
    lineHeight: 1.5,
    margin: 0,
  },
  cardArrow: {
    fontFamily: "Orbitron, sans-serif",
    fontSize: "0.85rem",
    display: "inline-block",
    marginTop: "0.1rem",
  },

  /* ── Footer ── */
  footer: {
    textAlign: "center",
    padding: "1.25rem",
    borderTop: "1px solid #0D2240",
  },
  footerText: {
    color: "#2A4060",
    fontSize: "0.75rem",
  },
};
