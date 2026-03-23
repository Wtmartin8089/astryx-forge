import React, { useState } from "react";
import { getAuth, deleteUser, signOut, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { isAdmin } from "../utils/adminAuth";
import { unclaimAllByUser, unclaimCharacter } from "../utils/crewFirestore";
import { useActiveCharacter } from "../context/ActiveCharacterContext";
import "../assets/lcars.css";

const AccountSettings = () => {
  const auth = getAuth();
  const user = auth.currentUser;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { userCharacters, activeCharId, setActiveCharId } = useActiveCharacter();
  const [unclaimConfirmId, setUnclaimConfirmId] = useState<string | null>(null);

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

        {/* Manage Characters panel — shown to all users who have characters */}
        {userCharacters.length > 0 && (
          <div style={{
            backgroundColor: "rgba(102, 153, 204, 0.08)",
            border: "2px solid #6699cc",
            borderRadius: "8px",
            padding: "1.25rem",
            marginBottom: "1.5rem",
          }}>
            <p style={{ color: "#6699cc", margin: "0 0 1rem 0", fontWeight: "bold", letterSpacing: "1px", textTransform: "uppercase", fontSize: "0.85rem" }}>
              Manage Characters
            </p>
            {userCharacters.map((char) => {
              const isActive = char.id === activeCharId;
              const isUnclaimTarget = unclaimConfirmId === char.id;
              return (
                <div
                  key={char.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.6rem 0.75rem",
                    marginBottom: "0.5rem",
                    backgroundColor: isActive ? "rgba(255, 153, 0, 0.1)" : "rgba(255,255,255,0.03)",
                    border: isActive ? "1px solid #ff990060" : "1px solid #ffffff15",
                    borderRadius: "6px",
                    flexWrap: "wrap",
                  }}
                >
                  {/* Character info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ color: isActive ? "#ff9900" : "#ccc", fontWeight: "bold", fontSize: "0.9rem" }}>
                      {char.name}
                    </span>
                    {char.rank && (
                      <span style={{ color: "#888", fontSize: "0.75rem", marginLeft: "0.5rem" }}>
                        {char.rank}
                      </span>
                    )}
                    {char.role && (
                      <span style={{ color: "#666", fontSize: "0.72rem", marginLeft: "0.4rem" }}>
                        · {char.role}
                      </span>
                    )}
                    {isActive && (
                      <span style={{ color: "#ff9900", fontSize: "0.65rem", marginLeft: "0.6rem", letterSpacing: "1px", textTransform: "uppercase" }}>
                        ★ Active
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                    {!isActive && (
                      <button
                        onClick={() => setActiveCharId(char.id)}
                        style={{
                          backgroundColor: "#ff990020",
                          border: "1px solid #ff9900",
                          borderRadius: "12px",
                          color: "#ff9900",
                          cursor: "pointer",
                          fontFamily: "'Orbitron', sans-serif",
                          fontSize: "0.6rem",
                          fontWeight: "bold",
                          letterSpacing: "1px",
                          padding: "0.25rem 0.7rem",
                          textTransform: "uppercase",
                        }}
                      >
                        Set Active
                      </button>
                    )}
                    {!isUnclaimTarget ? (
                      <button
                        onClick={() => setUnclaimConfirmId(char.id)}
                        style={{
                          backgroundColor: "transparent",
                          border: "1px solid #cc666660",
                          borderRadius: "12px",
                          color: "#cc6666",
                          cursor: "pointer",
                          fontFamily: "'Orbitron', sans-serif",
                          fontSize: "0.6rem",
                          letterSpacing: "1px",
                          padding: "0.25rem 0.7rem",
                          textTransform: "uppercase",
                        }}
                      >
                        Unclaim
                      </button>
                    ) : (
                      <>
                        <span style={{ color: "#cc6666", fontSize: "0.65rem", alignSelf: "center" }}>Confirm?</span>
                        <button
                          onClick={async () => {
                            try {
                              await unclaimCharacter(char.id);
                            } catch (err: any) {
                              alert("Failed: " + err.message);
                            }
                            setUnclaimConfirmId(null);
                          }}
                          style={{
                            backgroundColor: "#cc6666",
                            border: "none",
                            borderRadius: "12px",
                            color: "#fff",
                            cursor: "pointer",
                            fontFamily: "'Orbitron', sans-serif",
                            fontSize: "0.6rem",
                            fontWeight: "bold",
                            letterSpacing: "1px",
                            padding: "0.25rem 0.7rem",
                            textTransform: "uppercase",
                          }}
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setUnclaimConfirmId(null)}
                          style={{
                            backgroundColor: "transparent",
                            border: "1px solid #555",
                            borderRadius: "12px",
                            color: "#888",
                            cursor: "pointer",
                            fontFamily: "'Orbitron', sans-serif",
                            fontSize: "0.6rem",
                            letterSpacing: "1px",
                            padding: "0.25rem 0.7rem",
                            textTransform: "uppercase",
                          }}
                        >
                          No
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Admin controls */}
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
