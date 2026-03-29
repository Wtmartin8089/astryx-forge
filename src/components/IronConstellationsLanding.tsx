import { Link } from "react-router-dom";
import Header from "./Header";

export default function IronConstellationsLanding() {
  return (
    <div className="min-h-screen bg-[#060810] text-white font-sans overflow-hidden relative">
      <style>{`
        @keyframes ambientRed {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.7; }
        }
        @keyframes ambientAmber {
          0%, 100% { opacity: 0.3; }
          50%       { opacity: 0.55; }
        }
        @keyframes conflictBlink {
          0%, 90%, 100% { opacity: 1;   }
          92%            { opacity: 0.2; }
          94%            { opacity: 1;   }
          96%            { opacity: 0.4; }
          98%            { opacity: 1;   }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .ic-page-enter { animation: fadeUp 0.5s ease forwards; }
        .conflict-text { animation: conflictBlink 9s linear infinite; }
      `}</style>

      {/* Dual ambient glows — one per faction bleeds in from sides */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 60% at 10% 50%, rgba(180,20,20,0.07) 0%, transparent 100%)",
          animationName: "ambientRed",
          animationDuration: "7s",
          animationTimingFunction: "ease-in-out",
          animationIterationCount: "infinite",
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 60% at 90% 50%, rgba(180,100,10,0.07) 0%, transparent 100%)",
          animationName: "ambientAmber",
          animationDuration: "7s",
          animationTimingFunction: "ease-in-out",
          animationIterationCount: "infinite",
          animationDelay: "0.8s",
        }}
      />

      <div className="relative z-10">
        <Header />

        {/* ── Status bar ─────────────────────────────── */}
        <div className="flex items-center justify-center gap-3 px-6 py-2 bg-[#030508] border-b border-[#0D1520]">
          <span
            className="w-[6px] h-[6px] rounded-full bg-red-600 shadow-[0_0_6px_#CC2222] flex-shrink-0 conflict-text"
          />
          <span className="font-lcars text-[0.55rem] tracking-[3px] text-[#3A2020] uppercase conflict-text">
            Conflict active · All sectors
          </span>
        </div>

        {/* ── Hero ───────────────────────────────────── */}
        <section className="ic-page-enter text-center px-6 pt-14 pb-10">
          <p className="font-lcars text-[0.6rem] tracking-[4px] text-[#3A3020] uppercase mb-6">
            World · Iron Constellations
          </p>
          <h1 className="font-lcars font-bold leading-tight tracking-wide max-w-2xl mx-auto"
            style={{ fontSize: "clamp(1.4rem, 3.5vw, 2.3rem)" }}
          >
            <span className="text-white">The galaxy is breaking apart.</span>
            <br />
            <span className="text-white/35">
              Where you stand will decide what remains.
            </span>
          </h1>
          <p className="font-lcars text-[0.62rem] tracking-[3px] text-white/20 uppercase mt-6">
            Conflict is active across all sectors.
          </p>
        </section>

        {/* ── Faction Selection ──────────────────────── */}
        <section className="px-5 pb-20 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* ── Imperium Dominion ── */}
            <Link
              to="/worlds/iron-constellations/authorize?faction=dominion"
              className="group relative flex flex-col bg-[#090608] border border-[#3A1212]
                         rounded-lg p-8 cursor-pointer no-underline
                         transition-all duration-300 ease-out
                         hover:border-[#882222] hover:shadow-[0_0_50px_rgba(180,20,20,0.14)]
                         hover:scale-[1.015] hover:-translate-y-1"
            >
              {/* top accent bar */}
              <div className="w-12 h-[2px] bg-gradient-to-r from-[#8B1A1A] to-[#CC3333] mb-6
                              transition-all duration-300 group-hover:w-20" />

              <p className="font-lcars text-[0.6rem] tracking-[3px] text-[#7A2020] uppercase mb-4">
                Faction I
              </p>

              <h2 className="font-lcars text-xl font-bold text-[#E8A0A0] tracking-widest mb-5">
                Imperium Dominion
              </h2>

              <p className="text-[#8A7070] text-sm leading-relaxed mb-3">
                A vast, iron-willed regime that believes order is the only
                path to survival.
              </p>
              <p className="text-[#6A5050] text-sm leading-relaxed mb-6 flex-grow">
                Citizens call it stability. Rebels call it oppression.
              </p>

              <p className="font-lcars text-[0.72rem] tracking-[2.5px] text-[#CC4444] uppercase mb-8">
                Power.&nbsp; Precision.&nbsp; Control.
              </p>

              <div className="w-full py-3 px-6 rounded
                              bg-gradient-to-r from-[#5A1010] to-[#8B2222]
                              border border-[#CC333340]
                              font-lcars text-[0.72rem] tracking-[2px] uppercase text-center
                              text-[#FFAAAA]
                              transition-all duration-200
                              group-hover:from-[#7A1515] group-hover:to-[#AA2828]
                              group-hover:border-[#CC3333] group-hover:text-white
                              group-hover:shadow-[0_0_20px_rgba(200,30,30,0.3)]">
                Join the Imperium Dominion
              </div>
            </Link>

            {/* ── Outer Rim Coalition ── */}
            <Link
              to="/worlds/iron-constellations/authorize?faction=coalition"
              className="group relative flex flex-col bg-[#090806] border border-[#3A2810]
                         rounded-lg p-8 cursor-pointer no-underline
                         transition-all duration-300 ease-out
                         hover:border-[#7A5518] hover:shadow-[0_0_50px_rgba(180,110,15,0.14)]
                         hover:scale-[1.015] hover:-translate-y-1"
            >
              {/* top accent bar */}
              <div className="w-12 h-[2px] bg-gradient-to-r from-[#7A5010] to-[#CC8820] mb-6
                              transition-all duration-300 group-hover:w-20" />

              <p className="font-lcars text-[0.6rem] tracking-[3px] text-[#7A5520] uppercase mb-4">
                Faction II
              </p>

              <h2 className="font-lcars text-xl font-bold text-[#E8C880] tracking-widest mb-5">
                Outer Rim Coalition
              </h2>

              <p className="text-[#8A7850] text-sm leading-relaxed mb-3">
                A loose alliance of frontier worlds bound by one belief: the
                galaxy belongs to everyone.
              </p>
              <p className="text-[#6A5A38] text-sm leading-relaxed mb-6 flex-grow">
                Built on grit, ingenuity, and defiance.
              </p>

              <p className="font-lcars text-[0.72rem] tracking-[2.5px] text-[#CC9930] uppercase mb-8">
                Freedom.&nbsp; Adaptation.&nbsp; Survival.
              </p>

              <div className="w-full py-3 px-6 rounded
                              bg-gradient-to-r from-[#5A3A08] to-[#8B6015]
                              border border-[#CC882040]
                              font-lcars text-[0.72rem] tracking-[2px] uppercase text-center
                              text-[#FFD888]
                              transition-all duration-200
                              group-hover:from-[#7A5010] group-hover:to-[#AA7A20]
                              group-hover:border-[#CC8820] group-hover:text-white
                              group-hover:shadow-[0_0_20px_rgba(200,130,20,0.3)]">
                Stand with the Coalition
              </div>
            </Link>

          </div>

          {/* tension line between panels */}
          <p className="font-lcars text-[0.58rem] tracking-[3px] text-white/10 text-center mt-8"
             style={{ fontStyle: "normal", letterSpacing: "0.15em" }}>
            Your choice will define you.
          </p>
        </section>

        <footer className="border-t border-[#0D1520] py-4 text-center">
          <span className="font-lcars text-[0.62rem] tracking-[2px] text-[#1A2030] uppercase">
            © 2026 Astryx Forge · Iron Constellations
          </span>
        </footer>
      </div>
    </div>
  );
}
