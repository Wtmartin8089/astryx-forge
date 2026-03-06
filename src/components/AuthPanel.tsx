import React, { useState } from "react";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { app } from "../firebase/firebaseConfig";
import "../assets/lcars.css";

const auth = getAuth(app);

const AuthPanel = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResetEmailSent(false);

    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email, password);
        alert("Signup successful! You're ready for active duty.");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        alert("Login successful! Welcome aboard, Commander.");
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setResetEmailSent(true);
      setError("");
      alert("Password reset email sent! Check your inbox.");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
  };

  const panelStyle: React.CSSProperties = {
    backgroundColor: "#1a1a1a",
    border: "3px solid #ff9900",
    borderRadius: "15px",
    padding: "3rem",
    maxWidth: "500px",
    width: "100%",
    boxShadow: "0 8px 32px rgba(255, 153, 0, 0.3)",
  };

  const titleStyle: React.CSSProperties = {
    color: "#ff9900",
    textAlign: "center",
    marginBottom: "2rem",
    fontSize: "2rem",
    textTransform: "uppercase",
    letterSpacing: "2px",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    color: "#6699cc",
    marginBottom: "0.5rem",
    fontWeight: "bold",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.75rem",
    backgroundColor: "#000",
    border: "2px solid #6699cc",
    borderRadius: "5px",
    color: "#ffffff",
    fontSize: "1rem",
    outline: "none",
    transition: "border-color 0.3s",
  };

  const inputGroupStyle: React.CSSProperties = {
    marginBottom: "1.5rem",
  };

  const buttonStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.75rem",
    backgroundColor: "#ff9900",
    border: "none",
    borderRadius: "5px",
    color: "#000",
    fontSize: "1rem",
    fontWeight: "bold",
    cursor: "pointer",
    textTransform: "uppercase",
    letterSpacing: "1px",
    transition: "all 0.3s",
    marginTop: "1rem",
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: "transparent",
    border: "2px solid #9933cc",
    color: "#9933cc",
  };

  const errorStyle: React.CSSProperties = {
    color: "#cc6666",
    backgroundColor: "rgba(204, 102, 102, 0.1)",
    padding: "0.75rem",
    borderRadius: "5px",
    marginTop: "1rem",
    border: "1px solid #cc6666",
  };

  const successStyle: React.CSSProperties = {
    color: "#99cc99",
    backgroundColor: "rgba(153, 204, 153, 0.1)",
    padding: "0.75rem",
    borderRadius: "5px",
    marginTop: "1rem",
    border: "1px solid #99cc99",
  };

  const passwordContainerStyle: React.CSSProperties = {
    position: "relative",
  };

  const togglePasswordStyle: React.CSSProperties = {
    position: "absolute",
    right: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    color: "#6699cc",
    cursor: "pointer",
    fontSize: "1.2rem",
    padding: "0",
    width: "auto",
    margin: "0",
  };

  const forgotPasswordStyle: React.CSSProperties = {
    color: "#9933cc",
    textAlign: "right",
    fontSize: "0.875rem",
    marginTop: "0.5rem",
    cursor: "pointer",
    textDecoration: "underline",
  };

  return (
    <div style={containerStyle}>
      <div style={panelStyle}>
        <h1 style={titleStyle}>
          {isSignup ? "Starfleet Registration" : "Starfleet Access"}
        </h1>
        <form onSubmit={handleSubmit}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
              placeholder="officer@starfleet.com"
              onFocus={(e) => (e.target.style.borderColor = "#ff9900")}
              onBlur={(e) => (e.target.style.borderColor = "#6699cc")}
            />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Password:</label>
            <div style={passwordContainerStyle}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={inputStyle}
                placeholder="Enter security code"
                onFocus={(e) => (e.target.style.borderColor = "#ff9900")}
                onBlur={(e) => (e.target.style.borderColor = "#6699cc")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={togglePasswordStyle}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#ff9900")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#6699cc")}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
            {!isSignup && (
              <div
                style={forgotPasswordStyle}
                onClick={handleForgotPassword}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#ff9900")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#9933cc")}
              >
                Forgot Password?
              </div>
            )}
          </div>
          {error && <div style={errorStyle}>{error}</div>}
          {resetEmailSent && <div style={successStyle}>Password reset email sent! Check your inbox.</div>}
          <button
            type="submit"
            style={buttonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#9933cc";
              e.currentTarget.style.transform = "scale(1.02)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#ff9900";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            {isSignup ? "Sign Up" : "Login"}
          </button>
        </form>
        <button
          onClick={() => setIsSignup(!isSignup)}
          style={secondaryButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#9933cc";
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "#9933cc";
          }}
        >
          {isSignup ? "Already have clearance? Login" : "Need clearance? Sign Up"}
        </button>
      </div>
    </div>
  );
};

export default AuthPanel;

