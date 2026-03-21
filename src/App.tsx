import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import NavBar from "./components/NavBar";
import LandingPage from "./components/LandingPage";
import WorldsPage from "./components/WorldsPage";
import StarMap from "./components/StarMap";
import StarbasePage from "./components/Starbase";
import Forum from "./components/Forum";
import PlanetPage from "./components/PlanetPage";
import AuthPanel from "./components/AuthPanel";
import StardateCalculator from "./components/StardateCalculator";
import ComputerCore from "./components/ComputerCore";
import AccountSettings from "./components/AccountSettings";
import FleetRegistry from "./components/FleetRegistry";
import ShipPage from "./components/ShipPage";
import ChooseCharacter from "./components/ChooseCharacter";
import CreateCampaign from "./pages/CreateCampaign";
import CampaignMap from "./components/CampaignMap";
import SectorMap from "./components/SectorMap";
import PersonnelDatabase from "./components/PersonnelDatabase";
import PersonnelProfile from "./components/PersonnelProfile";
import AwardsConsole from "./components/admin/AwardsConsole";
import TransmissionsConsole from "./components/admin/TransmissionsConsole";
import MissionBoard from "./components/MissionBoard";
import CreatureNew from "./components/CreatureNew";
import CreatureDetail from "./components/CreatureDetail";
import SystemsList from "./components/SystemsList";
import SystemDashboard from "./components/SystemDashboard";
import SystemPlanets from "./components/SystemPlanets";
import SystemPlanetNew from "./components/SystemPlanetNew";
import SystemPlanetDetail from "./components/SystemPlanetDetail";
import SystemSpecies from "./components/SystemSpecies";
import SystemSpeciesNew from "./components/SystemSpeciesNew";
import SystemSpeciesDetail from "./components/SystemSpeciesDetail";
import SystemCreatures from "./components/SystemCreatures";
import ReferencePage from "./components/ReferencePage";
import ArticlesOfFederation from "./components/ArticlesOfFederation";

import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";

const auth = getAuth();

function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return <p style={{ color: "white", textAlign: "center" }}>Loading warp core...</p>;
  }

  // Public paths that don't require authentication
  const publicPaths = ["/", "/worlds", "/auth"];

  // Only allow unauthenticated users on public paths
  if (!currentUser && !publicPaths.includes(location.pathname)) {
    return <Navigate to="/auth" replace />;
  }

  // If authenticated and at /auth, redirect to home
  if (currentUser && location.pathname === "/auth") {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      {currentUser && <NavBar />}
      {currentUser && <ComputerCore />}
      <Routes>
        <Route path="/" element={currentUser ? <StarMap /> : <LandingPage />} />
        <Route path="/worlds" element={<WorldsPage />} />
        <Route path="/starbase" element={<StarbasePage />} />
        <Route path="/forum" element={<Forum />} />
        <Route path="/stardate" element={<StardateCalculator />} />
        <Route path="/character" element={<Navigate to="/personnel" replace />} />
        <Route path="/settings" element={<AccountSettings />} />
        <Route path="/planet/:planetName" element={<PlanetPage />} />
        <Route path="/fleet" element={<FleetRegistry />} />
        <Route path="/ship/:shipSlug" element={<ShipPage />} />
        <Route path="/choose-character" element={<ChooseCharacter />} />
        <Route path="/crew" element={<Navigate to="/personnel" replace />} />
        <Route path="/crew/:crewSlug" element={<Navigate to="/personnel" replace />} />
        <Route path="/personnel" element={<PersonnelDatabase />} />
        <Route path="/personnel/:id" element={<PersonnelProfile />} />
        <Route path="/admin/awards" element={<AwardsConsole />} />
        <Route path="/admin/transmissions" element={<TransmissionsConsole />} />
        <Route path="/missions" element={<MissionBoard />} />
        <Route path="/create-campaign" element={<CreateCampaign />} />
        <Route path="/map/:campaignId" element={<CampaignMap />} />
        <Route path="/sector/:sectorId" element={<SectorMap />} />
        <Route path="/creatures/new" element={<CreatureNew />} />
        <Route path="/creatures/:id" element={<CreatureDetail />} />
        <Route path="/systems" element={<SystemsList />} />
        <Route path="/systems/:systemId" element={<SystemDashboard />} />
        <Route path="/systems/:systemId/planets" element={<SystemPlanets />} />
        <Route path="/systems/:systemId/planets/new" element={<SystemPlanetNew />} />
        <Route path="/systems/:systemId/planets/:planetId" element={<SystemPlanetDetail />} />
        <Route path="/systems/:systemId/species" element={<SystemSpecies />} />
        <Route path="/systems/:systemId/species/new" element={<SystemSpeciesNew />} />
        <Route path="/systems/:systemId/species/:speciesId" element={<SystemSpeciesDetail />} />
        <Route path="/systems/:systemId/creatures" element={<SystemCreatures />} />
        <Route path="/reference" element={<ReferencePage />} />
        <Route path="/reference/articles-of-federation" element={<ArticlesOfFederation />} />
        <Route path="/auth" element={<AuthPanel />} />
      </Routes>
    </>
  );
}

export default App;

