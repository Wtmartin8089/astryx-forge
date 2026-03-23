import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { getCampaignStardate } from "../utils/campaignStardate";
import "../assets/lcars.css";

interface SectionDef {
  id: string;
  label: string;
}

const sections: SectionDef[] = [
  { id: "preamble", label: "Preamble" },
  { id: "chapter-1", label: "Chapter I — The Federation" },
  { id: "chapter-2", label: "Chapter II — Fundamental Rights" },
  { id: "chapter-3", label: "Chapter III — The Council" },
  { id: "chapter-4", label: "Chapter IV — The President" },
  { id: "chapter-5", label: "Chapter V — The Judiciary" },
  { id: "chapter-6", label: "Chapter VI — Starfleet Command" },
  { id: "chapter-7", label: "Chapter VII — Membership" },
  { id: "chapter-8", label: "Chapter VIII — Amendments" },
];

interface ChapterHeaderProps {
  num: string;
  title: string;
}

const ChapterHeader = ({ num, title }: ChapterHeaderProps) => (
  <div
    style={{
      display: "flex",
      alignItems: "stretch",
      height: "44px",
      marginBottom: "1.5rem",
      marginTop: "2.5rem",
    }}
  >
    <div
      style={{
        width: "20px",
        backgroundColor: "#FF9C00",
        borderRadius: "20px 0 0 0",
      }}
    />
    <div
      style={{
        flex: 1,
        backgroundColor: "#FF9C00",
        display: "flex",
        alignItems: "center",
        padding: "0 1.5rem",
      }}
    >
      <h2
        style={{
          margin: 0,
          color: "#000",
          fontSize: "1rem",
          fontWeight: "bold",
          letterSpacing: "3px",
          textTransform: "uppercase",
        }}
      >
        Chapter {num} — {title}
      </h2>
    </div>
    <div
      style={{
        width: "60px",
        backgroundColor: "#9933cc",
        borderRadius: "0 20px 20px 0",
      }}
    />
  </div>
);

interface ArticlePanelProps {
  num: number;
  text: string;
  isFirst?: boolean;
}

const ArticlePanel = ({ num, text, isFirst }: ArticlePanelProps) => (
  <div
    style={{
      backgroundColor: isFirst ? "#141c2a" : "#111",
      border: `1px solid ${isFirst ? "#6699cc40" : "#6699cc20"}`,
      borderLeft: `${isFirst ? "4px" : "3px"} solid ${isFirst ? "#FF9C00" : "#6699cc"}`,
      borderRadius: "0 8px 8px 0",
      padding: "1.25rem 1.5rem",
      marginBottom: "1rem",
    }}
  >
    <p
      style={{
        color: isFirst ? "#FF9C00" : "#6699cc",
        fontSize: "0.65rem",
        letterSpacing: "2px",
        textTransform: "uppercase",
        marginBottom: "0.5rem",
        marginTop: 0,
      }}
    >
      Article {num}
    </p>
    <p
      style={{
        color: isFirst ? "#e8e8e8" : "#ccc",
        fontSize: "0.9rem",
        lineHeight: "1.8",
        margin: 0,
      }}
    >
      {text}
    </p>
  </div>
);


const FLAVOR_LINES = [
  "> COMPUTER: Accessing UFP Archive Database...",
  "> COMPUTER: Authorization confirmed. Federation Charter retrieved.",
  "> COMPUTER: Displaying document. All articles loaded.",
];

const QUICK_REF = [
  "Peaceful democratic union — each member world retains full sovereignty in internal matters",
  "All citizens: equal rights, liberty, security of person; no arbitrary arrest or exile",
  "Freedom of thought, expression, and peaceful assembly guaranteed to all citizens",
  "Federation Council: one vote per member world; 2/3 majority for amendments, emergency powers, and new admissions",
  "President: popularly elected, 4-year term (max 2 consecutive); civilian Commander-in-Chief of Starfleet",
  "Supreme Court: 7+ justices, lifetime appointment; final jurisdiction over all Federation law",
  "Starfleet mandate: exploration, defense, humanitarian aid — not to be used against member worlds or their citizens",
  "Membership: requires unified government, peaceful intent, and free consent of the governed; 2/3 Council vote to admit",
  "Amendments require 2/3 Council + ratification by 3/4 of member worlds; Fundamental Rights (Chapter II) cannot be amended away",
];

