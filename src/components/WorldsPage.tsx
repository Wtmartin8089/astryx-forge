import { Link } from "react-router-dom";
import Header from "./Header";

type Status = "active" | "coming-soon" | "planned";

const worlds: { title: string; desc: string; status: Status; slug: string }[] = [
  {
    title: "Fleet Command",
    desc: "Starship exploration and tactical campaigns.",
    status: "active",
    slug: "fleet-command",
  },
  {
    title: "Dark Nights",
    desc: "Urban gothic vampire politics and intrigue.",
    status: "coming-soon",
    slug: "dark-nights",
  },
  {
    title: "Galactic Conflict",
    desc: "Space opera warfare between factions.",
    status: "planned",
    slug: "galactic-conflict",
  },
  {
    title: "Fantasy Realms",
    desc: "Traditional fantasy adventure worlds.",
    status: "planned",
    slug: "fantasy-realms",
  },
];

const statusLabel: Record<Status, string> = {
  "active": "Active",
  "coming-soon": "Coming Soon",
  "planned": "Planned",
};

const statusColor: Record<Status, string> = {
  "active": "#F5B942",
  "coming-soon": "#FF6A2B",
  "planned": "#4A6A90",
};

export default function WorldsPage() {
  return (
    <div style={styles.page}>
      <Header />

      <section style={styles.hero}>
        <h1 style={styles.title}>RPG Worlds</h1>
        <p style={styles.subtitle}>Choose your universe and forge your legend.</p>
      </section>

      <section style={styles.grid}>
        {worlds.map((w) => (
          <div key={w.slug} style={styles.card}>
            <div style={styles.cardTop}>
              <span
                style={{
                  ...styles.badge,
                  color: statusColor[w.status],
                  borderColor: statusColor[w.status],
                }}
              >
                {statusLabel[w.status]}
              </span>
            </div>
            <h2 style={styles.cardTitle}>{w.title}</h2>
            <p style={styles.cardDesc}>{w.desc}</p>
            {w.status === "active" ? (
              <Link to={`/worlds/${w.slug}`} style={styles.cardLink}>
                Enter World →
              </Link>
            ) : (
              <span style={styles.cardLinkDisabled}>Enter World →</span>
            )}
          </div>
        ))}
      </section>

      <footer style={styles.footer}>
        <span style={styles.footerText}>© 2025 Astryx Forge · All rights reserved</span>
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
