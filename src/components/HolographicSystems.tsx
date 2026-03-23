import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../assets/lcars.css";

const COLOR = "#00ccff";

const QUICK_REF = [
  "Flagship-exclusive experimental holoemitter grid — not standard across Starfleet",
  "Primary control: Engineering; Computer Core provides assistance only",
  "Command retains override authority during critical situations",
  "Default: Standard Mode — visual-only projections, no physical interaction",
  "Limited Interaction Mode requires Engineering authorization; non-combat only",
  "Emergency Override (full interaction) requires Command + Engineering approval",
  "High energy consumption when interaction is enabled; auto-fallback on power loss",
];

const HolographicSystems = () => {
  const [visible, setVisible] = useState(false);
  const [docExpanded, setDocExpanded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "2rem",
        fontFamily: "'Orbitron', sans-serif",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-30px)",
        transition: "opacity 0.5s ease-out, transform 0.5s ease-out",
      }}
    >
      {/* Breadcrumb */}
      <p style={{ color: "#555", fontSize: "0.65rem", letterSpacing: "2px", marginBottom: "1rem", textTransform: "uppercase" }}>
        <Link to="/" style={{ color: `${COLOR}60`, textDecoration: "none" }}>Star Map</Link>
        {" / "}
        <Link to="/reference" style={{ color: `${COLOR}60`, textDecoration: "none" }}>Reference</Link>
        {" / "}
        <span style={{ color: COLOR }}>Holographic Systems</span>
      </p>

      {/* Header bar */}
      <div style={{ display: "flex", alignItems: "stretch", marginBottom: "0.75rem", height: "56px" }}>
        <div style={{ width: "20px", backgroundColor: COLOR, borderRadius: "20px 0 0 0" }} />
        <div style={{ flex: 1, backgroundColor: COLOR, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2rem" }}>
          <h1 style={{ margin: 0, color: "#000", fontSize: "1.1rem", fontWeight: "bold", letterSpacing: "2px", textTransform: "uppercase" }}>
            Advanced Holographic Systems — USS King
          </h1>
          <span style={{ backgroundColor: "#00000020", borderRadius: "4px", color: "#00000080", fontSize: "0.55rem", letterSpacing: "2px", padding: "0.2rem 0.65rem", textTransform: "uppercase", fontWeight: "bold", whiteSpace: "nowrap" }}>
            RESTRICTED
          </span>
        </div>
        <div style={{ width: "80px", backgroundColor: "#9933cc", borderRadius: "0 20px 20px 0" }} />
      </div>

      {/* Subtitle strip */}
      <div style={{ backgroundColor: "#0a1219", border: `1px solid ${COLOR}20`, borderTop: "none", borderRadius: "0 0 8px 8px", padding: "0.6rem 2rem", marginBottom: "2rem" }}>
        <p style={{ margin: 0, color: `${COLOR}60`, fontSize: "0.65rem", letterSpacing: "3px", textTransform: "uppercase" }}>
          Experimental Systems Documentation — Authorized Personnel Only
        </p>
      </div>

      {/* Quick Reference — always visible */}
      <div style={{ backgroundColor: "#0a1219", border: `1px solid ${COLOR}30`, borderLeft: `4px solid ${COLOR}`, borderRadius: "0 8px 8px 0", padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <p style={{ margin: 0, color: `${COLOR}90`, fontSize: "0.6rem", letterSpacing: "3px", textTransform: "uppercase", fontWeight: "bold" }}>
            Quick Reference
          </p>
          <button
            onClick={() => setDocExpanded((v) => !v)}
            style={{
              backgroundColor: docExpanded ? "transparent" : COLOR,
              border: `1px solid ${COLOR}`,
              borderRadius: "20px",
              color: docExpanded ? COLOR : "#000",
              cursor: "pointer",
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "0.58rem",
              fontWeight: "bold",
              letterSpacing: "1.5px",
              padding: "0.3rem 0.9rem",
              textTransform: "uppercase",
              transition: "all 0.2s ease",
            }}
          >
            {docExpanded ? "Collapse Full Text" : "Expand Full Text"}
          </button>
        </div>
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {QUICK_REF.map((line, i) => (
            <li key={i} style={{ color: "#aaa", fontSize: "0.75rem", lineHeight: "1.9", display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
              <span style={{ color: COLOR, flexShrink: 0, marginTop: "0.1rem" }}>›</span>
              {line}
            </li>
          ))}
        </ul>
      </div>

      {/* Full document — expand/collapse */}
      <div style={{ display: "grid", gridTemplateRows: docExpanded ? "1fr" : "0fr", transition: "grid-template-rows 0.35s ease-in-out", overflow: "hidden" }}>
        <div style={{ minHeight: 0 }}>

          {/* Overview */}
          <div style={{ marginBottom: "2rem" }}>
            <SectionHeader label="System Overview" />
            <p style={{ color: "#bbb", fontSize: "0.82rem", lineHeight: 1.9, margin: "0 0 1rem" }}>
              The USS King utilizes an experimental distributed holoemitter grid, allowing limited deployment of holographic entities beyond standard medical and holodeck environments. Unlike conventional holographic technology confined to dedicated spaces, the King's grid enables projection across select corridors, briefing rooms, and operational areas.
            </p>
            <p style={{ color: "#bbb", fontSize: "0.82rem", lineHeight: 1.9, margin: 0 }}>
              Control of this system is managed primarily through Engineering, with support from the ship's Computer Core. Command retains override authority during critical situations. This system remains experimental and is not deployed across standard Starfleet vessels.
            </p>
          </div>

          {/* Control Hierarchy */}
          <div style={{ marginBottom: "2rem" }}>
            <SectionHeader label="Control Hierarchy" />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <HierarchyRow rank="Primary" label="Engineering" detail="Full operational control — activation, mode selection, and shutdown authority" color="#F5B942" />
              <HierarchyRow rank="Secondary" label="Computer Core" detail="Diagnostic assistance and automated stability monitoring only" color="#6699cc" />
              <HierarchyRow rank="Override" label="Command (Bridge / Fleet Command)" detail="Emergency authorization — supersedes Engineering control in crisis situations" color="#cc3333" />
            </div>
          </div>

          {/* Operational Modes */}
          <div style={{ marginBottom: "2rem" }}>
            <SectionHeader label="Operational Modes" />

            <ModePanel
              number="01"
              title="Standard Mode"
              subtitle="Default Operating State"
              color="#33cc99"
              requirements={null}
              details={[
                "Visual-only holographic projections — no physical interaction capability",
                "Suitable for command briefings and strategic planning displays",
                "Engineering diagnostic overlays and system visualization",
                "Medical assistance projections (informational, non-physical)",
                "Training simulations and crew development exercises",
              ]}
              note="Standard Mode is the default state. No special authorization required for activation."
            />

            <ModePanel
              number="02"
              title="Limited Interaction Mode"
              subtitle="Restricted Force-Field Interaction"
              color="#F5B942"
              requirements="Engineering authorization required"
              details={[
                "Restricted force-field interaction enabled within defined emitter zones",
                "Non-combat applications only — structural support, containment assists, medical stabilization",
                "Short-duration activation only; sustained use degrades emitter stability",
                "Emitter coverage limited to pre-designated operational areas",
              ]}
              note="Engineering must authorize and monitor all Limited Interaction activations. Duration is subject to power availability and system integrity assessment."
            />

            <ModePanel
              number="03"
              title="Emergency Override Mode"
              subtitle="Full Physical Interaction — High Impact"
              color="#cc3333"
              requirements="Command authorization + Engineering confirmation required"
              details={[
                "Full physical interaction enabled across available emitter coverage",
                "Tactical and critical crew support applications permitted",
                "Holographic constructs may perform physical tasks in lieu of crew under emergency conditions",
                "Maximum power draw — non-essential systems may be affected",
                "Automatic deactivation if power drops below stability threshold",
              ]}
              note="Emergency Override is a high-impact event. Both Command authorization and Engineering confirmation must be logged before activation. Treat all Emergency Override sessions as formal incident records."
            />
          </div>

          {/* System Limitations */}
          <div style={{ marginBottom: "2rem" }}>
            <SectionHeader label="System Limitations" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.75rem" }}>
              <LimitationCard icon="⚡" title="Power Consumption" text="Interaction modes draw significantly from primary power. Energy allocation must be balanced against propulsion, weapons, and shields." />
              <LimitationCard icon="📡" title="Limited Coverage" text="The emitter grid does not cover the full vessel. Active zones are restricted to pre-mapped corridors and designated spaces." />
              <LimitationCard icon="⚠️" title="Stability Degradation" text="System integrity declines under combat damage or sustained high-load operation. Degradation is progressive and may require manual reset." />
              <LimitationCard icon="🔄" title="Automatic Fallback" text="If power drops below threshold or system integrity is compromised, the grid automatically reverts to Standard Mode regardless of active authorization." />
            </div>
          </div>

          {/* Gameplay Rules */}
          <div style={{ marginBottom: "2.5rem" }}>
            <SectionHeader label="Operational Protocols" />
            <div style={{ backgroundColor: "#0d1a0d", border: "1px solid #33cc9930", borderLeft: "3px solid #33cc99", borderRadius: "0 4px 4px 0", padding: "1.25rem 1.5rem" }}>
              <p style={{ color: "#33cc9980", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", margin: "0 0 0.75rem" }}>Standing Orders — Engineering & Command</p>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {[
                  "Default usage must remain Standard Mode at all times unless operationally necessary",
                  "Physical interaction is rare and situational — not a routine operational tool",
                  "Holographic constructs must not replace or diminish crew roles and responsibilities",
                  "Emergency Override activations must be formally logged and reviewed post-mission",
                  "All mode changes above Standard must be verbally confirmed and recorded in the Engineering log",
                ].map((rule, i) => (
                  <li key={i} style={{ color: "#aaa", fontSize: "0.75rem", lineHeight: 1.9, display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                    <span style={{ color: "#33cc99", flexShrink: 0 }}>›</span>{rule}
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom nav */}
      <div style={{ display: "flex", alignItems: "stretch", height: "45px", marginTop: "1rem" }}>
        <div style={{ width: "80px", backgroundColor: "#9933cc", borderRadius: "20px 0 0 20px" }} />
        <Link
          to="/reference"
          style={{ flex: 1, backgroundColor: COLOR, display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: "bold", textDecoration: "none", letterSpacing: "2px", fontSize: "0.85rem" }}
        >
          RETURN TO REFERENCE LIBRARY
        </Link>
        <div style={{ width: "20px", backgroundColor: COLOR, borderRadius: "0 20px 20px 0" }} />
      </div>
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const SectionHeader = ({ label }: { label: string }) => (
  <div style={{ display: "flex", alignItems: "stretch", height: "40px", marginBottom: "1rem" }}>
    <div style={{ width: "16px", backgroundColor: COLOR, borderRadius: "16px 0 0 0" }} />
    <div style={{ flex: 1, backgroundColor: COLOR, display: "flex", alignItems: "center", padding: "0 1.25rem" }}>
      <h2 style={{ margin: 0, color: "#000", fontSize: "0.85rem", fontWeight: "bold", letterSpacing: "2.5px", textTransform: "uppercase" }}>
        {label}
      </h2>
    </div>
    <div style={{ width: "50px", backgroundColor: "#9933cc", borderRadius: "0 16px 16px 0" }} />
  </div>
);

const HierarchyRow = ({ rank, label, detail, color }: { rank: string; label: string; detail: string; color: string }) => (
  <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", backgroundColor: "#0d0d0d", border: `1px solid ${color}30`, borderLeft: `3px solid ${color}`, borderRadius: "0 4px 4px 0", padding: "0.75rem 1rem" }}>
    <div style={{ flexShrink: 0, minWidth: "90px" }}>
      <span style={{ color: `${color}80`, fontSize: "0.55rem", letterSpacing: "2px", textTransform: "uppercase", display: "block" }}>{rank}</span>
      <span style={{ color, fontSize: "0.75rem", fontWeight: "bold", letterSpacing: "1px" }}>{label}</span>
    </div>
    <p style={{ margin: 0, color: "#888", fontSize: "0.72rem", lineHeight: 1.7 }}>{detail}</p>
  </div>
);

const ModePanel = ({ number, title, subtitle, color, requirements, details, note }: {
  number: string; title: string; subtitle: string; color: string;
  requirements: string | null; details: string[]; note: string;
}) => (
  <div style={{ backgroundColor: "#0d0d0d", border: `1px solid ${color}30`, borderRadius: "4px", marginBottom: "1rem", overflow: "hidden" }}>
    <div style={{ backgroundColor: `${color}15`, borderBottom: `1px solid ${color}30`, padding: "0.75rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
      <span style={{ color: `${color}60`, fontSize: "0.7rem", fontWeight: "bold", letterSpacing: "2px" }}>MODE {number}</span>
      <span style={{ color, fontSize: "0.82rem", fontWeight: "bold", letterSpacing: "1px" }}>{title}</span>
      <span style={{ color: "#555", fontSize: "0.65rem", letterSpacing: "1px" }}>{subtitle}</span>
      {requirements && (
        <span style={{ backgroundColor: `${color}20`, border: `1px solid ${color}50`, borderRadius: "20px", color, fontSize: "0.58rem", letterSpacing: "1px", marginLeft: "auto", padding: "0.2rem 0.65rem", textTransform: "uppercase", whiteSpace: "nowrap" }}>
          {requirements}
        </span>
      )}
    </div>
    <div style={{ padding: "0.9rem 1.25rem" }}>
      <ul style={{ margin: "0 0 0.75rem", padding: 0, listStyle: "none" }}>
        {details.map((d, i) => (
          <li key={i} style={{ color: "#aaa", fontSize: "0.75rem", lineHeight: 1.8, display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
            <span style={{ color: `${color}80`, flexShrink: 0 }}>›</span>{d}
          </li>
        ))}
      </ul>
      <p style={{ margin: 0, color: "#555", fontSize: "0.65rem", lineHeight: 1.7, fontStyle: "italic", borderTop: `1px solid ${color}15`, paddingTop: "0.65rem" }}>
        {note}
      </p>
    </div>
  </div>
);

const LimitationCard = ({ icon, title, text }: { icon: string; title: string; text: string }) => (
  <div style={{ backgroundColor: "#0d0d0d", border: "1px solid #ffffff10", borderRadius: "4px", padding: "0.9rem 1rem" }}>
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
      <span style={{ fontSize: "0.85rem" }}>{icon}</span>
      <span style={{ color: "#ccc", fontSize: "0.72rem", fontWeight: "bold", letterSpacing: "1px", textTransform: "uppercase" }}>{title}</span>
    </div>
    <p style={{ margin: 0, color: "#777", fontSize: "0.72rem", lineHeight: 1.7 }}>{text}</p>
  </div>
);

export default HolographicSystems;
