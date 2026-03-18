import { useState, useEffect } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase/firebaseConfig";
import { getAuth } from "firebase/auth";
import { updateCharacter } from "../utils/crewFirestore";
import { subscribeToShips, saveShip } from "../utils/shipsFirestore";
import { isAdmin } from "../utils/adminAuth";
import type { ShipData, ShipWeapon, CrewMember } from "../types/fleet";
import { STARSHIP_CLASSES } from "../data/starshipClasses";
import { LUG_SHIP_CLASSES } from "../data/lugShipClasses";
import FleetTransmissions from "./FleetTransmissions";
import {
  subscribeToShipForumThreads,
  ensureStarterThreads,
  createForumThread,
  type ShipForumThread,
} from "../server/forum/forumService";
import "../assets/lcars.css";

const shipColors: Record<string, { primary: string; accent: string }> = {
  "joshua-tree": { primary: "#004466", accent: "#66ccff" },
  "king": { primary: "#660033", accent: "#ff3366" },
  "defiant-a": { primary: "#333366", accent: "#6699cc" },
  "lancelot": { primary: "#006633", accent: "#33cc99" },
};

const STATUS_OPTIONS = ["Active", "Docked", "Under Repair", "Decommissioned"];

const inputStyle = (accentColor: string): React.CSSProperties => ({
  backgroundColor: "#0a0a0a",
  border: `1px solid ${accentColor}40`,
  borderRadius: "4px",
  color: "#ccc",
  padding: "0.4rem 0.6rem",
  fontFamily: "'Orbitron', sans-serif",
  fontSize: "0.85rem",
  width: "100%",
  boxSizing: "border-box",
});

const numberInputStyle = (accentColor: string): React.CSSProperties => ({
  ...inputStyle(accentColor),
  width: "80px",
});

