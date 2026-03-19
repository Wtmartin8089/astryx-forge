import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { getPlanet, updatePlanet, deletePlanet } from "../utils/planetsFirestore";
import type { PlanetRecord } from "../utils/planetsFirestore";
import "../assets/lcars.css";

import acathlaImg from "../assets/acathla.png";
import kralikImg from "../assets/kralik.png";
import dhoffrynImg from "../assets/dhoffryn.png";
import larconisImg from "../assets/lucronis.png";
import machidaImg from "../assets/machida.png";
import starbaseImg from "../assets/starbase_v2.png";
import tarakaImg from "../assets/taraka.png";
import lagosImg from "../assets/lagos.png";
import kakistosImg from "../assets/kakistos.png";

const planetImages: Record<string, string> = {
  acathla: acathlaImg, kralik: kralikImg, dhoffryn: dhoffrynImg,
  larconis: larconisImg, machida: machidaImg, starbase: starbaseImg,
  taraka: tarakaImg, lagos: lagosImg, kakistos: kakistosImg,
};

const planetColors: Record<string, { primary: string; accent: string }> = {
  acathla: { primary: "#8b0000", accent: "#ff4444" },
  kralik: { primary: "#006400", accent: "#00cc66" },
  dhoffryn: { primary: "#cc8800", accent: "#ffcc33" },
  larconis: { primary: "#004466", accent: "#66ccff" },
  machida: { primary: "#993300", accent: "#ff6600" },
  starbase: { primary: "#333366", accent: "#6699cc" },
  taraka: { primary: "#330066", accent: "#9933cc" },
  lagos: { primary: "#003366", accent: "#3399ff" },
  kakistos: { primary: "#4a3600", accent: "#cc9933" },
};

