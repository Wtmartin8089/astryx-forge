// updateRaghKor.js — one-time Firestore update for Ragh'Kor's personnel record
import { initializeApp } from "firebase/app";
import { getFirestore, updateDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDk-2Dh6xr2G4_pu7RCaFnglSL_p83DXfg",
  authDomain: "startrekrpg-40ef7.firebaseapp.com",
  projectId: "startrekrpg-40ef7",
  storageBucket: "startrekrpg-40ef7.firebasestorage.app",
  messagingSenderId: "394277791161",
  appId: "1:394277791161:web:7735bfb756d6c975ff8268",
  measurementId: "G-CZYFKPTMV0",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ──────────────────────────────────────────────────────────────────────────────
// Biography
// ──────────────────────────────────────────────────────────────────────────────
const biography = `Fleet Admiral Ragh'Kor is a Klingon officer serving in Starfleet and currently commands the Delta Quadrant Exploration Task Force from Starbase Machida.

Born on Qo'noS in 2344, Ragh'Kor was raised in a traditional Klingon warrior household. Unlike many of his peers, he developed an early fascination with interstellar cultures and strategic command rather than purely battlefield combat.

He entered Starfleet Academy in 2362, becoming one of the rare Klingons accepted into Starfleet service. During his time at the Academy he specialized in tactical operations, interstellar strategy, and first contact protocols.

After graduating in 2366 with the rank of Ensign, Ragh'Kor served as a tactical officer aboard the USS Valiant. His career quickly accelerated following his survival of the Borg engagement at Wolf 359 in 2367, where his tactical coordination helped maintain order during the chaos of the battle.

By 2370 he had been promoted to Lieutenant Commander and served as Chief Tactical Officer on frontier patrol vessels along the Cardassian border. His reputation for decisive leadership and unconventional strategy earned him entry into Starfleet's Advanced Command Training Program.

During the Dominion War (2373–2375), Ragh'Kor commanded a tactical squadron in several key engagements. His leadership during these conflicts earned him the Starfleet Medal of Merit and solidified his reputation as a capable battlefield strategist respected by both Starfleet officers and Klingon commanders.

Following the war he was promoted to Captain and later Rear Admiral, eventually being placed in command of Starfleet's Delta Quadrant Exploration Initiative operating from Starbase Machida.

In 2376 Ragh'Kor was promoted to Fleet Admiral and now oversees multiple exploratory starships charting unknown regions of the Delta Quadrant.

Ragh'Kor is known for blending Klingon warrior philosophy with Starfleet ideals, believing that exploration and discovery require both courage and diplomacy.`;

// ──────────────────────────────────────────────────────────────────────────────
// Service History Timeline
// ──────────────────────────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────────────────────────
// Awards — full AwardEntry objects
// ──────────────────────────────────────────────────────────────────────────────
const AWARDED_BY = "Starfleet Command";

const awards = [
  {
    awardId: "starfleet_medal_of_merit",
    citation: "For distinguished service and exceptional tactical leadership during the Dominion War (2373–2375), directly contributing to several key Federation victories. Fleet Admiral Ragh'Kor's command under sustained combat conditions reflects the highest traditions of Starfleet service.",
    awardedBy: AWARDED_BY,
    stardate: "52901.3",
  },
  {
    awardId: "dominion_war_campaign_medal",
    citation: "For active service in combat operations against the Dominion during the war of 2373–2375. This officer served with distinction throughout the conflict, demonstrating courage and dedication under sustained hostile conditions.",
    awardedBy: AWARDED_BY,
    stardate: "52917.0",
  },
  {
    awardId: "klingon_campaign_medal",
    citation: "For distinguished service in joint Starfleet–Klingon Defense Force operations, strengthening the alliance through cooperative tactical engagements and mutual respect between commands.",
    awardedBy: AWARDED_BY,
    stardate: "50300.0",
  },
  {
    awardId: "cardassian_border_campaign_medal",
    citation: "For meritorious service in patrol and security operations along the Cardassian border (2370–2372), maintaining Federation security during a period of heightened tension.",
    awardedBy: AWARDED_BY,
    stardate: "47900.0",
  },
  {
    awardId: "command_citation_of_merit",
    citation: "For exceptional command leadership during critical fleet operations. This officer demonstrated strategic excellence and steadfast dedication to the principles of Starfleet Command.",
    awardedBy: "Office of the Commander, Starfleet",
    stardate: "53000.0",
  },
  {
    awardId: "diplomacy_medal",
    citation: "For exceptional diplomatic achievement in negotiations with Delta Quadrant civilizations, advancing Federation interests through skillful engagement and respect for alien cultures.",
    awardedBy: AWARDED_BY,
    stardate: "53412.7",
  },
  {
    awardId: "exploration_achievement_medal",
    citation: "For significant achievement in the command and direction of deep-space exploration operations in the Delta Quadrant, expanding Federation knowledge of previously uncharted regions.",
    awardedBy: AWARDED_BY,
    stardate: "53500.0",
  },
  {
    awardId: "fleet_command_ribbon",
    citation: "For distinguished command of the Delta Quadrant Exploration Task Force, demonstrating strategic vision and leadership in one of Starfleet's most demanding long-range assignments.",
    awardedBy: AWARDED_BY,
    stardate: "53412.0",
  },
  {
    awardId: "exploration_ribbon",
    citation: "For personal participation in deep-space exploration missions beyond established Federation territory, contributing directly to the expansion of charted space.",
    awardedBy: AWARDED_BY,
    stardate: "53600.0",
  },
  {
    awardId: "first_contact_ribbon",
    citation: "For direct involvement in first contact operations with previously unknown Delta Quadrant civilizations, demonstrating the professionalism and cultural sensitivity required to establish lasting interstellar relationships.",
    awardedBy: AWARDED_BY,
    stardate: "53620.0",
  },
  {
    awardId: "combat_service_ribbon",
    citation: "For active combat service in defense of the Federation during the Dominion War and prior border operations.",
    awardedBy: AWARDED_BY,
    stardate: "52950.0",
  },
  {
    awardId: "scientific_survey_ribbon",
    citation: "For contributions to scientific survey operations in the Delta Quadrant under the direction of the Exploration Task Force.",
    awardedBy: "Starfleet Science Command",
    stardate: "53700.0",
  },
  {
    awardId: "starbase_service_ribbon",
    citation: "For distinguished service as commanding officer of Starbase Machida, overseeing operations critical to the Delta Quadrant Exploration Initiative.",
    awardedBy: AWARDED_BY,
    stardate: "53412.0",
  },
  {
    awardId: "long_service_ribbon",
    citation: "For ten years of continuous distinguished service in Starfleet, spanning tactical assignments, combat operations, and command positions.",
    awardedBy: AWARDED_BY,
    stardate: "53000.0",
  },
  {
    awardId: "alliance_service_ribbon",
    citation: "For service that materially strengthened the Federation–Klingon Alliance through joint operations, personal example, and the embodiment of both cultures' highest values.",
    awardedBy: "Office of the Commander, Starfleet",
    stardate: "50400.0",
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Write to Firestore
// ──────────────────────────────────────────────────────────────────────────────
const update = async () => {
  // Try the most likely slug — if Firestore rejects it we'll see the error
  const slug = "raghkor";
  console.log(`Updating crew document: ${slug}`);
  try {
    await updateDoc(doc(db, "crew", slug), {
      biography,
      serviceHistory,
      awards,
    });
    console.log(`✅ Ragh'Kor updated successfully.`);
    console.log(`   Biography: ${biography.length} chars`);
    console.log(`   Service history entries: ${serviceHistory.length}`);
    console.log(`   Awards: ${awards.length}`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error updating Ragh'Kor:", error.message);
    console.error("   If document not found, check the Firestore slug for Ragh'Kor.");
    process.exit(1);
  }
};

update();