const ShipPage = () => {
  const { shipSlug } = useParams();
  const [searchParams] = useSearchParams();

  const [shipsData, setShipsData] = useState<Record<string, ShipData>>({});
  const [shipCrew, setShipCrew] = useState<{ slug: string; member: CrewMember }[]>([]);
  const [allFirebaseCrew, setAllFirebaseCrew] = useState<Record<string, CrewMember>>({});
  const [editMode, setEditMode] = useState<boolean>(() => searchParams.get("edit") === "true");

  const [visible, setVisible] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [forumThreads, setForumThreads] = useState<ShipForumThread[]>([]);
  const [postText, setPostText] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [assignSelectValue, setAssignSelectValue] = useState<string>("");
  const [showSaved, setShowSaved] = useState(false);

  // Command Console modal
  const [showCommandConsole, setShowCommandConsole] = useState(false);
  const [cmdDept, setCmdDept] = useState("engineering");
  const [cmdTitle, setCmdTitle] = useState("");
  const [cmdMessage, setCmdMessage] = useState("");
  const [cmdSending, setCmdSending] = useState(false);
  const savedTimer = useState<ReturnType<typeof setTimeout> | null>(null);

  const auth = getAuth();
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    return auth.onAuthStateChanged((u) => setUser(u));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setVisible(false);
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, [shipSlug]);

  // Direct Firestore listener for this ship's crew
  useEffect(() => {
    if (!shipSlug) return;
    const q = query(collection(db, "crew"), where("shipId", "==", shipSlug));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const crew = snapshot.docs.map((d) => ({
        slug: d.id,
        member: d.data() as CrewMember,
      }));
      setShipCrew(crew);
    });
    return () => unsubscribe();
  }, [shipSlug]);

  // All crew listener for the assign-crew dropdown in edit mode
  useEffect(() => {
    const q = query(collection(db, "crew"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const result: Record<string, CrewMember> = {};
      snapshot.docs.forEach((d) => { result[d.id] = d.data() as CrewMember; });
      setAllFirebaseCrew(result);
    });
    return () => unsubscribe();
  }, []);

  // Real-time comms board listener
  useEffect(() => {
    if (!shipSlug) return;
    const q = query(
      collection(db, "shipComms", shipSlug, "messages"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [shipSlug]);

  // Subscribe to ships from Firestore
  useEffect(() => {
    return subscribeToShips(setShipsData);
  }, []);

  // Ship forum threads — subscribe + seed starter threads on first load
  useEffect(() => {
    if (!shipSlug) return;
    const shipName = shipsData[shipSlug]?.name || shipSlug;
    ensureStarterThreads(shipSlug, shipName).catch(console.error);
    return subscribeToShipForumThreads(shipSlug, setForumThreads);
  }, [shipSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim() || !shipSlug) return;
    setLoading(true);
    try {
      let attachmentUrl = "";
      if (attachment) {
        const fileRef = ref(storage, `shipComms/${shipSlug}/${Date.now()}_${attachment.name}`);
        await uploadBytes(fileRef, attachment);
        attachmentUrl = await getDownloadURL(fileRef);
      }
      await addDoc(collection(db, "shipComms", shipSlug, "messages"), {
        content: postText,
        attachmentUrl,
        createdAt: serverTimestamp(),
        author: user ? user.email || user.uid : "Anonymous",
      });
      setPostText("");
      setAttachment(null);
    } catch (error) {
      console.error("Error posting message:", error);
    }
    setLoading(false);
  };

  // Command directive constants
  const COMMAND_RANKS = ["Fleet Admiral", "Admiral", "Captain", "Commander", "First Officer", "Chief Engineer", "Chief Medical Officer"];
  const CMD_DEPARTMENTS = [
    { id: "bridge", label: "Bridge" },
    { id: "engineering", label: "Engineering" },
    { id: "sickbay", label: "Sickbay" },
    { id: "tenForward", label: "Ten Forward" },
    { id: "holodeck", label: "Holodeck" },
  ];

  // Find current user's crew member — check this ship first, then fleet-wide (e.g. Ragh'Kor on starbase)
  const userCrewMember = (
    shipCrew.map(({ member }) => member).find((m) => (m as any).ownerId === user?.uid) ??
    Object.values(allFirebaseCrew).find((m) => (m as any).ownerId === user?.uid)
  ) as any;
  const userRank: string = userCrewMember?.rank || "";
  const userIsAdmin = user ? isAdmin(user.uid) : false;
  const canTransmitDirective = userIsAdmin || COMMAND_RANKS.includes(userRank);

  const handleTransmitDirective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmdTitle.trim() || !cmdMessage.trim() || !shipSlug || !canTransmitDirective) return;
    setCmdSending(true);
    try {
      await createForumThread({
        shipId: shipSlug,
        category: cmdDept as any,
        title: cmdTitle.trim(),
        content: cmdMessage.trim(),
        author: userCrewMember?.name || user?.email || "Command Staff",
        rank: userRank,
        source: "bridge",
        type: "command",
      } as any);
      setCmdTitle("");
      setCmdMessage("");
      setCmdDept("engineering");
      setShowCommandConsole(false);
    } catch (err) {
      console.error("Failed to transmit directive:", err);
    }
    setCmdSending(false);
  };

  const shipData = shipsData[shipSlug!] || null;

  if (!shipData) {
    return (
      <div style={{ color: "#ff9900", textAlign: "center", marginTop: "4rem", fontFamily: "'Orbitron', sans-serif" }}>
        <p style={{ fontSize: "1.5rem" }}>Scanning registry...</p>
        <p style={{ color: "#6699cc", marginTop: "1rem" }}>Vessel not found in database.</p>
        <Link to="/fleet" style={{ color: "#9933cc", marginTop: "2rem", display: "inline-block" }}>
          Return to Fleet Registry
        </Link>
      </div>
    );
  }

  const colors = shipColors[shipSlug!] || { primary: "#333", accent: "#ff9900" };



  const flashSaved = () => {
    if (savedTimer[0]) clearTimeout(savedTimer[0]);
    setShowSaved(true);
    savedTimer[0] = setTimeout(() => setShowSaved(false), 1500);
  };

  // Helpers for updating ship fields and auto-saving
  const updateShip = (updater: (draft: ShipData) => ShipData) => {
    const updated = updater({ ...shipData });
    setShipsData((prev) => ({ ...prev, [shipSlug!]: updated }));
    saveShip(shipSlug!, updated).catch(console.error);
    flashSaved();
  };

  const updateField = <K extends keyof ShipData>(key: K, value: ShipData[K]) => {
    updateShip((draft) => ({ ...draft, [key]: value }));
  };

  // Weapon editing helpers
  const updateWeapon = (index: number, field: keyof ShipWeapon, value: string | number | null) => {
    const weapons = shipData.weapons.map((w, i) =>
      i === index ? { ...w, [field]: value } : w
    );
    updateField("weapons", weapons);
  };

  const addWeapon = () => {
    const weapons: ShipWeapon[] = [...shipData.weapons, { name: "New Weapon", damage: 0, count: null }];
    updateField("weapons", weapons);
  };

  const removeWeapon = (index: number) => {
    const weapons = shipData.weapons.filter((_, i) => i !== index);
    updateField("weapons", weapons);
  };

  // Crew assignment helpers — write to Firestore so all pages stay in sync
  const unassignCrew = async (crewSlug: string) => {
    try {
      await updateCharacter(crewSlug, { shipId: "" });
      flashSaved();
    } catch (err) {
      console.error("Failed to unassign crew member:", err);
    }
  };

  const assignCrew = async (crewSlug: string) => {
    if (!crewSlug) return;
    try {
      await updateCharacter(crewSlug, { shipId: shipSlug! });
      setAssignSelectValue("");
      flashSaved();
    } catch (err) {
      console.error("Failed to assign crew member:", err);
    }
  };

  // Unassigned crew derived from Firestore — crew whose shipId is blank or unrecognized
  const shipKeys = Object.keys(shipsData);
  const unassignedCrew = Object.entries(allFirebaseCrew).filter(
    ([, member]) =>
      member.shipId === "" || (!shipKeys.includes(member.shipId) && member.shipId !== "starbase")
  );

  const handleClassChange = (val: string) => {
    const lug = LUG_SHIP_CLASSES[val];
    if (lug) {
      const parseImpulse = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
      updateShip((draft) => ({
        ...draft,
        class: `${lug.className}-class`,
        type: lug.fullType.replace(`${lug.className}-class `, ""),
        crew: lug.operations.crew,
        passengers: lug.operations.passengers,
        evacuationCapacity: lug.operations.evacuation,
        structuralPoints: { primary: lug.hull.structuralPoints, secondary: 0 },
        warp: {
          cruising: lug.propulsion.warp.cruising,
          standard: lug.propulsion.warp.standard,
          maximum: lug.propulsion.warp.maximum,
          maximumDuration: lug.propulsion.warp.maxDuration,
        },
        impulse: {
          standard: parseImpulse(lug.propulsion.impulse.cruising),
          maximum: parseImpulse(lug.propulsion.impulse.maximum),
        },
        shields: {
          standard: lug.shields.protection,
          maximum: lug.shields.reinforced,
        },
        weapons: lug.weapons.map((w) => ({
          name: w.name,
          damage: w.damage,
          count: w.number ?? null,
        })),
      }));
    } else {
      updateField("class", val);
    }
  };

  const handleReset = () => {
    localStorage.removeItem("shipsData");
    localStorage.removeItem("crewData");
    window.location.reload();
  };

  return (
    <div style={{
      maxWidth: "1000px",
      margin: "0 auto",
      padding: "2rem",
      fontFamily: "'Orbitron', sans-serif",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateX(0)" : "translateX(-30px)",
      transition: "opacity 0.5s ease-out, transform 0.5s ease-out",
    }}>

      {/* LCARS Header Bar */}
      <div style={{
        display: "flex",
        alignItems: "stretch",
        marginBottom: "2rem",
        height: "50px",
      }}>
        <div style={{
          width: "20px",
          backgroundColor: colors.accent,
          borderRadius: "20px 0 0 0",
        }} />
        <div style={{
          flex: 1,
          backgroundColor: colors.accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 2rem",
        }}>
          <h1 style={{
            margin: 0,
            color: "#000",
            fontSize: "1.6rem",
            fontWeight: "bold",
            letterSpacing: "3px",
            textTransform: "uppercase",
          }}>
            {shipData.name}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {showSaved && (
              <span style={{
                color: "#33cc99",
                fontSize: "0.7rem",
                fontWeight: "bold",
                letterSpacing: "2px",
                animation: "fadeInOut 1.5s ease-in-out",
              }}>
                SAVED
              </span>
            )}
            <button
              onClick={() => setEditMode((prev) => !prev)}
              style={{
                backgroundColor: editMode ? "#ff9933" : "transparent",
                border: editMode ? "none" : "2px solid #00000066",
                borderRadius: "4px",
                color: editMode ? "#000" : "#00000099",
                padding: "0.25rem 0.75rem",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.7rem",
                fontWeight: "bold",
                letterSpacing: "1px",
                cursor: "pointer",
                transition: "background-color 0.2s, color 0.2s",
              }}
            >
              {editMode ? "EDITING" : "EDIT"}
            </button>
          </div>
        </div>
        <div style={{
          width: "80px",
          backgroundColor: "#9933cc",
          borderRadius: "0 20px 20px 0",
        }} />
      </div>

      {/* Ship Overview Panel */}
      <div style={{
        backgroundColor: "#111",
        border: `2px solid ${colors.accent}`,
        borderRadius: "0 30px 0 0",
        padding: "1.5rem",
        marginBottom: "1.5rem",
      }}>
        <h2 style={{
          color: colors.accent,
          fontSize: "0.85rem",
          letterSpacing: "2px",
          marginBottom: "0.75rem",
          textTransform: "uppercase",
        }}>
          Ship Overview
        </h2>

        {editMode ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem 2rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "0.25rem" }}>
                Ship Name
              </label>
              <input
                type="text"
                value={shipData.name}
                onChange={(e) => updateField("name", e.target.value)}
                style={inputStyle(colors.accent)}
              />
            </div>
            <div>
              <label style={{ color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "0.25rem" }}>
                Registry
              </label>
              <input
                type="text"
                value={shipData.registry}
                onChange={(e) => updateField("registry", e.target.value)}
                style={inputStyle(colors.accent)}
              />
            </div>
            <div>
              <label style={{ color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "0.25rem" }}>
                Class
              </label>
              <select
                value={
                  Object.entries(LUG_SHIP_CLASSES).find(
                    ([, sc]) => `${sc.className}-class` === shipData.class
                  )?.[0] ?? shipData.class ?? ""
                }
                onChange={(e) => handleClassChange(e.target.value)}
                style={{ ...inputStyle(colors.accent), cursor: "pointer" }}
              >
                <option value="">Select class...</option>
                <optgroup label="LUG: Price of Freedom (auto-fill)">
                  {Object.entries(LUG_SHIP_CLASSES).map(([slug, sc]) => (
                    <option key={slug} value={slug}>
                      {sc.className}-class — {sc.fullType.replace(`${sc.className}-class `, "")}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Additional Classes">
                  {STARSHIP_CLASSES
                    .filter((sc) => !Object.values(LUG_SHIP_CLASSES).some((l) => l.className === sc.name))
                    .map((sc) => (
                      <option key={sc.name} value={`${sc.name}-class`}>
                        {sc.name}-class — {sc.role}
                      </option>
                    ))}
                </optgroup>
                {shipData.class &&
                  !Object.values(LUG_SHIP_CLASSES).some((l) => `${l.className}-class` === shipData.class) &&
                  !STARSHIP_CLASSES.some((sc) => `${sc.name}-class` === shipData.class) && (
                    <option value={shipData.class}>{shipData.class}</option>
                  )}
              </select>
            </div>
            <div>
              <label style={{ color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "0.25rem" }}>
                Type
              </label>
              <input
                type="text"
                value={shipData.type}
                onChange={(e) => updateField("type", e.target.value)}
                style={inputStyle(colors.accent)}
              />
            </div>
            <div>
              <label style={{ color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "0.25rem" }}>
                Status
              </label>
              <select
                value={shipData.status}
                onChange={(e) => updateField("status", e.target.value)}
                style={inputStyle(colors.accent)}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "0.25rem" }}>
                Description
              </label>
              <textarea
                value={shipData.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={4}
                style={{
                  ...inputStyle(colors.accent),
                  resize: "vertical",
                  minHeight: "80px",
                }}
              />
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 2rem", marginBottom: "1rem" }}>
              <InfoRow label="Registry" value={shipData.registry} color={colors.accent} />
              <InfoRow label="Class" value={shipData.class} color={colors.accent} />
              <InfoRow label="Type" value={shipData.type} color={colors.accent} />
              <InfoRow label="Status" value={shipData.status} color="#33cc99" />
            </div>
            <p style={{ color: "#ccc", lineHeight: "1.8", fontSize: "0.95rem", margin: 0 }}>
              {shipData.description}
            </p>
          </>
        )}
      </div>

      {/* Engineering Specifications */}
      <div style={{
        backgroundColor: "#111",
        border: "2px solid #ffcc33",
        borderRadius: "0 30px 0 0",
        padding: "1.5rem",
        marginBottom: "1.5rem",
      }}>
        <h2 style={{
          color: "#ffcc33",
          fontSize: "0.85rem",
          letterSpacing: "2px",
          marginBottom: "0.75rem",
          textTransform: "uppercase",
        }}>
          Engineering Specifications
        </h2>

        {editMode ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem 2rem" }}>
            {/* Structural Points */}
            <div>
              <label style={{ color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "0.25rem" }}>
                Structural Pts (Primary / Secondary)
              </label>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input
                  type="number"
                  value={shipData.structuralPoints?.primary ?? ""}
                  onChange={(e) => {
                    const val = e.target.value === "" ? null : Number(e.target.value);
                    updateField("structuralPoints", val === null ? null : {
                      primary: val,
                      secondary: shipData.structuralPoints?.secondary ?? 0,
                    });
                  }}
                  style={numberInputStyle("#ffcc33")}
                />
                <span style={{ color: "#888" }}>/</span>
                <input
                  type="number"
                  value={shipData.structuralPoints?.secondary ?? ""}
                  onChange={(e) => {
                    const val = e.target.value === "" ? null : Number(e.target.value);
                    updateField("structuralPoints", val === null ? null : {
                      primary: shipData.structuralPoints?.primary ?? 0,
                      secondary: val,
                    });
                  }}
                  style={numberInputStyle("#ffcc33")}
                />
              </div>
            </div>

            {/* Crew */}
            <div>
              <label style={{ color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "0.25rem" }}>
                Crew
              </label>
              <input
                type="number"
                value={shipData.crew ?? ""}
                onChange={(e) => updateField("crew", e.target.value === "" ? null : Number(e.target.value))}
                style={numberInputStyle("#ffcc33")}
              />
            </div>

            {/* Passengers */}
            <div>
              <label style={{ color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "0.25rem" }}>
                Passengers
              </label>
              <input
                type="number"
                value={shipData.passengers ?? ""}
                onChange={(e) => updateField("passengers", e.target.value === "" ? null : Number(e.target.value))}
                style={numberInputStyle("#ffcc33")}
              />
            </div>

            {/* Evacuation Capacity */}
            <div>
              <label style={{ color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "0.25rem" }}>
                Evac Capacity
              </label>
              <input
                type="number"
                value={shipData.evacuationCapacity ?? ""}
                onChange={(e) => updateField("evacuationCapacity", e.target.value === "" ? null : Number(e.target.value))}
                style={numberInputStyle("#ffcc33")}
              />
            </div>

            {/* Warp */}
            <div>
              <label style={{ color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "0.25rem" }}>
                Warp Cruising
              </label>
              <input
                type="number"
                step="0.01"
                value={shipData.warp?.cruising ?? ""}
                onChange={(e) => {
                  const val = e.target.value === "" ? null : Number(e.target.value);
                  updateField("warp", val === null ? null : {
                    cruising: val,
                    standard: shipData.warp?.standard ?? 0,
                    maximum: shipData.warp?.maximum ?? 0,
                    maximumDuration: shipData.warp?.maximumDuration ?? "",
                  });
                }}
                style={numberInputStyle("#ffcc33")}
              />
            </div>

            <div>
              <label style={{ color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "0.25rem" }}>
                Warp Standard
              </label>
              <input
                type="number"
                step="0.01"
                value={shipData.warp?.standard ?? ""}
                onChange={(e) => {
                  const val = e.target.value === "" ? null : Number(e.target.value);
                  updateField("warp", val === null ? null : {
                    cruising: shipData.warp?.cruising ?? 0,
                    standard: val,
                    maximum: shipData.warp?.maximum ?? 0,
                    maximumDuration: shipData.warp?.maximumDuration ?? "",
                  });
                }}
                style={numberInputStyle("#ffcc33")}
              />
            </div>

            <div>
              <label style={{ color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "0.25rem" }}>
                Warp Maximum
              </label>
              <input
                type="number"
                step="0.01"
                value={shipData.warp?.maximum ?? ""}
                onChange={(e) => {
                  const val = e.target.value === "" ? null : Number(e.target.value);
                  updateField("warp", val === null ? null : {
                    cruising: shipData.warp?.cruising ?? 0,
                    standard: shipData.warp?.standard ?? 0,
                    maximum: val,
                    maximumDuration: shipData.warp?.maximumDuration ?? "",
                  });
                }}
                style={numberInputStyle("#ffcc33")}
              />
            </div>

            <div>
              <label style={{ color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "0.25rem" }}>
                Warp Max Duration
              </label>
              <input
                type="text"
                value={shipData.warp?.maximumDuration ?? ""}
                onChange={(e) => {
                  updateField("warp", {
                    cruising: shipData.warp?.cruising ?? 0,
                    standard: shipData.warp?.standard ?? 0,
                    maximum: shipData.warp?.maximum ?? 0,
                    maximumDuration: e.target.value,
                  });
                }}
                style={inputStyle("#ffcc33")}
              />
            </div>

            {/* Impulse */}
            <div>
              <label style={{ color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "0.25rem" }}>
                Impulse Standard (c)
              </label>
              <input
                type="number"
                step="0.01"
                value={shipData.impulse?.standard ?? ""}
                onChange={(e) => {
                  const val = e.target.value === "" ? null : Number(e.target.value);
                  updateField("impulse", val === null ? null : {
                    standard: val,
                    maximum: shipData.impulse?.maximum ?? 0,
                  });
                }}
                style={numberInputStyle("#ffcc33")}
              />
            </div>

            <div>
              <label style={{ color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "0.25rem" }}>
                Impulse Maximum (c)
              </label>
              <input
                type="number"
                step="0.01"
                value={shipData.impulse?.maximum ?? ""}
                onChange={(e) => {
                  const val = e.target.value === "" ? null : Number(e.target.value);
                  updateField("impulse", val === null ? null : {
                    standard: shipData.impulse?.standard ?? 0,
                    maximum: val,
                  });
                }}
                style={numberInputStyle("#ffcc33")}
              />
            </div>
          </div>
        ) : (
          <>
            {shipData.structuralPoints || shipData.crew || shipData.warp ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 2rem" }}>
                {shipData.structuralPoints && (
                  <InfoRow label="Structural Pts" value={`${shipData.structuralPoints.primary} / ${shipData.structuralPoints.secondary}`} color="#ffcc33" />
                )}
                {shipData.crew !== null && <InfoRow label="Crew" value={String(shipData.crew)} color="#ffcc33" />}
                {shipData.passengers !== null && <InfoRow label="Passengers" value={String(shipData.passengers)} color="#ffcc33" />}
                {shipData.evacuationCapacity !== null && <InfoRow label="Evac Capacity" value={String(shipData.evacuationCapacity)} color="#ffcc33" />}
                {shipData.warp && (
                  <>
                    <InfoRow label="Warp Cruising" value={String(shipData.warp.cruising)} color="#ffcc33" />
                    <InfoRow label="Warp Standard" value={String(shipData.warp.standard)} color="#ffcc33" />
                    <InfoRow label="Warp Maximum" value={`${shipData.warp.maximum} (${shipData.warp.maximumDuration})`} color="#ffcc33" />
                  </>
                )}
                {shipData.impulse && (
                  <>
                    <InfoRow label="Impulse Std" value={`${shipData.impulse.standard}c`} color="#ffcc33" />
                    <InfoRow label="Impulse Max" value={`${shipData.impulse.maximum}c`} color="#ffcc33" />
                  </>
                )}
              </div>
            ) : (
              <p style={{ color: "#ff993380", fontSize: "0.9rem", fontStyle: "italic", margin: 0 }}>
                DATA CLASSIFIED — PENDING STARFLEET AUTHORIZATION
              </p>
            )}
          </>
        )}
      </div>

      {/* Tactical Systems */}
      <div style={{
        backgroundColor: "#111",
        border: "2px solid #cc6666",
        borderRadius: "0 30px 0 0",
        padding: "1.5rem",
        marginBottom: "1.5rem",
      }}>
        <h2 style={{
          color: "#cc6666",
          fontSize: "0.85rem",
          letterSpacing: "2px",
          marginBottom: "0.75rem",
          textTransform: "uppercase",
        }}>
          Tactical Systems
        </h2>

        {editMode ? (
          <>
            {shipData.weapons.map((w, i) => (
              <div key={i} style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.5rem 0",
                borderBottom: i < shipData.weapons.length - 1 ? "1px solid #333" : "none",
              }}>
                <input
                  type="text"
                  value={w.name}
                  onChange={(e) => updateWeapon(i, "name", e.target.value)}
                  style={{ ...inputStyle("#cc6666"), flex: 1 }}
                  placeholder="Weapon name"
                />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.15rem" }}>
                  <span style={{ color: "#888", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "1px" }}>DMG</span>
                  <input
                    type="number"
                    value={w.damage}
                    onChange={(e) => updateWeapon(i, "damage", Number(e.target.value))}
                    style={numberInputStyle("#cc6666")}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.15rem" }}>
                  <span style={{ color: "#888", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "1px" }}>COUNT</span>
                  <input
                    type="number"
                    value={w.count ?? ""}
                    onChange={(e) => updateWeapon(i, "count", e.target.value === "" ? null : Number(e.target.value))}
                    style={numberInputStyle("#cc6666")}
                    placeholder="—"
                  />
                </div>
                <button
                  onClick={() => removeWeapon(i)}
                  style={{
                    backgroundColor: "transparent",
                    border: "1px solid #cc666666",
                    borderRadius: "50%",
                    color: "#cc6666",
                    width: "28px",
                    height: "28px",
                    cursor: "pointer",
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: "0.9rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                  title="Remove weapon"
                >
                  x
                </button>
              </div>
            ))}

            {/* Shield inputs */}
            <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid #333" }}>
              <label style={{ color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "0.5rem" }}>
                Shields (Standard / Maximum)
              </label>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input
                  type="number"
                  value={shipData.shields?.standard ?? ""}
                  onChange={(e) => {
                    const val = e.target.value === "" ? null : Number(e.target.value);
                    updateField("shields", val === null ? null : {
                      standard: val,
                      maximum: shipData.shields?.maximum ?? 0,
                    });
                  }}
                  style={numberInputStyle("#cc6666")}
                  placeholder="Std"
                />
                <span style={{ color: "#888" }}>/</span>
                <input
                  type="number"
                  value={shipData.shields?.maximum ?? ""}
                  onChange={(e) => {
                    const val = e.target.value === "" ? null : Number(e.target.value);
                    updateField("shields", val === null ? null : {
                      standard: shipData.shields?.standard ?? 0,
                      maximum: val,
                    });
                  }}
                  style={numberInputStyle("#cc6666")}
                  placeholder="Max"
                />
              </div>
            </div>

            <button
              onClick={addWeapon}
              style={{
                marginTop: "1rem",
                backgroundColor: "transparent",
                border: "1px solid #cc666666",
                borderRadius: "4px",
                color: "#cc6666",
                padding: "0.4rem 1rem",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.75rem",
                letterSpacing: "1px",
                cursor: "pointer",
              }}
            >
              + ADD WEAPON
            </button>
          </>
        ) : (
          <>
            {shipData.weapons.length > 0 || shipData.shields ? (
              <>
                {shipData.weapons.map((w, i) => (
                  <div key={i} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0.5rem 0",
                    borderBottom: i < shipData.weapons.length - 1 ? "1px solid #333" : "none",
                  }}>
                    <span style={{ color: "#ccc", fontSize: "0.9rem" }}>
                      {w.name}
                      {w.count && <span style={{ color: "#888", fontSize: "0.75rem" }}> (x{w.count})</span>}
                    </span>
                    <span style={{
                      color: "#cc6666",
                      fontSize: "0.85rem",
                      fontWeight: "bold",
                    }}>
                      DMG {w.damage}
                    </span>
                  </div>
                ))}
                {shipData.shields && (
                  <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid #333" }}>
                    <InfoRow label="Shields" value={`${shipData.shields.standard} / ${shipData.shields.maximum}`} color="#cc6666" />
                  </div>
                )}
              </>
            ) : (
              <p style={{ color: "#cc666680", fontSize: "0.9rem", fontStyle: "italic", margin: 0 }}>
                DATA CLASSIFIED — PENDING STARFLEET AUTHORIZATION
              </p>
            )}
          </>
        )}
      </div>

      {/* Crew Manifest */}
      <div style={{
        backgroundColor: "#111",
        border: "2px solid #6699cc",
        borderRadius: "0 30px 0 0",
        padding: "1.5rem",
        marginBottom: "1.5rem",
      }}>
        <h2 style={{
          color: "#6699cc",
          fontSize: "0.85rem",
          letterSpacing: "2px",
          marginBottom: "0.75rem",
          textTransform: "uppercase",
        }}>
          Crew Manifest
        </h2>

        {shipCrew.length > 0 ? (
          shipCrew.map(({ slug, member }, i) => (
            <div
              key={slug}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                padding: "0.6rem 0",
                borderBottom: i < shipCrew.length - 1 ? "1px solid #222" : "none",
              }}
            >
              {editMode ? (
                <>
                  <span style={{
                    color: "#ff9933",
                    fontSize: "0.75rem",
                    width: "120px",
                    flexShrink: 0,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}>
                    {member.rank}
                  </span>
                  <span style={{ color: "#fff", fontSize: "0.9rem", flex: 1 }}>
                    {member.name}
                  </span>
                  <span style={{ color: "#666", fontSize: "0.8rem" }}>
                    {member.position}
                  </span>
                  <button
                    onClick={() => unassignCrew(slug)}
                    style={{
                      backgroundColor: "transparent",
                      border: "1px solid #cc333366",
                      borderRadius: "50%",
                      color: "#cc3333",
                      width: "28px",
                      height: "28px",
                      cursor: "pointer",
                      fontFamily: "'Orbitron', sans-serif",
                      fontSize: "0.9rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                    title="Unassign crew member"
                  >
                    x
                  </button>
                </>
              ) : (
                <Link
                  to={`/crew/${slug}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    width: "100%",
                    textDecoration: "none",
                    transition: "background 0.2s",
                  }}
                >
                  <span style={{
                    color: "#ff9933",
                    fontSize: "0.75rem",
                    width: "120px",
                    flexShrink: 0,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}>
                    {member.rank}
                  </span>
                  <span style={{ color: "#fff", fontSize: "0.9rem", flex: 1 }}>
                    {member.name}
                  </span>
                  <span style={{ color: "#666", fontSize: "0.8rem" }}>
                    {member.position}
                  </span>
                </Link>
              )}
            </div>
          ))
        ) : (
          <p style={{ color: "#6699cc80", fontSize: "0.9rem", fontStyle: "italic", margin: 0 }}>
            NO CREW ASSIGNED
          </p>
        )}

        {editMode && (
          <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid #333", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <select
              value={assignSelectValue}
              onChange={(e) => setAssignSelectValue(e.target.value)}
              style={{ ...inputStyle("#6699cc"), flex: 1 }}
            >
              <option value="">-- Select crew to assign --</option>
              {unassignedCrew.map(([slug, member]) => (
                <option key={slug} value={slug}>
                  {member.rank} {member.name} — {member.position}
                </option>
              ))}
            </select>
            <button
              onClick={() => assignCrew(assignSelectValue)}
              disabled={!assignSelectValue}
              style={{
                backgroundColor: assignSelectValue ? "#6699cc" : "transparent",
                border: "1px solid #6699cc66",
                borderRadius: "4px",
                color: assignSelectValue ? "#000" : "#6699cc66",
                padding: "0.4rem 1rem",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.75rem",
                letterSpacing: "1px",
                cursor: assignSelectValue ? "pointer" : "not-allowed",
                whiteSpace: "nowrap",
              }}
            >
              ASSIGN CREW
            </button>
          </div>
        )}
      </div>

      {/* Ship Comms Board */}
      <div style={{
        backgroundColor: "#111",
        border: `2px solid ${colors.accent}`,
        borderRadius: "0 30px 0 0",
        padding: "1.5rem",
        marginBottom: "2rem",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{
            color: colors.accent,
            fontSize: "0.85rem",
            letterSpacing: "2px",
            margin: 0,
            textTransform: "uppercase",
          }}>
            Ship Communications
          </h2>
          {canTransmitDirective && (
            <button
              onClick={() => setShowCommandConsole(true)}
              style={{
                backgroundColor: "#9933cc20",
                border: "1px solid #9933cc",
                borderRadius: "20px",
                color: "#9933cc",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.65rem",
                letterSpacing: "1.5px",
                padding: "0.3rem 0.85rem",
                cursor: "pointer",
              }}
            >
              ⚡ COMMAND CONSOLE
            </button>
          )}
        </div>

        {/* Post Form */}
        <form onSubmit={handleSubmit} style={{ marginBottom: "1.5rem" }}>
          <textarea
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            placeholder="Transmit a message to ship comms..."
            style={{
              width: "100%",
              minHeight: "80px",
              backgroundColor: "#0a0a0a",
              border: `1px solid ${colors.accent}40`,
              borderRadius: "8px",
              color: "#ccc",
              padding: "0.75rem",
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "0.85rem",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
          <div style={{
            display: "flex",
            gap: "1rem",
            alignItems: "center",
            marginTop: "0.75rem",
          }}>
            <label style={{
              color: "#888",
              fontSize: "0.75rem",
              cursor: "pointer",
              border: "1px solid #444",
              borderRadius: "20px",
              padding: "0.3rem 0.75rem",
            }}>
              Attach File
              <input
                type="file"
                onChange={(e) => e.target.files?.[0] && setAttachment(e.target.files[0])}
                style={{ display: "none" }}
              />
            </label>
            {attachment && (
              <span style={{ color: "#888", fontSize: "0.75rem" }}>{attachment.name}</span>
            )}
            <button
              type="submit"
              disabled={loading || !postText.trim()}
              style={{
                marginLeft: "auto",
                backgroundColor: colors.accent,
                color: "#000",
                border: "none",
                borderRadius: "20px",
                padding: "0.5rem 1.5rem",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.75rem",
                fontWeight: "bold",
                cursor: loading ? "wait" : "pointer",
                opacity: loading || !postText.trim() ? 0.5 : 1,
                letterSpacing: "1px",
              }}
            >
              {loading ? "TRANSMITTING..." : "TRANSMIT"}
            </button>
          </div>
        </form>

        {/* Mission Briefings — from forum collection, category: "mission" */}
        {(() => {
          const missionThreads = forumThreads.filter((t) => t.category === "mission");
          if (missionThreads.length === 0) return null;
          return (
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <span style={{
                  backgroundColor: "#33cc9920",
                  border: "1px solid #33cc99",
                  borderRadius: "20px",
                  color: "#33cc99",
                  fontSize: "0.65rem",
                  fontFamily: "'Orbitron', sans-serif",
                  letterSpacing: "2px",
                  padding: "0.2rem 0.75rem",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}>
                  Mission Briefings
                </span>
                <div style={{ flex: 1, height: "1px", backgroundColor: "#33cc9930" }} />
              </div>
              {missionThreads.map((t) => (
                <div key={t.id} style={{
                  backgroundColor: "#0a1a10",
                  border: "1px solid #33cc9930",
                  borderLeft: "3px solid #33cc99",
                  borderRadius: "4px",
                  padding: "1rem 1.25rem",
                  marginBottom: "0.75rem",
                  fontFamily: "'Orbitron', sans-serif",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.4rem", flexWrap: "wrap", gap: "0.4rem" }}>
                    <span style={{ color: "#33cc99", fontSize: "0.8rem", fontWeight: "bold", letterSpacing: "1px" }}>{t.title}</span>
                    <span style={{ color: "#555", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "1px" }}>Starfleet Command</span>
                  </div>
                  <p style={{ color: "#C8D8F0", margin: 0, fontSize: "0.85rem", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{t.content}</p>
                </div>
              ))}
              <div style={{ height: "1px", backgroundColor: "#33cc9920", marginBottom: "1.25rem" }} />
            </div>
          );
        })()}

        {/* Fleet Command Transmissions */}
        <FleetTransmissions shipName={shipsData[shipSlug!]?.name} />

        {/* Messages */}
        {posts.length === 0 ? (
          <p style={{ color: "#555", fontSize: "0.85rem", textAlign: "center", margin: "1rem 0 0" }}>
            No transmissions recorded. Be the first to post.
          </p>
        ) : (
          posts.map((post) => (
            <div key={post.id} style={{
              backgroundColor: "#0a0a0a",
              border: "1px solid #222",
              borderRadius: "8px",
              padding: "1rem",
              marginBottom: "0.75rem",
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "0.5rem",
              }}>
                <span style={{ color: colors.accent, fontSize: "0.75rem", fontWeight: "bold" }}>
                  {post.author}
                </span>
                <span style={{ color: "#555", fontSize: "0.7rem" }}>
                  {post.createdAt?.toDate?.().toLocaleString() || "Just now"}
                </span>
              </div>
              <p style={{ color: "#ccc", margin: 0, fontSize: "0.9rem", lineHeight: "1.6" }}>
                {post.content}
              </p>
              {post.attachmentUrl && (
                <a
                  href={post.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: colors.accent, fontSize: "0.8rem", marginTop: "0.5rem", display: "inline-block" }}
                >
                  View Attachment
                </a>
              )}
            </div>
          ))
        )}
      </div>

      {/* Reset to Defaults — edit mode only */}
      {editMode && (
        <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
          <button
            onClick={handleReset}
            style={{
              backgroundColor: "transparent",
              border: "1px solid #cc333366",
              borderRadius: "4px",
              color: "#cc3333",
              padding: "0.5rem 1.5rem",
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "0.75rem",
              letterSpacing: "2px",
              cursor: "pointer",
            }}
          >
            RESET TO DEFAULTS
          </button>
        </div>
      )}

      {/* Bottom LCARS bar */}
      <div style={{
        display: "flex",
        alignItems: "stretch",
        height: "45px",
      }}>
        <div style={{
          width: "80px",
          backgroundColor: "#9933cc",
          borderRadius: "20px 0 0 20px",
        }} />
        <Link to="/fleet" style={{
          flex: 1,
          backgroundColor: colors.accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#000",
          fontWeight: "bold",
          textDecoration: "none",
          letterSpacing: "2px",
          fontSize: "0.9rem",
        }}>
          RETURN TO FLEET REGISTRY
        </Link>
        <div style={{
          width: "20px",
          backgroundColor: colors.accent,
          borderRadius: "0 20px 20px 0",
        }} />
      </div>

      {/* Command Console Modal */}
      {showCommandConsole && (
        <div
          onClick={() => setShowCommandConsole(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#0d0d0d",
              border: "1px solid #9933cc",
              borderTop: "3px solid #9933cc",
              borderRadius: "4px",
              padding: "2rem",
              width: "100%",
              maxWidth: "520px",
              fontFamily: "'Orbitron', sans-serif",
            }}
          >
            {/* Modal header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div>
                <p style={{ color: "#9933cc", fontSize: "0.6rem", letterSpacing: "3px", margin: "0 0 0.25rem", textTransform: "uppercase" }}>
                  Starfleet Computer Core
                </p>
                <h2 style={{ color: "#fff", fontSize: "0.95rem", margin: 0, letterSpacing: "2px" }}>
                  COMMAND CONSOLE
                </h2>
              </div>
              <button
                onClick={() => setShowCommandConsole(false)}
                style={{ background: "none", border: "none", color: "#555", fontSize: "1.25rem", cursor: "pointer", lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTransmitDirective}>
              {/* Target Department */}
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", color: "#666", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                  Target Department
                </label>
                <select
                  value={cmdDept}
                  onChange={(e) => setCmdDept(e.target.value)}
                  style={{
                    width: "100%",
                    backgroundColor: "#0a0a0a",
                    border: "1px solid #9933cc40",
                    borderRadius: "4px",
                    color: "#ccc",
                    padding: "0.5rem 0.75rem",
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                  }}
                >
                  {CMD_DEPARTMENTS.map((d) => (
                    <option key={d.id} value={d.id}>{d.label}</option>
                  ))}
                </select>
              </div>

              {/* Directive Title */}
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", color: "#666", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                  Directive Title
                </label>
                <input
                  type="text"
                  value={cmdTitle}
                  onChange={(e) => setCmdTitle(e.target.value)}
                  placeholder="Enter directive title..."
                  style={{
                    width: "100%",
                    backgroundColor: "#0a0a0a",
                    border: "1px solid #9933cc40",
                    borderRadius: "4px",
                    color: "#ccc",
                    padding: "0.5rem 0.75rem",
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: "0.8rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Directive Message */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", color: "#666", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                  Directive Message
                </label>
                <textarea
                  value={cmdMessage}
                  onChange={(e) => setCmdMessage(e.target.value)}
                  placeholder="Enter the full directive text..."
                  rows={5}
                  style={{
                    width: "100%",
                    backgroundColor: "#0a0a0a",
                    border: "1px solid #9933cc40",
                    borderRadius: "4px",
                    color: "#ccc",
                    padding: "0.5rem 0.75rem",
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: "0.8rem",
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Issuing as */}
              {userCrewMember && (
                <p style={{ color: "#444", fontSize: "0.62rem", letterSpacing: "1px", margin: "0 0 1.25rem", textTransform: "uppercase" }}>
                  Issuing as: <span style={{ color: "#9933cc" }}>{userRank} {userCrewMember.name}</span>
                </p>
              )}

              {/* Buttons */}
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowCommandConsole(false)}
                  style={{
                    backgroundColor: "transparent",
                    border: "1px solid #333",
                    borderRadius: "20px",
                    color: "#666",
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: "0.65rem",
                    letterSpacing: "1.5px",
                    padding: "0.4rem 1.1rem",
                    cursor: "pointer",
                  }}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={cmdSending || !cmdTitle.trim() || !cmdMessage.trim()}
                  style={{
                    backgroundColor: cmdSending || !cmdTitle.trim() || !cmdMessage.trim() ? "#9933cc40" : "#9933cc",
                    border: "none",
                    borderRadius: "20px",
                    color: "#fff",
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: "0.65rem",
                    letterSpacing: "1.5px",
                    padding: "0.4rem 1.1rem",
                    cursor: cmdSending || !cmdTitle.trim() || !cmdMessage.trim() ? "not-allowed" : "pointer",
                  }}
                >
                  {cmdSending ? "TRANSMITTING..." : "TRANSMIT DIRECTIVE"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const InfoRow = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0" }}>
    <span style={{ color: "#888", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "1px" }}>
      {label}
    </span>
    <span style={{ color, fontSize: "0.9rem", fontWeight: "bold" }}>
      {value}
    </span>
  </div>
);

export default ShipPage;