const PlanetPage = () => {
  const { planetName } = useParams();
  const navigate = useNavigate();
  const [planetData, setPlanetData] = useState<PlanetRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    setVisible(false);
    setLoading(true);
    if (!planetName) return;
    getPlanet(planetName).then((data) => {
      setPlanetData(data);
      setLoading(false);
      setTimeout(() => setVisible(true), 50);
    });
  }, [planetName]);

  const openEdit = () => {
    if (!planetData) return;
    setForm({
      name: planetData.name || "",
      description: planetData.description || "",
      resources: (planetData.resources || []).join(", "),
      logs: (planetData.logs || []).join("\n"),
      classification: planetData.classification || "",
      systemData: planetData.systemData || "",
      gravity: planetData.gravity || "",
      yearAndDay: planetData.yearAndDay || "",
      atmosphere: planetData.atmosphere || "",
      hydrosphere: planetData.hydrosphere || "",
      climate: planetData.climate || "",
      sapientSpecies: planetData.sapientSpecies || "",
      techLevel: planetData.techLevel || "",
      government: planetData.government || "",
      culture: planetData.culture || "",
      affiliation: planetData.affiliation || "",
      placesOfNote: planetData.placesOfNote || "",
      shipFacilities: planetData.shipFacilities || "",
      otherDetail: planetData.otherDetail || "",
    });
    setEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planetName) return;
    setSaving(true);
    const updated: Partial<PlanetRecord> = {
      name: form.name,
      description: form.description,
      resources: form.resources.split(",").map((r) => r.trim()).filter(Boolean),
      logs: form.logs.split("\n").map((l) => l.trim()).filter(Boolean),
      classification: form.classification,
      systemData: form.systemData,
      gravity: form.gravity,
      yearAndDay: form.yearAndDay,
      atmosphere: form.atmosphere,
      hydrosphere: form.hydrosphere,
      climate: form.climate,
      sapientSpecies: form.sapientSpecies,
      techLevel: form.techLevel,
      government: form.government,
      culture: form.culture,
      affiliation: form.affiliation,
      placesOfNote: form.placesOfNote,
      shipFacilities: form.shipFacilities,
      otherDetail: form.otherDetail,
    };
    await updatePlanet(planetName, updated);
    setPlanetData({ ...planetData!, ...updated });
    setSaving(false);
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!planetName) return;
    setDeleting(true);
    await deletePlanet(planetName);
    navigate("/");
  };

  const set = (key: string, val: string) => setForm((prev) => ({ ...prev, [key]: val }));

  const colors = planetColors[planetName!] || { primary: "#333", accent: "#ff9900" };
  const image = planetImages[planetName!];

  const inputStyle: React.CSSProperties = {
    width: "100%", backgroundColor: "#0a0a0a", border: "1px solid #6699cc40",
    borderRadius: "4px", color: "#ccc", padding: "0.5rem 0.75rem",
    fontFamily: "'Orbitron', sans-serif", fontSize: "0.8rem", boxSizing: "border-box",
  };
  const lbl = (text: string) => (
    <label style={{ display: "block", color: "#555", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.3rem" }}>{text}</label>
  );
  const field = (label: string, key: string, placeholder = "") => (
    <div style={{ marginBottom: "0.9rem" }}>
      {lbl(label)}
      <input type="text" value={form[key]} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} style={inputStyle} />
    </div>
  );
  const fieldTA = (label: string, key: string, placeholder = "", rows = 2) => (
    <div style={{ marginBottom: "0.9rem" }}>
      {lbl(label)}
      <textarea value={form[key]} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} rows={rows} style={{ ...inputStyle, resize: "vertical" }} />
    </div>
  );

  if (loading) {
    return <div style={{ color: "#ff9900", textAlign: "center", marginTop: "4rem", fontFamily: "'Orbitron', sans-serif" }}><p>Scanning sector...</p></div>;
  }

  if (!planetData) {
    return (
      <div style={{ color: "#ff9900", textAlign: "center", marginTop: "4rem", fontFamily: "'Orbitron', sans-serif" }}>
        <p style={{ fontSize: "1.5rem" }}>Scanning sector...</p>
        <p style={{ color: "#6699cc", marginTop: "1rem" }}>Planet not found in database.</p>
        <Link to="/" style={{ color: "#9933cc", marginTop: "2rem", display: "inline-block" }}>Return to Star Map</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem", fontFamily: "'Orbitron', sans-serif", opacity: visible ? 1 : 0, transform: visible ? "translateX(0)" : "translateX(-30px)", transition: "opacity 0.5s ease-out, transform 0.5s ease-out" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "stretch", marginBottom: "2rem", height: "50px" }}>
        <div style={{ width: "20px", backgroundColor: colors.accent, borderRadius: "20px 0 0 0" }} />
        <div style={{ flex: 1, backgroundColor: colors.accent, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2rem" }}>
          <h1 style={{ margin: 0, color: "#000", fontSize: "1.8rem", fontWeight: "bold", letterSpacing: "3px", textTransform: "uppercase" }}>{planetData.name}</h1>
          <span style={{ color: "#000", fontWeight: "bold", fontSize: "0.8rem" }}>PLANETARY DATABASE</span>
        </div>
        <div style={{ width: "80px", backgroundColor: "#9933cc", borderRadius: "0 20px 20px 0" }} />
      </div>

      {/* ── EDIT MODE ── */}
      {editing ? (
        <form onSubmit={handleSave}>
          <div style={{ backgroundColor: "#111", border: "1px solid #6699cc30", borderTop: "3px solid #6699cc", borderRadius: "4px", padding: "2rem", marginBottom: "1.5rem" }}>

            <p style={{ color: "#6699cc", fontSize: "0.65rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "1.5rem" }}>— Planetary Record Editor —</p>

            {field("Planet Name *", "name")}
            {fieldTA("Survey Report / Description", "description", "", 3)}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {field("Class", "classification", "e.g. M")}
              {field("System Data", "systemData", "e.g. 2 Moons")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {field("Gravity", "gravity", "e.g. 1.18 G")}
              {field("Year and Day", "yearAndDay", "e.g. 360 days / 30 hrs. / day")}
            </div>
            {field("Atmosphere", "atmosphere", "e.g. Oxy/Nitro / Earth-Norm pressure")}
            {field("Hydrosphere", "hydrosphere", "e.g. 50% Water (surface)")}
            {field("Climate", "climate", "e.g. Sub-tropical")}
            {fieldTA("Sapient Species", "sapientSpecies", "e.g. Human - 20 mill.", 2)}
            {field("Tech Level", "techLevel", "e.g. Lvl. 5-6")}
            {fieldTA("Government", "government", "", 2)}
            {fieldTA("Culture", "culture", "", 3)}
            {field("Affiliation", "affiliation", "e.g. Independent - UFP")}
            {fieldTA("Resources", "resources", "Comma-separated: Dilithium, Gold", 2)}
            {fieldTA("Places of Note", "placesOfNote", "", 2)}
            {fieldTA("Ship Facilities", "shipFacilities", "", 2)}
            {fieldTA("Other Detail", "otherDetail", "", 2)}
            {fieldTA("Captain's Log Entries", "logs", "One entry per line", 4)}

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              <button type="button" onClick={() => setEditing(false)} style={{ backgroundColor: "transparent", border: "1px solid #333", borderRadius: "20px", color: "#666", fontFamily: "'Orbitron', sans-serif", fontSize: "0.65rem", letterSpacing: "1.5px", padding: "0.5rem 1.2rem", cursor: "pointer" }}>
                CANCEL
              </button>
              <button type="submit" disabled={saving || !form.name.trim()} style={{ backgroundColor: saving ? "#6699cc40" : "#6699cc", border: "none", borderRadius: "20px", color: "#000", fontFamily: "'Orbitron', sans-serif", fontSize: "0.65rem", fontWeight: "bold", letterSpacing: "1.5px", padding: "0.5rem 1.4rem", cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "SAVING..." : "SAVE RECORD"}
              </button>
            </div>
          </div>
        </form>
      ) : (
        /* ── VIEW MODE ── */
        <>
          {/* Main grid */}
          <div style={{ display: "grid", gridTemplateColumns: image ? "1fr 1fr" : "1fr", gap: "2rem", marginBottom: "2rem" }}>
            {image && (
              <div style={{ position: "relative", borderRadius: "12px", overflow: "hidden", border: `3px solid ${colors.accent}`, boxShadow: `0 0 30px ${colors.accent}40` }}>
                <img src={image} alt={planetData.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", minHeight: "300px" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: `linear-gradient(transparent, ${colors.primary})`, padding: "2rem 1rem 1rem" }}>
                  <span style={{ color: colors.accent, fontSize: "0.75rem", fontWeight: "bold", letterSpacing: "2px" }}>VISUAL SCAN COMPLETE</span>
                </div>
              </div>
            )}
            <div>
              <div style={{ backgroundColor: "#111", border: `2px solid ${colors.accent}`, borderRadius: "0 30px 0 0", padding: "1.5rem", marginBottom: "1.5rem" }}>
                <h2 style={{ color: colors.accent, fontSize: "0.85rem", letterSpacing: "2px", marginBottom: "0.75rem", textTransform: "uppercase" }}>Survey Report</h2>
                <p style={{ color: "#ccc", lineHeight: "1.8", fontSize: "1rem" }}>{planetData.description}</p>
              </div>
              <div style={{ backgroundColor: "#111", border: "2px solid #ffcc33", borderRadius: "0 30px 0 0", padding: "1.5rem" }}>
                <h2 style={{ color: "#ffcc33", fontSize: "0.85rem", letterSpacing: "2px", marginBottom: "0.75rem", textTransform: "uppercase" }}>Detected Resources</h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {planetData.resources?.map((res, idx) => (
                    <span key={idx} style={{ backgroundColor: "#ffcc3320", border: "1px solid #ffcc33", borderRadius: "20px", padding: "0.4rem 1rem", color: "#ffcc33", fontSize: "0.85rem", fontWeight: "bold" }}>{res}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* TNG stats grid — only shown if any are filled in */}
          {(planetData.classification || planetData.gravity || planetData.yearAndDay || planetData.climate || planetData.techLevel || planetData.affiliation || planetData.hydrosphere || planetData.systemData) && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.6rem", marginBottom: "1.5rem" }}>
              {[
                { label: "Class", value: planetData.classification },
                { label: "System Data", value: planetData.systemData },
                { label: "Gravity", value: planetData.gravity },
                { label: "Year and Day", value: planetData.yearAndDay },
                { label: "Hydrosphere", value: planetData.hydrosphere },
                { label: "Climate", value: planetData.climate },
                { label: "Tech Level", value: planetData.techLevel },
                { label: "Affiliation", value: planetData.affiliation },
              ].filter((f) => f.value).map((f) => (
                <div key={f.label} style={{ backgroundColor: "#111", border: `1px solid ${colors.accent}20`, borderRadius: "4px", padding: "0.6rem 0.9rem" }}>
                  <p style={{ color: "#555", fontSize: "0.58rem", letterSpacing: "1.5px", textTransform: "uppercase", margin: "0 0 0.2rem" }}>{f.label}</p>
                  <p style={{ color: colors.accent, fontSize: "0.82rem", margin: 0 }}>{f.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* TNG section panels */}
          {[
            { label: "Atmosphere", value: planetData.atmosphere },
            { label: "Sapient Species", value: planetData.sapientSpecies },
            { label: "Government", value: planetData.government },
            { label: "Culture", value: planetData.culture },
            { label: "Places of Note", value: planetData.placesOfNote },
            { label: "Ship Facilities", value: planetData.shipFacilities },
            { label: "Other Detail", value: planetData.otherDetail },
          ].filter((s) => s.value).map((s) => (
            <div key={s.label} style={{ marginBottom: "1rem", padding: "0.9rem 1.1rem", backgroundColor: "#0d0d0d", border: `1px solid ${colors.accent}18`, borderLeft: `3px solid ${colors.accent}`, borderRadius: "0 8px 0 0" }}>
              <p style={{ color: "#555", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.3rem" }}>{s.label}</p>
              <p style={{ color: "#ccc", fontSize: "0.88rem", lineHeight: "1.6", whiteSpace: "pre-wrap", margin: 0 }}>{s.value}</p>
            </div>
          ))}

          {/* Captain's Logs */}
          <div style={{ backgroundColor: "#111", border: "2px solid #6699cc", borderRadius: "0 30px 0 0", padding: "1.5rem", marginBottom: "2rem" }}>
            <h2 style={{ color: "#6699cc", fontSize: "0.85rem", letterSpacing: "2px", marginBottom: "1rem", textTransform: "uppercase" }}>Captain's Log Entries</h2>
            {planetData.logs?.map((log, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "1rem", padding: "0.75rem 0", borderBottom: idx < planetData.logs.length - 1 ? "1px solid #333" : "none" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#6699cc", marginTop: "0.5rem", flexShrink: 0 }} />
                <p style={{ color: "#aaa", margin: 0, lineHeight: "1.6", fontSize: "0.95rem" }}>{log}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <button onClick={openEdit} style={{ backgroundColor: `${colors.accent}20`, border: `1px solid ${colors.accent}`, borderRadius: "20px", color: colors.accent, fontFamily: "'Orbitron', sans-serif", fontSize: "0.65rem", fontWeight: "bold", letterSpacing: "1.5px", padding: "0.45rem 1.2rem", cursor: "pointer" }}>
              EDIT PLANET RECORD
            </button>
            {confirmDelete ? (
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ color: "#cc3333", fontSize: "0.7rem", letterSpacing: "1px" }}>CONFIRM DELETE?</span>
                <button onClick={handleDelete} disabled={deleting} style={{ backgroundColor: "#cc3333", border: "none", borderRadius: "20px", color: "#fff", fontFamily: "'Orbitron', sans-serif", fontSize: "0.65rem", fontWeight: "bold", letterSpacing: "1.5px", padding: "0.45rem 1.2rem", cursor: "pointer" }}>
                  {deleting ? "DELETING..." : "YES, DELETE"}
                </button>
                <button onClick={() => setConfirmDelete(false)} style={{ backgroundColor: "transparent", border: "1px solid #333", borderRadius: "20px", color: "#666", fontFamily: "'Orbitron', sans-serif", fontSize: "0.65rem", letterSpacing: "1.5px", padding: "0.45rem 1.2rem", cursor: "pointer" }}>
                  CANCEL
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} style={{ backgroundColor: "transparent", border: "1px solid #cc333360", borderRadius: "20px", color: "#cc3333", fontFamily: "'Orbitron', sans-serif", fontSize: "0.65rem", letterSpacing: "1.5px", padding: "0.45rem 1.2rem", cursor: "pointer" }}>
                DELETE PLANET RECORD
              </button>
            )}
          </div>
        </>
      )}

      {/* Bottom bar */}
      <div style={{ display: "flex", alignItems: "stretch", height: "45px" }}>
        <div style={{ width: "80px", backgroundColor: "#9933cc", borderRadius: "20px 0 0 20px" }} />
        <Link to="/" style={{ flex: 1, backgroundColor: colors.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: "bold", textDecoration: "none", letterSpacing: "2px", fontSize: "0.9rem" }}>
          RETURN TO STAR MAP
        </Link>
        <div style={{ width: "20px", backgroundColor: colors.accent, borderRadius: "0 20px 20px 0" }} />
      </div>
    </div>
  );
};

export default PlanetPage;
