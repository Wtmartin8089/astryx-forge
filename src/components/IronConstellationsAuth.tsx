import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { app } from "../firebase/firebaseConfig";

const auth = getAuth(app);

type Faction = "dominion" | "coalition" | null;
type Phase  = "form" | "processing" | "evaluation" | "assignment";

const FACTION_CONFIG: Record<NonNullable<Faction>, {
  line: string;
  glowColor: string;
  glowRgb: string;
  accentColor: string;
}> = {
  dominion: {
    line: "Dominion authority recognized. Compliance is expected.",
    glowColor: "#CC2222",
    glowRgb: "180,20,20",
    accentColor: "#E8A0A0",
  },
  coalition: {
    line: "Coalition alignment confirmed. You're part of the fight now.",
    glowColor: "#CC8820",
    glowRgb: "180,110,15",
    accentColor: "#E8C880",
  },
};

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export default function IronConstellationsAuth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const factionParam = searchParams.get("faction");
  const faction: Faction =
    factionParam === "dominion" || factionParam === "coalition" ? factionParam : null;
  const cfg = faction ? FACTION_CONFIG[faction] : null;

  // ── Form state ──────────────────────────────────────────────
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [mounted, setMounted] = useState(false);

  // ── Dominion evaluation flow ─────────────────────────────────
  const [phase, setPhase] = useState<Phase>("form");
  const [evalLine2, setEvalLine2] = useState(false);

  useEffect(() => {
    setMounted(false);
    const t = setTimeout(() => setMounted(true), 20);
    return () => clearTimeout(t);
  }, [isSignup]);

  // Reset evaluation state if user switches modes
  useEffect(() => {
    setPhase("form");
    setEvalLine2(false);
  }, [isSignup]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResetSent(false);

    if (isSignup && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // ── Dominion signup: evaluation flow ──────────────────────
    if (faction === "dominion" && isSignup) {
      setPhase("processing");
      try {
        await createUserWithEmailAndPassword(auth, email, password);
        // Ensure processing state is visible for at least 400ms
        await delay(400);
        setPhase("evaluation");
        await delay(350);
        setEvalLine2(true);
        await delay(950);
        setPhase("assignment");
      } catch (err: any) {
        setPhase("form");
        setError(err.message.replace(/^Firebase:\s*/i, "").replace(/\(auth\/.*?\)\.?/, "").trim());
      }
      return;
    }

    // ── All other paths: standard behavior ────────────────────
    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message.replace(/^Firebase:\s*/i, "").replace(/\(auth\/.*?\)\.?/, "").trim());
    }
  };

  const handleForgotPassword = async () => {
    if (!email) { setError("Enter your email above first."); return; }
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      setError("");
    } catch (err: any) {
      setError(err.message.replace(/^Firebase:\s*/i, "").replace(/\(auth\/.*?\)\.?/, "").trim());
    }
  };

  const isProcessing = phase === "processing";

  return (
    <div className="min-h-screen bg-[#07152B] flex items-center justify-center px-6 py-10 relative overflow-hidden">
      <style>{`
        @keyframes icGlowPulse {
          0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1);    }
          50%       { opacity: 0.9; transform: translate(-50%, -50%) scale(1.08); }
        }
        @keyframes icBtnPulse {
          0%, 100% { opacity: 1;   }
          50%       { opacity: 0.4; }
        }
        @keyframes icFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        .ic-eval-line {
          animation: icFadeUp 0.4s ease forwards;
        }
        .ic-assignment-enter {
          animation: icFadeUp 0.45s ease forwards;
        }
        .ic-auth-input {
          width: 100%;
          padding: 0.68rem 0.9rem;
          background: rgba(10, 28, 52, 0.8);
          border: 1px solid #1A3456;
          border-radius: 4px;
          color: #C8D8F0;
          font-size: 0.92rem;
          font-family: 'Segoe UI', sans-serif;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .ic-auth-input:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .ic-auth-input::placeholder { color: #2A4A6A; }
        .ic-auth-input:focus {
          border-color: ${cfg?.glowColor ?? "#F5B942"}60;
          box-shadow: 0 0 0 3px ${cfg?.glowColor ?? "#F5B942"}12;
        }
        .ic-submit-btn {
          width: 100%;
          padding: 0.75rem;
          border: none;
          border-radius: 4px;
          font-family: 'Orbitron', sans-serif;
          font-weight: 700;
          font-size: 0.78rem;
          letter-spacing: 2px;
          text-transform: uppercase;
          cursor: pointer;
          transition: opacity 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
          margin-top: 0.25rem;
          background: ${faction === "dominion"
            ? "linear-gradient(135deg, #7A1515, #CC2828)"
            : faction === "coalition"
            ? "linear-gradient(135deg, #7A5010, #CC8820)"
            : "linear-gradient(135deg, #F5B942, #FF6A2B)"};
          color: ${faction ? "#ffffff" : "#07152B"};
        }
        .ic-submit-btn:hover:not(:disabled) {
          opacity: 0.88;
          transform: translateY(-1px);
          box-shadow: 0 4px 18px ${cfg?.glowColor ?? "#F5B942"}38;
        }
        .ic-submit-btn:disabled {
          cursor: not-allowed;
          animation: icBtnPulse 1s ease-in-out infinite;
        }
        .ic-proceed-btn {
          display: inline-block;
          padding: 0.75rem 2.2rem;
          border: none;
          border-radius: 4px;
          font-family: 'Orbitron', sans-serif;
          font-weight: 700;
          font-size: 0.78rem;
          letter-spacing: 2px;
          text-transform: uppercase;
          cursor: pointer;
          background: linear-gradient(135deg, #7A1515, #CC2828);
          color: #ffffff;
          transition: opacity 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
        }
        .ic-proceed-btn:hover {
          opacity: 0.88;
          transform: translateY(-2px);
          box-shadow: 0 5px 22px rgba(180,20,20,0.35);
        }
        .ic-toggle-btn {
          background: none; border: none;
          color: #4A7AAA;
          font-family: 'Orbitron', sans-serif;
          font-size: 0.68rem; letter-spacing: 1.5px;
          cursor: pointer; text-transform: uppercase; padding: 0;
          transition: color 0.2s ease;
        }
        .ic-toggle-btn:hover { color: #C8D8F0; }
        .ic-forgot-btn {
          background: none; border: none;
          color: #3A5A80; font-size: 0.75rem;
          cursor: pointer; padding: 0;
          font-family: 'Segoe UI', sans-serif;
          transition: color 0.2s ease;
        }
        .ic-forgot-btn:hover { color: #8AAAD0; }
        .ic-eye-btn {
          position: absolute; right: 0.7rem; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          color: #2A4A6A; cursor: pointer;
          font-size: 1rem; padding: 0; line-height: 1;
          transition: color 0.2s ease;
        }
        .ic-eye-btn:hover { color: #8AAAD0; }
      `}</style>

      {/* Faction ambient glow */}
      {cfg && (
        <div
          className="pointer-events-none absolute z-0"
          style={{
            top: "50%", left: "50%",
            width: "700px", height: "400px",
            background: `radial-gradient(ellipse, rgba(${cfg.glowRgb},0.08) 0%, transparent 65%)`,
            animationName: "icGlowPulse",
            animationDuration: "6s",
            animationTimingFunction: "ease-in-out",
            animationIterationCount: "infinite",
          }}
        />
      )}

      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-[420px] bg-[#080F1E] rounded-lg px-9 py-10"
        style={{
          border: `1px solid ${cfg ? cfg.glowColor + "30" : "#1A3456"}`,
          boxShadow: cfg
            ? `0 0 60px rgba(${cfg.glowRgb},0.06), 0 0 0 1px #0D2240`
            : "0 0 60px rgba(7,21,43,0.9), 0 0 0 1px #0D2240",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.35s ease, transform 0.35s ease",
        }}
      >
        {/* Logo row — always visible */}
        <div className="flex items-center justify-center gap-2 mb-5">
          <svg width="22" height="22" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <linearGradient id="icAuthGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={cfg?.accentColor ?? "#F5B942"} />
                <stop offset="100%" stopColor={cfg?.glowColor ?? "#FF6A2B"} />
              </linearGradient>
            </defs>
            <polygon
              points="40,5 48,28 72,28 53,43 61,66 40,51 19,66 27,43 8,28 32,28"
              fill="url(#icAuthGrad)"
            />
          </svg>
          <span className="font-lcars text-[0.7rem] tracking-[3px] uppercase"
            style={{ color: cfg?.accentColor ?? "#F5B942" }}>
            Iron Constellations
          </span>
        </div>

        {/* ── ASSIGNMENT SCREEN (dominion post-evaluation) ─── */}
        {phase === "assignment" ? (
          <div className="ic-assignment-enter">
            {/* Header */}
            <p className="font-lcars text-[0.58rem] tracking-[2.5px] uppercase text-center mb-5"
               style={{ color: "#CC222288" }}>
              Assignment confirmed. You are now attached to active command structure.
            </p>

            <div className="h-px mb-5"
              style={{ background: "linear-gradient(90deg, transparent, #CC222230 50%, transparent)" }} />

            {/* Assignment data rows */}
            <div className="flex flex-col gap-3 mb-6">
              {[
                { label: "Designation",      value: email },
                { label: "Operational Role", value: "Command Officer" },
                { label: "Faction",          value: "Imperium Dominion" },
                { label: "Assigned Sector",  value: "Arclight Vesperon Verge" },
                { label: "Command Status",   value: "Active" },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-baseline gap-4
                  border-b border-[#0D1E30] pb-2">
                  <span className="font-lcars text-[0.58rem] tracking-[2px] uppercase text-[#3A2020]">
                    {row.label}
                  </span>
                  <span className="font-lcars text-[0.72rem] tracking-[1px] text-[#E8A0A0]
                    text-right truncate max-w-[220px]">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            <p className="font-lcars text-[0.56rem] tracking-[2px] uppercase text-center mb-6"
               style={{ color: "#CC222255" }}>
              Report to your assigned unit. Orders will follow.
            </p>

            <div className="text-center">
              <button
                className="ic-proceed-btn"
                onClick={() => navigate("/worlds/iron-constellations/command")}
              >
                Proceed to Command
              </button>
            </div>
          </div>

        ) : phase === "evaluation" ? (
          /* ── EVALUATION RESPONSE ───────────────────────────── */
          <div className="py-6 flex flex-col items-center gap-4">
            <p className="ic-eval-line font-lcars text-[0.7rem] tracking-[2px] uppercase text-center"
               style={{ color: "#CC222299" }}>
              Evaluation accepted. Command suitability within acceptable parameters.
            </p>
            {evalLine2 && (
              <p className="ic-eval-line font-lcars text-[0.72rem] tracking-[3px] uppercase text-center text-[#E8A0A0]">
                Assignment granted.
              </p>
            )}
          </div>

        ) : (
          /* ── FORM (default + processing) ──────────────────── */
          <>
            {/* Faction context line */}
            {cfg && (
              <p className="font-lcars text-[0.58rem] tracking-[2px] text-center uppercase mb-4"
                 style={{ color: cfg.glowColor + "99" }}>
                {cfg.line}
              </p>
            )}

            {/* Divider */}
            <div className="h-px mb-5"
              style={{ background: `linear-gradient(90deg, transparent, ${cfg?.glowColor ?? "#1A3456"}40 50%, transparent)` }}
            />

            {/* Dominion evaluation notice */}
            {faction === "dominion" && (
              <p className="font-lcars text-[0.56rem] tracking-[2px] uppercase text-center mb-3"
                 style={{ color: "#CC222255" }}>
                Candidate record incomplete. Submit for evaluation.
              </p>
            )}

            {/* Form title */}
            <h1 className="font-lcars text-[1.05rem] font-bold tracking-[3px] uppercase text-center text-[#C8D8F0] mb-5">
              {isSignup ? "Establish Identity" : "Access System"}
            </h1>

            <form onSubmit={handleSubmit} className="flex flex-col gap-0">
              {/* Email / Designation */}
              <div className="mb-4">
                <label className="block font-lcars text-[0.6rem] tracking-[2px] uppercase text-[#3A5A80] mb-[0.45rem]">
                  {faction === "dominion" ? "Designation" : "Email"}
                </label>
                <input
                  className="ic-auth-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="identity@astryxforge.com"
                  required
                  autoComplete="email"
                  disabled={isProcessing}
                />
              </div>

              {/* Password / Operational Role */}
              <div className="mb-4">
                <label className="block font-lcars text-[0.6rem] tracking-[2px] uppercase text-[#3A5A80] mb-[0.45rem]">
                  {faction === "dominion" ? "Operational Role" : "Password"}
                </label>
                <div className="relative">
                  <input
                    className="ic-auth-input"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Access code"
                    required
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    style={{ paddingRight: "2.4rem" }}
                    disabled={isProcessing}
                  />
                  <button type="button" className="ic-eye-btn" tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    disabled={isProcessing}>
                    {showPassword ? "○" : "●"}
                  </button>
                </div>
                {!isSignup && (
                  <div className="text-right mt-1">
                    <button type="button" className="ic-forgot-btn"
                      onClick={handleForgotPassword} disabled={isProcessing}>
                      Forgot access code?
                    </button>
                  </div>
                )}
              </div>

              {/* Confirm password (signup) */}
              {isSignup && (
                <div className="mb-4">
                  <label className="block font-lcars text-[0.6rem] tracking-[2px] uppercase text-[#3A5A80] mb-[0.45rem]">
                    Confirm Password
                  </label>
                  <input
                    className="ic-auth-input"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm access code"
                    required
                    autoComplete="new-password"
                    disabled={isProcessing}
                  />
                </div>
              )}

              {error && (
                <div className="bg-[rgba(200,60,60,0.08)] border border-[#5A2020] rounded text-[#CC7070] text-[0.82rem] px-3 py-2 mb-3 leading-snug">
                  {error}
                </div>
              )}
              {resetSent && (
                <div className="bg-[rgba(60,160,100,0.08)] border border-[#1A4A30] rounded text-[#70AA88] text-[0.82rem] px-3 py-2 mb-3 leading-snug">
                  Reset link transmitted. Check your inbox.
                </div>
              )}

              <button type="submit" className="ic-submit-btn" disabled={isProcessing}>
                {isProcessing
                  ? "Processing…"
                  : isSignup && faction === "dominion"
                  ? "Submit for Evaluation"
                  : isSignup
                  ? "Establish Identity"
                  : "Access System"}
              </button>
            </form>

            {/* Toggle */}
            {!isProcessing && (
              <div className="text-center mt-5 pt-5 border-t border-[#0D2240]">
                <button type="button" className="ic-toggle-btn"
                  onClick={() => { setIsSignup(!isSignup); setError(""); setResetSent(false); setConfirmPassword(""); }}>
                  {isSignup ? "Already have access? →" : "No identity yet? →"}
                </button>
              </div>
            )}

            {/* Faction tagline */}
            {!isProcessing && (
              <p className="font-lcars text-[0.55rem] tracking-[2.5px] uppercase text-center mt-4"
                 style={{ color: cfg ? cfg.glowColor + "50" : "#1A3456" }}>
                {faction === "dominion" ? "For order. For the Dominion."
                 : faction === "coalition" ? "For freedom. For the Coalition."
                 : "One identity. Multiple worlds."}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
