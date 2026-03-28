import React, { useState, useEffect } from "react";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { app } from "../firebase/firebaseConfig";

const auth = getAuth(app);

const AuthPanel = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger fade-in on mount and on mode switch
    setMounted(false);
    const t = setTimeout(() => setMounted(true), 20);
    return () => clearTimeout(t);
  }, [isSignup]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResetSent(false);

    if (isSignup && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      // Strip Firebase's "Firebase: " prefix for cleaner messaging
      setError(err.message.replace(/^Firebase:\s*/i, "").replace(/\(auth\/.*?\)\.?/, "").trim());
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Enter your email above first.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      setError("");
    } catch (err: any) {
      setError(err.message.replace(/^Firebase:\s*/i, "").replace(/\(auth\/.*?\)\.?/, "").trim());
    }
  };

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes glowPulse {
          0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1);    }
          50%       { opacity: 1;   transform: translate(-50%, -50%) scale(1.08); }
        }
        @keyframes scanline {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .auth-input {
          width: 100%;
          padding: 0.7rem 0.9rem;
          background: rgba(10, 28, 52, 0.8);
          border: 1px solid #1E3A5F;
          border-radius: 4px;
          color: #C8D8F0;
          font-size: 0.92rem;
          font-family: 'Segoe UI', sans-serif;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .auth-input::placeholder { color: #2A4A6A; }
        .auth-input:focus {
          border-color: #F5B94260;
          box-shadow: 0 0 0 3px #F5B94210;
        }
        .auth-input:focus::placeholder { color: #3A5A7A; }
        .submit-btn {
          width: 100%;
          padding: 0.75rem;
          background: linear-gradient(135deg, #F5B942, #FF6A2B);
          border: none;
          border-radius: 4px;
          color: #07152B;
          font-family: 'Orbitron', sans-serif;
          font-weight: 700;
          font-size: 0.78rem;
          letter-spacing: 2px;
          text-transform: uppercase;
          cursor: pointer;
          transition: opacity 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
          margin-top: 0.25rem;
        }
        .submit-btn:hover {
          opacity: 0.88;
          transform: translateY(-1px);
          box-shadow: 0 4px 18px #F5B94238;
        }
        .toggle-link {
          background: none;
          border: none;
          color: #4A7AAA;
          font-family: 'Orbitron', sans-serif;
          font-size: 0.68rem;
          letter-spacing: 1.5px;
          cursor: pointer;
          text-transform: uppercase;
          padding: 0;
          transition: color 0.2s ease;
        }
        .toggle-link:hover { color: #C8D8F0; }
        .forgot-link {
          background: none;
          border: none;
          color: #3A5A80;
          font-size: 0.75rem;
          cursor: pointer;
          padding: 0;
          font-family: 'Segoe UI', sans-serif;
          transition: color 0.2s ease;
          text-decoration: none;
        }
        .forgot-link:hover { color: #8AAAD0; }
        .eye-btn {
          position: absolute;
          right: 0.7rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #2A4A6A;
          cursor: pointer;
          font-size: 1rem;
          padding: 0;
          line-height: 1;
          transition: color 0.2s ease;
        }
        .eye-btn:hover { color: #8AAAD0; }
      `}</style>

      {/* Ambient glow */}
      <div style={styles.glow} />

      {/* Subtle scanline sweep */}
      <div style={styles.scanline} />

      {/* Panel */}
      <div
        style={{
          ...styles.panel,
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.35s ease, transform 0.35s ease",
        }}
      >
        {/* Logo mark */}
        <div style={styles.logoRow}>
          <svg width="28" height="28" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <linearGradient id="authGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F5B942" />
                <stop offset="100%" stopColor="#FF6A2B" />
              </linearGradient>
            </defs>
            <polygon
              points="40,5 48,28 72,28 53,43 61,66 40,51 19,66 27,43 8,28 32,28"
              fill="url(#authGrad)"
            />
          </svg>
          <span style={styles.logoText}>ASTRYX FORGE</span>
        </div>

        {/* System status line */}
        <p style={styles.statusLine}>
          Systems active. Identity required.
        </p>

        {/* Form title */}
        <h1 style={styles.formTitle}>
          {isSignup ? "Establish Identity" : "Access System"}
        </h1>

        {/* Divider */}
        <div style={styles.divider} />

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Email */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Email</label>
            <input
              className="auth-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="identity@astryxforge.com"
              required
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Password</label>
            <div style={{ position: "relative" }}>
              <input
                className="auth-input"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Access code"
                required
                autoComplete={isSignup ? "new-password" : "current-password"}
                style={{ paddingRight: "2.4rem" }}
              />
              <button
                type="button"
                className="eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "○" : "●"}
              </button>
            </div>
            {!isSignup && (
              <div style={{ textAlign: "right", marginTop: "0.4rem" }}>
                <button type="button" className="forgot-link" onClick={handleForgotPassword}>
                  Forgot access code?
                </button>
              </div>
            )}
          </div>

          {/* Confirm password (signup only) */}
          {isSignup && (
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Confirm Password</label>
              <input
                className="auth-input"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm access code"
                required
                autoComplete="new-password"
              />
            </div>
          )}

          {/* Error / success */}
          {error && (
            <div style={styles.errorBox}>{error}</div>
          )}
          {resetSent && (
            <div style={styles.successBox}>Reset link transmitted. Check your inbox.</div>
          )}

          <button type="submit" className="submit-btn">
            {isSignup ? "Establish Identity" : "Access System"}
          </button>
        </form>

        {/* Mode toggle */}
        <div style={styles.toggleRow}>
          <button
            type="button"
            className="toggle-link"
            onClick={() => {
              setIsSignup(!isSignup);
              setError("");
              setResetSent(false);
              setConfirmPassword("");
            }}
          >
            {isSignup ? "Already have access? →" : "No identity yet? →"}
          </button>
        </div>

        {/* Tagline */}
        <p style={styles.tagline}>One identity. Multiple worlds.</p>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#07152B",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
    position: "relative",
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "700px",
    height: "400px",
    background: "radial-gradient(ellipse, #F5B94214 0%, transparent 65%)",
    pointerEvents: "none",
    animationName: "glowPulse",
    animationDuration: "6s",
    animationTimingFunction: "ease-in-out",
    animationIterationCount: "infinite",
  },
  scanline: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "120px",
    background: "linear-gradient(to bottom, transparent, rgba(245,185,66,0.015) 50%, transparent)",
    pointerEvents: "none",
    animationName: "scanline",
    animationDuration: "10s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
    animationDelay: "2s",
  },
  panel: {
    position: "relative",
    backgroundColor: "#080F1E",
    border: "1px solid #1A3456",
    borderRadius: "8px",
    padding: "2.5rem 2.25rem",
    width: "100%",
    maxWidth: "420px",
    boxShadow: "0 0 60px rgba(7,21,43,0.9), 0 0 0 1px #0D2240",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    justifyContent: "center",
    marginBottom: "1.75rem",
  },
  logoText: {
    fontFamily: "Orbitron, sans-serif",
    fontSize: "0.75rem",
    letterSpacing: "3px",
    color: "#F5B942",
    textTransform: "uppercase",
  },
  statusLine: {
    fontFamily: "Orbitron, sans-serif",
    fontSize: "0.6rem",
    letterSpacing: "2.5px",
    color: "#2A4A6A",
    textTransform: "uppercase",
    textAlign: "center",
    margin: "0 0 0.75rem 0",
  },
  formTitle: {
    fontFamily: "Orbitron, sans-serif",
    fontSize: "1.15rem",
    fontWeight: 700,
    color: "#C8D8F0",
    letterSpacing: "3px",
    textTransform: "uppercase",
    textAlign: "center",
    margin: "0 0 1.25rem 0",
  },
  divider: {
    height: "1px",
    background: "linear-gradient(90deg, transparent, #1A3456 30%, #F5B94220 50%, #1A3456 70%, transparent)",
    marginBottom: "1.5rem",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "0",
  },
  fieldGroup: {
    marginBottom: "1.1rem",
  },
  label: {
    display: "block",
    fontFamily: "Orbitron, sans-serif",
    fontSize: "0.62rem",
    letterSpacing: "2px",
    color: "#3A5A80",
    textTransform: "uppercase",
    marginBottom: "0.45rem",
  },
  errorBox: {
    backgroundColor: "rgba(200, 60, 60, 0.08)",
    border: "1px solid #5A2020",
    borderRadius: "4px",
    color: "#CC7070",
    fontSize: "0.82rem",
    padding: "0.6rem 0.8rem",
    marginBottom: "0.75rem",
    lineHeight: 1.4,
  },
  successBox: {
    backgroundColor: "rgba(60, 160, 100, 0.08)",
    border: "1px solid #1A4A30",
    borderRadius: "4px",
    color: "#70AA88",
    fontSize: "0.82rem",
    padding: "0.6rem 0.8rem",
    marginBottom: "0.75rem",
    lineHeight: 1.4,
  },
  toggleRow: {
    textAlign: "center",
    marginTop: "1.25rem",
    paddingTop: "1.25rem",
    borderTop: "1px solid #0D2240",
  },
  tagline: {
    fontFamily: "Orbitron, sans-serif",
    fontSize: "0.58rem",
    letterSpacing: "2.5px",
    color: "#1A3456",
    textTransform: "uppercase",
    textAlign: "center",
    margin: "1rem 0 0 0",
  },
};

export default AuthPanel;
