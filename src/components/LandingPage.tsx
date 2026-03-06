import { Link } from "react-router-dom";
import Header from "./Header";

const features = [
  {
    icon: "⚙️",
    title: "Campaign Engine",
    desc: "Persistent RPG campaigns that evolve over time.",
  },
  {
    icon: "👤",
    title: "Character & Crew Management",
    desc: "Players create characters and join crews or factions.",
  },
  {
    icon: "🌍",
    title: "World Databases",
    desc: "Track ships, planets, factions, and lore.",
  },
  {
    icon: "📖",
    title: "Narrative Forums",
    desc: "Players continue storytelling between sessions.",
  },
];

export default function LandingPage() {
  return (
    <div style={styles.page}>
      <Header />

      {/* Hero */}
      <section style={styles.hero}>
        <div style={styles.heroGlow} />
        <h1 style={styles.heroTitle}>ASTRYX FORGE</h1>
        <p style={styles.heroSubtitle}>Forge Your Worlds</p>
        <p style={styles.heroDesc}>
          A living campaign engine where Game Masters build persistent RPG universes.
        </p>
        <div style={styles.heroButtons}>
          <Link to="/auth" style={styles.btnPrimary}>Enter the Forge</Link>
          <Link to="/auth" style={styles.btnSecondary}>Register</Link>
        </div>
      </section>

      {/* Features */}
      <section style={styles.features}>
        <h2 style={styles.sectionTitle}>Platform Features</h2>
        <div style={styles.featureGrid}>
          {features.map((f) => (
            <div key={f.title} style={styles.featureCard}>
              <span style={styles.featureIcon}>{f.icon}</span>
              <h3 style={styles.featureCardTitle}>{f.title}</h3>
              <p style={styles.featureCardDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={styles.cta}>
        <h2 style={styles.ctaTitle}>Ready to build your universe?</h2>
        <Link to="/worlds" style={styles.btnPrimary}>Explore Worlds</Link>
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

  /* Hero */
  hero: {
    position: "relative",
    textAlign: "center",
    padding: "6rem 2rem 5rem",
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    top: "20%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "600px",
    height: "300px",
    background: "radial-gradient(ellipse, #F5B94218 0%, transparent 70%)",
    pointerEvents: "none",
  },
  heroTitle: {
    fontFamily: "Orbitron, sans-serif",
    fontSize: "clamp(2.2rem, 6vw, 4.5rem)",
    fontWeight: 900,
    background: "linear-gradient(135deg, #F5B942, #FF6A2B)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    marginBottom: "0.5rem",
    letterSpacing: "4px",
  },
  heroSubtitle: {
    fontFamily: "Orbitron, sans-serif",
    fontSize: "clamp(1rem, 2.5vw, 1.5rem)",
    color: "#C8D8F0",
    marginBottom: "1.5rem",
    letterSpacing: "3px",
  },
  heroDesc: {
    fontSize: "1.1rem",
    color: "#8AAAD0",
    maxWidth: "560px",
    margin: "0 auto 2.5rem",
    lineHeight: 1.7,
  },
  heroButtons: {
    display: "flex",
    gap: "1.25rem",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  btnPrimary: {
    background: "linear-gradient(135deg, #F5B942, #FF6A2B)",
    color: "#0B1E3A",
    textDecoration: "none",
    fontFamily: "Orbitron, sans-serif",
    fontWeight: 700,
    fontSize: "0.85rem",
    letterSpacing: "1.5px",
    padding: "0.8rem 2rem",
    borderRadius: "4px",
    textTransform: "uppercase",
  },
  btnSecondary: {
    border: "1px solid #F5B942",
    color: "#F5B942",
    textDecoration: "none",
    fontFamily: "Orbitron, sans-serif",
    fontWeight: 700,
    fontSize: "0.85rem",
    letterSpacing: "1.5px",
    padding: "0.8rem 2rem",
    borderRadius: "4px",
    textTransform: "uppercase",
  },

  /* Features */
  features: {
    padding: "4rem 2rem",
    maxWidth: "1100px",
    margin: "0 auto",
  },
  sectionTitle: {
    fontFamily: "Orbitron, sans-serif",
    fontSize: "1.1rem",
    letterSpacing: "3px",
    textTransform: "uppercase",
    color: "#F5B942",
    textAlign: "center",
    marginBottom: "2.5rem",
  },
  featureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "1.5rem",
  },
  featureCard: {
    backgroundColor: "#0D2240",
    border: "1px solid #1E3A5F",
    borderRadius: "8px",
    padding: "1.75rem 1.5rem",
    transition: "border-color 0.2s",
  },
  featureIcon: {
    fontSize: "1.8rem",
    display: "block",
    marginBottom: "0.75rem",
  },
  featureCardTitle: {
    fontFamily: "Orbitron, sans-serif",
    fontSize: "0.85rem",
    color: "#F5B942",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    marginBottom: "0.6rem",
  },
  featureCardDesc: {
    color: "#8AAAD0",
    fontSize: "0.9rem",
    lineHeight: 1.6,
    margin: 0,
  },

  /* CTA */
  cta: {
    textAlign: "center",
    padding: "4rem 2rem",
    borderTop: "1px solid #1E3A5F",
  },
  ctaTitle: {
    fontFamily: "Orbitron, sans-serif",
    fontSize: "1.3rem",
    color: "#C8D8F0",
    marginBottom: "1.75rem",
    letterSpacing: "2px",
  },

  /* Footer */
  footer: {
    textAlign: "center",
    padding: "1.5rem",
    borderTop: "1px solid #1E3A5F",
  },
  footerText: {
    color: "#3A5A80",
    fontSize: "0.8rem",
  },
};