const ArticlesOfFederation = () => {
  const [visible, setVisible] = useState(false);
  const [activeSection, setActiveSection] = useState("preamble");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [flavorIndex, setFlavorIndex] = useState(0);
  const [docExpanded, setDocExpanded] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const stardate = getCampaignStardate();

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (flavorIndex >= FLAVOR_LINES.length - 1) return;
    const t = setTimeout(() => setFlavorIndex((i) => i + 1), 900);
    return () => clearTimeout(t);
  }, [flavorIndex]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );

    sections.forEach((sec) => {
      const el = document.getElementById(sec.id);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const sidebar = (
    <div
      style={{
        width: "240px",
        flexShrink: 0,
        backgroundColor: "#0d1420",
        borderRight: "1px solid #ffcc3320",
        position: "sticky",
        top: "0",
        maxHeight: "100vh",
        overflowY: "auto",
        padding: "1.5rem 0",
        alignSelf: "flex-start",
      }}
    >
      {/* Sidebar header */}
      <div style={{ padding: "0 1.25rem", marginBottom: "1.25rem", borderBottom: "1px solid #ffcc3318", paddingBottom: "1rem" }}>
        <p style={{ color: "#ffcc33", fontSize: "0.6rem", letterSpacing: "3px", textTransform: "uppercase", margin: "0 0 0.75rem" }}>
          Archive Index
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          <span style={{ color: "#33cc99", fontSize: "0.55rem", letterSpacing: "1.5px", textTransform: "uppercase" }}>
            ● STATUS: ACTIVE
          </span>
          <span style={{ color: "#6699cc", fontSize: "0.55rem", letterSpacing: "1.5px", textTransform: "uppercase" }}>
            ◆ ACCESS: AUTHORIZED
          </span>
          <span style={{ color: "#555", fontSize: "0.55rem", letterSpacing: "1px" }}>
            SD: {stardate}
          </span>
        </div>
      </div>
      {sections.map((sec) => (
        <button
          key={sec.id}
          onClick={() => scrollTo(sec.id)}
          style={{
            display: "block",
            width: "100%",
            textAlign: "left",
            background: activeSection === sec.id ? "#ffcc3315" : "transparent",
            border: "none",
            borderLeft: `3px solid ${activeSection === sec.id ? "#ffcc33" : "transparent"}`,
            color: activeSection === sec.id ? "#ffcc33" : "#555",
            cursor: "pointer",
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "0.6rem",
            letterSpacing: "1px",
            lineHeight: "1.5",
            padding: "0.6rem 1.25rem",
            textTransform: "uppercase",
            transition: "color 0.2s, background 0.2s",
          }}
        >
          {sec.label}
        </button>
      ))}
    </div>
  );

  const mobilePills = (
    <div
      style={{
        display: "flex",
        overflowX: "auto",
        gap: "0.5rem",
        padding: "0.75rem 0",
        marginBottom: "1.5rem",
        scrollbarWidth: "none",
      }}
    >
      {sections.map((sec) => (
        <button
          key={sec.id}
          onClick={() => scrollTo(sec.id)}
          style={{
            backgroundColor: activeSection === sec.id ? "#ffcc33" : "#111",
            border: `1px solid ${activeSection === sec.id ? "#ffcc33" : "#333"}`,
            borderRadius: "20px",
            color: activeSection === sec.id ? "#000" : "#666",
            cursor: "pointer",
            flexShrink: 0,
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "0.55rem",
            letterSpacing: "1px",
            padding: "0.4rem 0.9rem",
            textTransform: "uppercase",
            transition: "all 0.2s",
          }}
        >
          {sec.label}
        </button>
      ))}
    </div>
  );

  const content = (
    <div style={{ flex: 1, minWidth: 0, padding: isMobile ? "0" : "0 0 0 2.5rem" }}>
      {isMobile && mobilePills}

      {/* System status bar */}
      <div style={{ backgroundColor: "#0a0f1a", border: "1px solid #ffcc3318", borderRadius: "6px", padding: "0.5rem 1rem", marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
          <span style={{ color: "#555", fontSize: "0.55rem", letterSpacing: "1.5px", textTransform: "uppercase" }}>
            <span style={{ color: "#ffcc3360" }}>NODE</span> STARBASE MACHIDA
          </span>
          <span style={{ color: "#555", fontSize: "0.55rem", letterSpacing: "1.5px", textTransform: "uppercase" }}>
            <span style={{ color: "#ffcc3360" }}>DATABASE</span> UFP ARCHIVE — FOUNDING DOCUMENTS
          </span>
          <span style={{ color: "#555", fontSize: "0.55rem", letterSpacing: "1.5px", textTransform: "uppercase" }}>
            <span style={{ color: "#ffcc3360" }}>STARDATE</span> {stardate}
          </span>
        </div>
        <span style={{ color: "#33cc99", fontSize: "0.55rem", letterSpacing: "2px", textTransform: "uppercase" }}>
          ● ONLINE
        </span>
      </div>

      {/* Breadcrumb */}
      <p
        style={{
          color: "#555",
          fontSize: "0.65rem",
          letterSpacing: "2px",
          marginBottom: "1rem",
          textTransform: "uppercase",
        }}
      >
        <Link to="/" style={{ color: "#ffcc3380", textDecoration: "none" }}>
          Star Map
        </Link>
        {" / "}
        <Link to="/reference" style={{ color: "#ffcc3380", textDecoration: "none" }}>
          Reference
        </Link>
        {" / "}
        <span style={{ color: "#ffcc33" }}>Articles of the Federation</span>
      </p>

      {/* Header bar */}
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          marginBottom: "0.75rem",
          height: "56px",
        }}
      >
        <div
          style={{
            width: "20px",
            backgroundColor: "#ffcc33",
            borderRadius: "20px 0 0 0",
          }}
        />
        <div
          style={{
            flex: 1,
            backgroundColor: "#ffcc33",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 2rem",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                color: "#000",
                fontSize: "1.25rem",
                fontWeight: "bold",
                letterSpacing: "3px",
                textTransform: "uppercase",
              }}
            >
              Articles of the Federation
            </h1>
            <p
              style={{
                margin: 0,
                color: "#00000060",
                fontSize: "0.6rem",
                letterSpacing: "2px",
                textTransform: "uppercase",
              }}
            >
              Federation Archive Access — UFP Founding Charter
            </p>
          </div>
          <span
            style={{
              backgroundColor: "#00000020",
              borderRadius: "4px",
              color: "#000",
              fontSize: "0.55rem",
              fontWeight: "bold",
              letterSpacing: "1.5px",
              padding: "0.25rem 0.65rem",
            }}
          >
            DECLASSIFIED
          </span>
        </div>
        <div
          style={{
            width: "80px",
            backgroundColor: "#9933cc",
            borderRadius: "0 20px 20px 0",
          }}
        />
      </div>

      {/* Subtitle strip */}
      <div
        style={{
          backgroundColor: "#121826",
          border: "1px solid #ffcc3320",
          borderTop: "none",
          borderRadius: "0 0 8px 8px",
          padding: "0.5rem 2rem",
          marginBottom: "2.5rem",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "#ffcc3350",
            fontSize: "0.6rem",
            letterSpacing: "2px",
            textTransform: "uppercase",
          }}
        >
          United Federation of Planets — Office of the President — Founding Charter
        </p>
      </div>

      {/* Flavor text terminal */}
      <div style={{ backgroundColor: "#080d18", border: "1px solid #6699cc15", borderRadius: "4px", padding: "0.75rem 1rem", marginBottom: "2rem", fontFamily: "monospace" }}>
        {FLAVOR_LINES.slice(0, flavorIndex + 1).map((line, i) => (
          <p key={i} style={{ color: i === flavorIndex ? "#6699cc" : "#6699cc50", fontSize: "0.72rem", margin: i === 0 ? 0 : "0.2rem 0 0", letterSpacing: "0.5px" }}>
            {line}{i === flavorIndex ? <span style={{ animation: "none", opacity: 0.7 }}>█</span> : ""}
          </p>
        ))}
      </div>

      {/* Quick Reference Panel */}
      <div
        style={{
          backgroundColor: "#0d1520",
          border: "1px solid #6699cc30",
          borderLeft: "4px solid #6699cc",
          borderRadius: "0 8px 8px 0",
          padding: "1.25rem 1.5rem",
          marginBottom: "1.25rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "0.75rem",
          }}
        >
          <p
            style={{
              color: "#6699cc",
              fontSize: "0.6rem",
              letterSpacing: "2.5px",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            Quick Reference — Articles of the Federation
          </p>
          <button
            onClick={() => setDocExpanded((v) => !v)}
            style={{
              backgroundColor: docExpanded ? "transparent" : "#6699cc",
              border: "1px solid #6699cc",
              borderRadius: "4px",
              color: docExpanded ? "#6699cc" : "#000",
              cursor: "pointer",
              flexShrink: 0,
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "0.6rem",
              fontWeight: "bold",
              letterSpacing: "1.5px",
              marginLeft: "1rem",
              padding: "0.3rem 0.75rem",
              textTransform: "uppercase",
              transition: "background 0.2s, color 0.2s",
            }}
          >
            {docExpanded ? "Collapse Full Text" : "Expand Full Text"}
          </button>
        </div>
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {QUICK_REF.map((line, i) => (
            <li
              key={i}
              style={{
                color: "#aaa",
                fontSize: "0.82rem",
                lineHeight: "1.8",
                display: "flex",
                gap: "0.5rem",
                alignItems: "flex-start",
              }}
            >
              <span style={{ color: "#6699cc80", flexShrink: 0, marginTop: "0.1rem" }}>›</span>
              {line}
            </li>
          ))}
        </ul>
      </div>

      {/* Full Document — collapsible */}
      <div
        style={{
          display: "grid",
          gridTemplateRows: docExpanded ? "1fr" : "0fr",
          transition: "grid-template-rows 0.35s ease-in-out",
          overflow: "hidden",
        }}
      >
      <div style={{ minHeight: 0 }}>

      {/* PREAMBLE */}
      <div id="preamble">
        <div
          style={{
            backgroundColor: "#111",
            border: "1px solid #ffcc3320",
            borderLeft: "4px solid #ffcc33",
            borderRadius: "0 8px 8px 0",
            padding: "1.5rem 2rem",
            marginBottom: "2rem",
          }}
        >
          <p
            style={{
              color: "#ffcc3380",
              fontSize: "0.65rem",
              letterSpacing: "2px",
              textTransform: "uppercase",
              marginBottom: "1rem",
              marginTop: 0,
            }}
          >
            Preamble
          </p>
          <p
            style={{
              color: "#ddd",
              fontSize: "1rem",
              lineHeight: "2",
              fontStyle: "italic",
              margin: 0,
            }}
          >
            We, the sentient peoples of the United Federation of Planets, determined to save
            succeeding generations from the scourge of war, to reaffirm faith in the fundamental
            rights of all sentient beings, in the dignity and worth of all life, in the equal
            rights of citizens of all member worlds, and to establish conditions under which
            justice and respect for the obligations arising from treaties and other sources of
            interstellar law can be maintained, and to promote social progress and better
            standards of life in larger freedom, and for these ends, to practice tolerance and
            coexistence as good neighbors, to unite our strength to maintain interstellar peace
            and security, to ensure by the acceptance of principles and the institution of methods
            that armed force shall not be used, save in the common interest, and to employ
            interstellar institutions for the promotion of the economic and social advancement of
            all peoples, have resolved to combine our efforts to accomplish these aims.
          </p>
        </div>
      </div>

      {/* CHAPTER I */}
      <div id="chapter-1">
        <ChapterHeader num="I" title="The United Federation of Planets" />
        <ArticlePanel
          num={1}
          isFirst
          text="The United Federation of Planets is established as a democratic union of sovereign worlds, dedicated to the principles of universal liberty, rights, and equality, and committed to the peaceful coexistence of all sentient species."
        />
        <ArticlePanel
          num={2}
          text="The Federation shall seek to maintain interstellar peace and security, to develop friendly relations among worlds, and to achieve interstellar cooperation in solving problems of an economic, social, cultural, or humanitarian character."
        />
        <ArticlePanel
          num={3}
          text="All member worlds retain their sovereignty, territorial integrity, and the right to self-governance in matters not delegated to the Federation under these Articles."
        />
        <ArticlePanel
          num={4}
          text="The Federation shall be guided by the principles of non-interference in the internal affairs of non-member worlds, save where fundamental rights are being violated on a mass scale."
        />
        <ArticlePanel
          num={5}
          text="The official languages of the Federation Council shall be determined by the Council, with Universal Translation provided as a right of all members."
        />
      </div>

      {/* CHAPTER II */}
      <div id="chapter-2">
        <ChapterHeader num="II" title="Fundamental Rights of Citizens" />
        <ArticlePanel
          num={6}
          isFirst
          text="All citizens of member worlds are equal before the law and are entitled, without distinction, to equal protection under Federation law."
        />
        <ArticlePanel
          num={7}
          text="Every citizen of the Federation has the right to life, liberty, and security of person. No one shall be subjected to arbitrary arrest, detention, or exile."
        />
        <ArticlePanel
          num={8}
          text="Every citizen has the right to freedom of thought, conscience, and belief. No citizen shall be compelled to hold or renounce any religious, philosophical, or cultural conviction."
        />
        <ArticlePanel
          num={9}
          text="Every citizen has the right to freedom of expression and peaceful assembly. The Federation Council may only restrict these rights in circumstances of imminent and documented threat to public safety."
        />
        <ArticlePanel
          num={10}
          text="Every citizen of the Federation retains all rights recognized in these Articles regardless of species, planet of origin, gender, biological composition, or means of cognitive function."
        />
      </div>

      {/* CHAPTER III */}
      <div id="chapter-3">
        <ChapterHeader num="III" title="The Federation Council" />
        <ArticlePanel
          num={11}
          isFirst
          text="The Federation Council shall be the principal legislative body of the Federation, composed of representatives from each member world."
        />
        <ArticlePanel
          num={12}
          text="Each member world shall be entitled to one vote in the Federation Council. Weighted voting on matters of resource allocation shall be determined by Council resolution."
        />
        <ArticlePanel
          num={13}
          text="The Council shall meet in regular session no fewer than four times per standard year. Extraordinary sessions may be called by the Federation President or by petition of one-third of member worlds."
        />
        <ArticlePanel
          num={14}
          text="Decisions of the Council on matters of ordinary legislation shall be made by simple majority. Amendments to these Articles, declarations of emergency, and admission of new members shall require a two-thirds majority."
        />
        <ArticlePanel
          num={15}
          text="The Council shall have the power to enact legislation binding upon all member worlds in matters of interstellar commerce, communication, scientific research conducted in Federation space, and the conduct of Starfleet."
        />
      </div>

      {/* CHAPTER IV */}
      <div id="chapter-4">
        <ChapterHeader num="IV" title="The President of the Federation" />
        <ArticlePanel
          num={16}
          isFirst
          text="The executive power of the Federation shall be vested in a President, elected by direct popular vote of all Federation citizens."
        />
        <ArticlePanel
          num={17}
          text="The President shall serve a term of four standard years and may be re-elected to a maximum of two consecutive terms."
        />
        <ArticlePanel
          num={18}
          text="The President shall serve as Commander-in-Chief of Starfleet in matters of policy, subject to the oversight of the Federation Council."
        />
        <ArticlePanel
          num={19}
          text="The President shall have the power to negotiate treaties, appoint ambassadors, and conduct the foreign affairs of the Federation, subject to Council ratification of all treaties."
        />
        <ArticlePanel
          num={20}
          text="In the event of incapacitation of the President, the President Pro Tempore of the Federation Council shall assume the duties of the office until the President recovers or a special election is held."
        />
      </div>

      {/* CHAPTER V */}
      <div id="chapter-5">
        <ChapterHeader num="V" title="The Federation Judiciary" />
        <ArticlePanel
          num={21}
          isFirst
          text="There shall be a Federation Supreme Court, composed of no fewer than seven justices appointed by the President and confirmed by the Federation Council."
        />
        <ArticlePanel
          num={22}
          text="The Supreme Court shall have final jurisdiction over all matters of Federation law, disputes between member worlds, and challenges to the constitutionality of Federation legislation."
        />
        <ArticlePanel
          num={23}
          text="Justices of the Supreme Court shall serve for life, subject to removal only by a three-fourths vote of the Federation Council following a formal inquiry."
        />
        <ArticlePanel
          num={24}
          text="All citizens of the Federation and all member worlds shall have the right to bring suit before the Federation judiciary."
        />
      </div>

      {/* CHAPTER VI */}
      <div id="chapter-6">
        <ChapterHeader num="VI" title="Starfleet Command" />
        <ArticlePanel
          num={25}
          isFirst
          text="Starfleet shall serve as the combined defense, exploration, and humanitarian arm of the United Federation of Planets."
        />
        <ArticlePanel
          num={26}
          text="The primary mission of Starfleet shall be the peaceful exploration of the universe, the defense of Federation space, and the rendering of humanitarian aid to any world in need."
        />
        <ArticlePanel
          num={27}
          text="Starfleet shall operate under the authority of the President of the Federation, with oversight from the Federation Council's Committee on Defense and Exploration."
        />
        <ArticlePanel
          num={28}
          text="No Starfleet vessel or officer shall be used to interfere in the internal governance of any member world, nor shall Starfleet be employed as a political instrument against any member or their citizens."
        />
        <ArticlePanel
          num={29}
          text="The General Orders of Starfleet, as issued by the Commander, Starfleet, shall govern the conduct of all officers and vessels, provided such orders do not conflict with these Articles or Federation law."
        />
      </div>

      {/* CHAPTER VII */}
      <div id="chapter-7">
        <ChapterHeader num="VII" title="Membership" />
        <ArticlePanel
          num={30}
          isFirst
          text="Any world whose government meets the criteria established by the Council, including demonstrated peaceful intent, technological development, unified planetary government, and the free consent of the governed, may apply for membership."
        />
        <ArticlePanel
          num={31}
          text="Admission of new members requires a two-thirds affirmative vote of the full Federation Council."
        />
        <ArticlePanel
          num={32}
          text="Member worlds may withdraw from the Federation through a formal process requiring a planetary referendum with a clear majority and a two-year notice period, during which peaceful resolution shall be attempted."
        />
        <ArticlePanel
          num={33}
          text="No world shall be expelled from the Federation save by a three-fourths vote of the Council following documented violation of these Articles or Federation law."
        />
      </div>

      {/* CHAPTER VIII */}
      <div id="chapter-8">
        <ChapterHeader num="VIII" title="Amendments" />
        <ArticlePanel
          num={34}
          isFirst
          text="These Articles may be amended by a proposal receiving the support of two-thirds of the Federation Council and ratification by three-fourths of all member worlds."
        />
        <ArticlePanel
          num={35}
          text="No amendment shall be made that infringes upon the Fundamental Rights enumerated in Chapter II, nor shall any amendment reduce the sovereignty of member worlds as protected herein."
        />
        <ArticlePanel
          num={36}
          text="The original text of these Articles, signed at the Founding Conference on Earth, shall be preserved in perpetuity in the Hall of Unity in San Francisco, Earth, and in official archives on each founding member world."
        />
      </div>

      {/* Ratification panel */}
      <div
        style={{
          backgroundColor: "#111",
          border: "1px solid #ffcc3318",
          borderTop: "2px solid #ffcc3340",
          borderRadius: "8px",
          padding: "1.5rem 2rem",
          marginTop: "3rem",
          marginBottom: "3rem",
          textAlign: "center",
        }}
      >
        <p
          style={{
            color: "#555",
            fontSize: "0.6rem",
            letterSpacing: "3px",
            textTransform: "uppercase",
            marginBottom: "0.5rem",
            marginTop: 0,
          }}
        >
          Ratification Record
        </p>
        <p
          style={{
            color: "#ffcc3370",
            fontSize: "0.8rem",
            letterSpacing: "2px",
            fontStyle: "italic",
            margin: 0,
          }}
        >
          Signed and ratified at the Founding Conference, San Francisco, Earth —
          Stardate 1/9781.7
        </p>
      </div>

      </div>{/* end collapsible inner */}
      </div>{/* end collapsible grid wrapper */}

      {/* Bottom bar */}
      <div style={{ display: "flex", alignItems: "stretch", height: "45px", marginTop: "2rem" }}>
        <div
          style={{
            width: "80px",
            backgroundColor: "#9933cc",
            borderRadius: "20px 0 0 20px",
          }}
        />
        <Link
          to="/reference"
          style={{
            flex: 1,
            backgroundColor: "#ffcc33",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#000",
            fontWeight: "bold",
            textDecoration: "none",
            letterSpacing: "2px",
            fontSize: "0.9rem",
          }}
        >
          RETURN TO REFERENCE LIBRARY
        </Link>
        <div
          style={{
            width: "20px",
            backgroundColor: "#ffcc33",
            borderRadius: "0 20px 20px 0",
          }}
        />
      </div>
    </div>
  );

  return (
    <div
      style={{
        maxWidth: isMobile ? "100%" : "1200px",
        margin: "0 auto",
        padding: isMobile ? "1.5rem" : "2rem",
        fontFamily: "'Orbitron', sans-serif",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.5s ease-out",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
        {!isMobile && docExpanded && sidebar}
        {content}
      </div>
    </div>
  );
};

export default ArticlesOfFederation;
