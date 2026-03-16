import React, { useState } from "react";
import { getAuth, deleteUser, signOut, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { isAdmin } from "../utils/adminAuth";
import { seedCrewData, unclaimAllByUser } from "../utils/crewFirestore";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
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
            <button
              style={{
                ...buttonStyle,
                backgroundColor: "#9933cc",
                color: "#fff",
                marginTop: 0,
              }}
              onClick={async () => {
                try {
                  const biography = `Fleet Admiral Ragh'Kor is a Klingon officer serving in Starfleet and currently commands the Delta Quadrant Exploration Task Force from Starbase Machida.\n\nBorn on Qo'noS in 2344, Ragh'Kor was raised in a traditional Klingon warrior household. Unlike many of his peers, he developed an early fascination with interstellar cultures and strategic command rather than purely battlefield combat.\n\nHe entered Starfleet Academy in 2362, becoming one of the rare Klingons accepted into Starfleet service. During his time at the Academy he specialized in tactical operations, interstellar strategy, and first contact protocols.\n\nAfter graduating in 2366 with the rank of Ensign, Ragh'Kor served as a tactical officer aboard the USS Valiant. His career quickly accelerated following his survival of the Borg engagement at Wolf 359 in 2367, where his tactical coordination helped maintain order during the chaos of the battle.\n\nBy 2370 he had been promoted to Lieutenant Commander and served as Chief Tactical Officer on frontier patrol vessels along the Cardassian border. His reputation for decisive leadership and unconventional strategy earned him entry into Starfleet's Advanced Command Training Program.\n\nDuring the Dominion War (2373–2375), Ragh'Kor commanded a tactical squadron in several key engagements. His leadership during these conflicts earned him the Starfleet Medal of Merit and solidified his reputation as a capable battlefield strategist respected by both Starfleet officers and Klingon commanders.\n\nFollowing the war he was promoted to Captain and later Rear Admiral, eventually being placed in command of Starfleet's Delta Quadrant Exploration Initiative operating from Starbase Machida.\n\nIn 2376 Ragh'Kor was promoted to Fleet Admiral and now oversees multiple exploratory starships charting unknown regions of the Delta Quadrant.\n\nRagh'Kor is known for blending Klingon warrior philosophy with Starfleet ideals, believing that exploration and discovery require both courage and diplomacy.`;

                  const serviceHistory = [
                    { year: 2344, event: "Born on Qo'noS" },
                    { year: 2362, event: "Entered Starfleet Academy" },
                    { year: 2366, event: "Graduated Starfleet Academy and commissioned Ensign; assigned as Tactical Officer aboard the USS Valiant" },
                    { year: 2367, event: "Participated in the Battle of Wolf 359; tactical coordination during Borg engagement commended by Starfleet Command" },
                    { year: 2370, event: "Promoted to Lieutenant Commander; assigned to Cardassian border patrol as Chief Tactical Officer" },
                    { year: 2372, event: "Completed Starfleet Advanced Command Training Program" },
                    { year: 2373, event: "Dominion War service begins; commands tactical squadron across multiple fleet engagements" },
                    { year: 2375, event: "Promoted to Captain following Dominion War operations; awarded the Starfleet Medal of Merit" },
                    { year: 2376, event: "Assigned to command Delta Quadrant Exploration Initiative from Starbase Machida; promoted to Fleet Admiral and placed in command of the Delta Quadrant Exploration Task Force" },
                  ];

                  const awards = [
                    { awardId: "starfleet_medal_of_merit", citation: "For distinguished service and exceptional tactical leadership during the Dominion War (2373–2375), directly contributing to several key Federation victories. Fleet Admiral Ragh'Kor's command under sustained combat conditions reflects the highest traditions of Starfleet service.", awardedBy: "Starfleet Command", stardate: "52901.3" },
                    { awardId: "dominion_war_campaign_medal", citation: "For active service in combat operations against the Dominion during the war of 2373–2375. This officer served with distinction throughout the conflict, demonstrating courage and dedication under sustained hostile conditions.", awardedBy: "Starfleet Command", stardate: "52917.0" },
                    { awardId: "klingon_campaign_medal", citation: "For distinguished service in joint Starfleet–Klingon Defense Force operations, strengthening the alliance through cooperative tactical engagements and mutual respect between commands.", awardedBy: "Starfleet Command", stardate: "50300.0" },
                    { awardId: "cardassian_border_campaign_medal", citation: "For meritorious service in patrol and security operations along the Cardassian border (2370–2372), maintaining Federation security during a period of heightened tension.", awardedBy: "Starfleet Command", stardate: "47900.0" },
                    { awardId: "command_citation_of_merit", citation: "For exceptional command leadership during critical fleet operations. This officer demonstrated strategic excellence and steadfast dedication to the principles of Starfleet Command.", awardedBy: "Office of the Commander, Starfleet", stardate: "53000.0" },
                    { awardId: "diplomacy_medal", citation: "For exceptional diplomatic achievement in negotiations with Delta Quadrant civilizations, advancing Federation interests through skillful engagement and respect for alien cultures.", awardedBy: "Starfleet Command", stardate: "53412.7" },
                    { awardId: "exploration_achievement_medal", citation: "For significant achievement in the command and direction of deep-space exploration operations in the Delta Quadrant, expanding Federation knowledge of previously uncharted regions.", awardedBy: "Starfleet Command", stardate: "53500.0" },
                    { awardId: "fleet_command_ribbon", citation: "For distinguished command of the Delta Quadrant Exploration Task Force, demonstrating strategic vision and leadership in one of Starfleet's most demanding long-range assignments.", awardedBy: "Starfleet Command", stardate: "53412.0" },
                    { awardId: "exploration_ribbon", citation: "For personal participation in deep-space exploration missions beyond established Federation territory, contributing directly to the expansion of charted space.", awardedBy: "Starfleet Command", stardate: "53600.0" },
                    { awardId: "first_contact_ribbon", citation: "For direct involvement in first contact operations with previously unknown Delta Quadrant civilizations, demonstrating the professionalism and cultural sensitivity required to establish lasting interstellar relationships.", awardedBy: "Starfleet Command", stardate: "53620.0" },
                    { awardId: "combat_service_ribbon", citation: "For active combat service in defense of the Federation during the Dominion War and prior border operations.", awardedBy: "Starfleet Command", stardate: "52950.0" },
                    { awardId: "scientific_survey_ribbon", citation: "For contributions to scientific survey operations in the Delta Quadrant under the direction of the Exploration Task Force.", awardedBy: "Starfleet Science Command", stardate: "53700.0" },
                    { awardId: "starbase_service_ribbon", citation: "For distinguished service as commanding officer of Starbase Machida, overseeing operations critical to the Delta Quadrant Exploration Initiative.", awardedBy: "Starfleet Command", stardate: "53412.0" },
                    { awardId: "long_service_ribbon", citation: "For ten years of continuous distinguished service in Starfleet, spanning tactical assignments, combat operations, and command positions.", awardedBy: "Starfleet Command", stardate: "53000.0" },
                    { awardId: "alliance_service_ribbon", citation: "For service that materially strengthened the Federation–Klingon Alliance through joint operations, personal example, and the embodiment of both cultures' highest values.", awardedBy: "Office of the Commander, Starfleet", stardate: "50400.0" },
                  ];

                  await updateDoc(doc(db, "crew", "raghkor"), { biography, serviceHistory, awards });
                  alert("Ragh'Kor personnel record updated successfully!");
                } catch (err: any) {
                  alert("Update failed: " + err.message);
                }
              }}
            >
              Update Ragh'Kor Record
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
