import { Link } from "react-router-dom";
import Header from "./Header";

type Status = "flagship" | "in-development" | "planned";

const worlds: { title: string; desc: string; status: Status; slug: string; btnText: string }[] = [
  {
    title: "Delta Frontier Command",
    desc: "Starship exploration and tactical campaigns in the Delta Quadrant. Command a vessel, serve aboard a crew, and expand the frontier of the Federation.",
    status: "flagship",
    slug: "delta-frontier-command",
    btnText: "Enter the Frontier",
  },
  {
    title: "Midnight Dominion",
    desc: "Ancient vampire houses wage secret wars for control of the night while humanity sleeps.",
    status: "planned",
    slug: "midnight-dominion",
    btnText: "Enter the Dominion",
  },
  {
    title: "Iron Constellations",
    desc: "The Sith have consolidated power across a fractured galaxy. The Jedi are believed extinct — a legend used to frighten children. Choose your allegiance and survive.",
    status: "in-development",
    slug: "iron-constellations",
    btnText: "Enter the Warzone",
  },
  {
    title: "The Shattered Kingdoms",
    desc: "Ancient kingdoms lie broken after devastating wars. Heroes rise to reclaim lost lands and forgotten magic.",
    status: "planned",
    slug: "shattered-kingdoms",
    btnText: "Begin Your Quest",
  },
];

const statusLabel: Record<Status, string> = {
  "flagship": "Flagship Universe",
  "in-development": "In Development",
  "planned": "Planned",
};

const statusColor: Record<Status, string> = {
  "flagship": "#F5B942",
  "in-development": "#FF6A2B",
  "planned": "#4A6A90",
};

export default function WorldsPage() {
  return (
    <div style={styles.page}>
      <Header />

      <section style={styles.hero}>
        <h1 style={styles.title}>Explore the Universes of Astryx Forge</h1>
        <p style={styles.subtitle}>Choose a world and begin your story.</p>
      </section>

      <section style={styles.grid}>
        {worlds.map((w) => {
          const hasLanding = w.slug === "delta-frontier-command" || w.slug === "iron-constellations";
          const cardStyle = {
            ...styles.card,
            ...(w.status === "flagship" ? styles.cardFlagship : {}),
            ...(hasLanding ? styles.cardClickable : {}),
          };
          const inner = (
            <>
              <div style={styles.cardTop}>
                <span style={{ ...styles.badge, color: statusColor[w.status], borderColor: statusColor[w.status] }}>
                  {statusLabel[w.status]}
                </span>
              </div>
              <h2 style={styles.cardTitle}>{w.title}</h2>
              <p style={styles.cardDesc}>{w.desc}</p>
              <span style={hasLanding
                ? (w.status === "flagship" ? styles.cardLink : styles.cardLinkAlt)
                : styles.cardLinkDisabled
              }>
                {w.btnText} →
              </span>
            </>
          );
          return hasLanding ? (
            <Link key={w.slug} to={`/worlds/${w.slug}`} style={cardStyle}>{inner}</Link>
          ) : (
            <div key={w.slug} style={cardStyle}>{inner}</div>
          );
        })}
      </section>

      <footer style={styles.footer}>
        <span style={styles.footerText}>© 2026 Astryx Forge · All rights reserved</span>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    backgroundColor: "#0B1E3A",
    minHeight: "100vh",
    color: "#ffffff",
    fontFamily: "'Segoe UI', sans-serif",
  },
  hero: {
    textAlign: "center",
    padding: "4rem 2rem 2.5rem",
    borderBottom: "1px solid #1E3A5F",
  },
  title: {
    fontFamily: "Orbitron, sans-serif",
    fontSize: "clamp(1.8rem, 4vw, 3rem)",
    fontWeight: 900,
    background: "linear-gradient(135deg, #F5B942, #FF6A2B)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: "4px",
    marginBottom: "0.75rem",
  },
  subtitle: {
    color: "#8AAAD0",
    fontSize: "1rem",
    letterSpacing: "1.5px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "1.75rem",
    maxWidth: "1100px",
    margin: "3rem auto",
    padding: "0 2rem",
  },
  card: {
    backgroundColor: "#0D2240",
    border: "1px solid #1E3A5F",
    borderRadius: "8px",
    padding: "1.75rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  cardClickable: {
    textDecoration: "none",
    cursor: "pointer",
    transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
  },
  cardFlagship: {
    border: "1px solid #F5B942",
    boxShadow: "0 0 20px #F5B94220",
  },
  cardTop: {
    display: "flex",
    justifyContent: "flex-end",
  },
  badge: {
    fontSize: "0.7rem",
    fontFamily: "Orbitron, sans-serif",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    border: "1px solid",
    padding: "0.2rem 0.6rem",
    borderRadius: "20px",
  },
  cardTitle: {
    fontFamily: "Orbitron, sans-serif",
    fontSize: "1rem",
    color: "#F5B942",
    letterSpacing: "2px",
    margin: 0,
  },
  cardDesc: {
    color: "#8AAAD0",
    fontSize: "0.9rem",
    lineHeight: 1.6,
    margin: 0,
    flexGrow: 1,
  },
  cardLink: {
    color: "#FF6A2B",
    textDecoration: "none",
    fontFamily: "Orbitron, sans-serif",
    fontSize: "0.78rem",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    marginTop: "0.5rem",
  },
  cardLinkAlt: {
    color: "#FF6A2B",
    textDecoration: "none",
    fontFamily: "Orbitron, sans-serif",
    fontSize: "0.78rem",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    marginTop: "0.5rem",
    opacity: 0.7,
  },
  cardLinkDisabled: {
    color: "#3A5A80",
    fontFamily: "Orbitron, sans-serif",
    fontSize: "0.78rem",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    marginTop: "0.5rem",
  },
  footer: {
    textAlign: "center",
    padding: "1.5rem",
    borderTop: "1px solid #1E3A5F",
    marginTop: "2rem",
  },
  footerText: {
    color: "#3A5A80",
    fontSize: "0.8rem",
  },
};
