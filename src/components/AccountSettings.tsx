import React, { useState } from "react";
import { getAuth, deleteUser, signOut, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { isAdmin } from "../utils/adminAuth";
import { seedCrewData, unclaimAllByUser } from "../utils/crewFirestore";
import defaultCrewJson from "../data/crewData.json";
import type { CrewMember } from "../types/fleet";
import "../assets/lcars.css";

const AccountSettings = () => {
  const auth = getAuth();
  const user = auth.currentUser;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogout = async () => {
    try {
      await signOut(auth);
      alert("Logged out successfully!");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || !user.email) {
      setError("No user is currently logged in.");
      return;
    }

    try {
      // Re-authenticate user before deleting (Firebase requirement)
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);

      // Delete the user
      await deleteUser(user);
      alert("Account deleted successfully. Goodbye, Commander.");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    padding: "2rem",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  };

  const panelStyle: React.CSSProperties = {
    backgroundColor: "#1a1a1a",
    border: "3px solid #ff9900",
    borderRadius: "15px",
    padding: "2rem",
    maxWidth: "600px",
    width: "100%",
    boxShadow: "0 8px 32px rgba(255, 153, 0, 0.3)",
  };

  const titleStyle: React.CSSProperties = {
    color: "#ff9900",
    marginBottom: "2rem",
    fontSize: "1.8rem",
    textTransform: "uppercase",
    letterSpacing: "2px",
  };

  const infoStyle: React.CSSProperties = {
    color: "#6699cc",
    marginBottom: "1.5rem",
    fontSize: "1rem",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "0.75rem 1.5rem",
    border: "none",
    borderRadius: "5px",
    fontSize: "1rem",
    fontWeight: "bold",
    cursor: "pointer",
    textTransform: "uppercase",
    letterSpacing: "1px",
    transition: "all 0.3s",
    marginRight: "1rem",
    marginTop: "1rem",
  };

  const logoutButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: "#6699cc",
    color: "#000",
  };

  const deleteButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: "#cc6666",
    color: "#fff",
  };

  const cancelButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: "transparent",
    border: "2px solid #9933cc",
    color: "#9933cc",
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
    marginTop: "1rem",
    marginBottom: "1rem",
  };

  const warningStyle: React.CSSProperties = {
    backgroundColor: "rgba(204, 102, 102, 0.1)",
    border: "2px solid #cc6666",
    borderRadius: "5px",
    padding: "1rem",
    marginTop: "1rem",
    color: "#cc6666",
  };

  const errorStyle: React.CSSProperties = {
    color: "#cc6666",
    backgroundColor: "rgba(204, 102, 102, 0.1)",
    padding: "0.75rem",
    borderRadius: "5px",
    marginTop: "1rem",
    border: "1px solid #cc6666",
  };

  return (
    <div style={containerStyle}>
      <div style={panelStyle}>
        <h1 style={titleStyle}>Account Settings</h1>

        <div style={infoStyle}>
          <strong>Email:</strong> {user?.email || "Not available"}
        </div>

        <div style={infoStyle}>
          <strong>User ID:</strong> {user?.uid || "Not available"}
        </div>

        {user && isAdmin(user.uid) && (
          <div style={{
            backgroundColor: "rgba(51, 204, 153, 0.1)",
            border: "2px solid #33cc99",
            borderRadius: "5px",
            padding: "1rem",
            marginBottom: "1.5rem",
          }}>
            <p style={{ color: "#33cc99", margin: "0 0 0.75rem 0", fontWeight: "bold" }}>ADMIN CONTROLS</p>
            <button
              style={{
                ...buttonStyle,
                backgroundColor: "#33cc99",
                color: "#000",
                marginTop: 0,
              }}
              onClick={async () => {
                try {
                  const crewWithDefaults: Record<string, CrewMember> = {};
                  for (const [slug, member] of Object.entries(defaultCrewJson as Record<string, any>)) {
                    crewWithDefaults[slug] = {
                      ...member,
                      ownerId: null,
                      ownerEmail: null,
                      status: "active" as const,
                    };
                  }
                  await seedCrewData(crewWithDefaults);
                  alert("Crew data seeded to Firestore successfully!");
                } catch (err: any) {
                  alert("Seed failed: " + err.message);
                }
              }}
            >
              Seed Crew to Firestore
            </button>
            <button
              style={{
                ...buttonStyle,
                backgroundColor: "#ff9933",
                color: "#000",
                marginTop: 0,
              }}
              onClick={async () => {
                if (!user) return;
                try {
                  const count = await unclaimAllByUser(user.uid);
                  alert(`Cleared ownership from ${count} crew member(s).`);
                } catch (err: any) {
                  alert("Failed: " + err.message);
                }
              }}
            >
              Unclaim All My Crew
            </button>
          </div>
        )}

        <div style={{ marginTop: "2rem" }}>
          <button
            style={logoutButtonStyle}
            onClick={handleLogout}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#9933cc";
              e.currentTarget.style.transform = "scale(1.02)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#6699cc";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            Logout
          </button>

          {!showDeleteConfirm ? (
            <button
              style={deleteButtonStyle}
              onClick={() => setShowDeleteConfirm(true)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#ff0000";
                e.currentTarget.style.transform = "scale(1.02)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#cc6666";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              Delete Account
            </button>
          ) : (
            <div style={warningStyle}>
              <h3 style={{ marginTop: 0 }}>⚠️ Warning: This action cannot be undone!</h3>
              <p>Please enter your password to confirm account deletion:</p>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#ff9900")}
                onBlur={(e) => (e.target.style.borderColor = "#6699cc")}
              />
              <button
                style={deleteButtonStyle}
                onClick={handleDeleteAccount}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#ff0000";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#cc6666";
                }}
              >
                Confirm Delete
              </button>
              <button
                style={cancelButtonStyle}
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setPassword("");
                  setError("");
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#9933cc";
                  e.currentTarget.style.color = "#fff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "#9933cc";
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {error && <div style={errorStyle}>{error}</div>}
      </div>
    </div>
  );
};

export default AccountSettings;
