import { Tooltip } from "react-tooltip";
import { useNavigate } from "react-router-dom";
import starSystemImage from "../assets/star_system_overview_v2.png";

// Positions as percentages of the 1024x1024 image
// cx%, cy%, radius% (all relative to image dimensions)
const planets = [
  { name: "Acathla", tooltip: "Acathla: Ancient demon world", cx: 17.1, cy: 17.1, r: 6.8, href: "/planet/acathla" },
  { name: "Taraka", tooltip: "Taraka: Rogue planet", cx: 47.9, cy: 10.3, r: 6.3, href: "/planet/taraka" },
  { name: "D'Hoffryn", tooltip: "D'Hoffryn: Desert mystical energy", cx: 75.2, cy: 16.6, r: 6.3, href: "/planet/dhoffryn" },
  { name: "Larconis", tooltip: "Larconis: Icy mining moon", cx: 39.1, cy: 30.3, r: 3.4, href: "/planet/larconis" },
  { name: "Lagos", tooltip: "Lagos: Oceanic world", cx: 9.8, cy: 52.7, r: 9.8, href: "/planet/lagos" },
  { name: "Kralik", tooltip: "Kralik: Jungle warp anomalies", cx: 80.1, cy: 46.9, r: 9.3, href: "/planet/kralik" },
  { name: "Machida", tooltip: "Machida: Volcanic chaos", cx: 32.2, cy: 58.6, r: 7.8, href: "/planet/machida" },
  { name: "Starbase", tooltip: "Starbase: Central hub", cx: 51.8, cy: 56.6, r: 5.4, href: "/starbase" },
  { name: "Kakistos", tooltip: "Kakistos: Ancient fortress", cx: 72.3, cy: 74.2, r: 9.3, href: "/planet/kakistos" },
];

const StarMap = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      marginTop: "2rem",
      padding: "0 1rem",
    }}>
      <div style={{
        position: "relative",
        display: "inline-block",
        width: "100%",
        maxWidth: "1024px",
      }}>
        <img
          src={starSystemImage}
          alt="Star System"
          style={{
            width: "100%",
            height: "auto",
            display: "block",
          }}
        />

        {planets.map((planet) => (
          <div
            key={planet.name}
            data-tooltip-id="map-tooltip"
            data-tooltip-content={planet.tooltip}
            onClick={() => navigate(planet.href)}
            style={{
              position: "absolute",
              left: `${planet.cx - planet.r}%`,
              top: `${planet.cy - planet.r}%`,
              width: `${planet.r * 2}%`,
              height: `${planet.r * 2}%`,
              borderRadius: "50%",
              cursor: "pointer",
            }}
          />
        ))}

        <Tooltip id="map-tooltip" />
      </div>
    </div>
  );
};

export default StarMap;
