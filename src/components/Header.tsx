import { Link } from "react-router-dom";

const Logo = () => (
  <svg width="180" height="68" viewBox="0 0 320 120" xmlns="http://www.w3.org/2000/svg" aria-label="Astryx Forge">
    <defs>
      <linearGradient id="forgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F5B942" />
        <stop offset="100%" stopColor="#FF6A2B" />
      </linearGradient>
    </defs>
    <polygon
      points="60,20 68,42 92,42 72,56 80,80 60,65 40,80 48,56 28,42 52,42"
      fill="url(#forgeGradient)"
    />
    <path
      d="M60 85 C45 75, 45 55, 60 45 C75 55, 75 75, 60 85 Z"
      fill="#FF6A2B"
      opacity="0.7"
    />
    <text x="110" y="55" fontSize="28" fill="#F5B942" fontFamily="Orbitron, sans-serif">
      ASTRYX
    </text>
    <text x="110" y="85" fontSize="22" fill="#FFFFFF" fontFamily="Orbitron, sans-serif">
      FORGE
    </text>
  </svg>
);

export default function Header() {
  return (
    <header style={styles.header}>
      <Link to="/" style={styles.logoLink}>
        <Logo />
      </Link>
      <nav style={styles.nav}>
        <Link to="/" style={styles.link}>Home</Link>
        <Link to="/worlds" style={styles.link}>Worlds</Link>
        <Link to="/auth" style={styles.link}>Login</Link>
        <Link to="/auth" style={styles.registerBtn}>Register</Link>
      </nav>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.75rem 2.5rem",
    backgroundColor: "#07152B",
    borderBottom: "1px solid #F5B94230",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  logoLink: {
    display: "flex",
    alignItems: "center",
    textDecoration: "none",
  },
  nav: {
    display: "flex",
    alignItems: "center",
    gap: "2rem",
  },
  link: {
    color: "#C8D8F0",
    textDecoration: "none",
    fontFamily: "Orbitron, sans-serif",
    fontSize: "0.8rem",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    transition: "color 0.2s",
  },
  registerBtn: {
    color: "#0B1E3A",
    backgroundColor: "#F5B942",
    textDecoration: "none",
    fontFamily: "Orbitron, sans-serif",
    fontSize: "0.8rem",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    padding: "0.45rem 1.1rem",
    borderRadius: "4px",
    fontWeight: "bold",
  },
};
