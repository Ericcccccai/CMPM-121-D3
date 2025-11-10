// @deno-types="npm:@types/leaflet"
import leaflet from "leaflet";

// CSS
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix Leaflet missing images
import "./_leafletWorkaround.ts";

// Deterministic randomness
import luck from "./_luck.ts";

// === 1. Constants & Game Config ===
const CLASSROOM_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 0.0001; // about one house
const NEIGHBORHOOD_SIZE = 10; // how many cells in each direction
const INTERACTION_RANGE = 3; // how many cells away player can act
const TARGET_VALUE = 16; // win condition

const playerCell = toCell(CLASSROOM_LATLNG.lat, CLASSROOM_LATLNG.lng);

// === 2. Create UI ===
const controlPanelDiv = document.createElement("div");
controlPanelDiv.id = "controlPanel";
document.body.append(controlPanelDiv);

const mapDiv = document.createElement("div");
mapDiv.id = "map";
document.body.append(mapDiv);

const statusPanelDiv = document.createElement("div");
statusPanelDiv.id = "statusPanel";
document.body.append(statusPanelDiv);

// === 3. Create the Map ===
const map = leaflet.map(mapDiv, {
  center: CLASSROOM_LATLNG,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// === 4. Player Marker ===
const playerMarker = leaflet.marker(CLASSROOM_LATLNG);
playerMarker.bindTooltip("You are here");
playerMarker.addTo(map);

// === 5. Game State ===
let heldToken: number | null = null;
const removedTokens = new Set<string>(); // remember which cells were emptied

function updateStatus() {
  statusPanelDiv.innerHTML = heldToken === null
    ? "Held: —"
    : `Held: ${heldToken}${heldToken >= TARGET_VALUE ? " ✅ You win!" : ""}`;
}

// === 6. Helper: Coordinate ↔ Cell ===
function toCell(lat: number, lng: number) {
  return {
    i: Math.floor((lat - CLASSROOM_LATLNG.lat) / TILE_DEGREES),
    j: Math.floor((lng - CLASSROOM_LATLNG.lng) / TILE_DEGREES),
  };
}

function fromCell(i: number, j: number) {
  const base = CLASSROOM_LATLNG;
  const lat = base.lat + i * TILE_DEGREES;
  const lng = base.lng + j * TILE_DEGREES;
  const lat2 = base.lat + (i + 1) * TILE_DEGREES;
  const lng2 = base.lng + (j + 1) * TILE_DEGREES;
  return leaflet.latLngBounds([
    [lat, lng],
    [lat2, lng2],
  ]);
}

function cellId(i: number, j: number) {
  return `${i},${j}`;
}

function distance(a: { i: number; j: number }, b: { i: number; j: number }) {
  return Math.max(Math.abs(a.i - b.i), Math.abs(a.j - b.j));
}

// === 7. Deterministic Token Spawn ===
function spawnValue(i: number, j: number): number | null {
  const r = luck([i, j, "spawn"].toString());
  // 20% chance of token; weighted toward smaller values
  if (r < 0.1) return 1;
  if (r < 0.15) return 2;
  if (r < 0.17) return 4;
  if (r < 0.175) return 8;
  return null;
}

// === 8. Draw Grid & Tokens ===
function drawGrid() {
  map.eachLayer((layer) => {
    if (isTokenRect(layer)) map.removeLayer(layer);
  });

  for (let i = -NEIGHBORHOOD_SIZE; i <= NEIGHBORHOOD_SIZE; i++) {
    for (let j = -NEIGHBORHOOD_SIZE; j <= NEIGHBORHOOD_SIZE; j++) {
      const bounds = fromCell(i, j);
      const id = cellId(i, j);
      if (removedTokens.has(id)) continue;

      const value = spawnValue(i, j);
      if (value === null) continue;

      const rect: leaflet.Rectangle & { _isTokenRect: boolean } = Object.assign(
        leaflet.rectangle(bounds, {
          color: "gray",
          weight: 1,
          fillOpacity: 0.05,
        }),
        { _isTokenRect: true },
      );

      rect.addTo(map);

      const center = bounds.getCenter();
      const marker = leaflet.marker(center, {
        icon: leaflet.divIcon({
          className: "tokenLabel",
          html: `<div style="font-weight:700;color:black;">${value}</div>`,
          iconSize: [1, 1],
        }),
      });

      marker.addTo(map);

      const handleClick = () => {
        if (distance(playerCell, { i, j }) > INTERACTION_RANGE) {
          alert("Too far away to interact!");
          return;
        }
        if (heldToken === null) {
          heldToken = value;
          removedTokens.add(id);
          updateStatus();
          drawGrid();
          return;
        }
        if (heldToken === value) {
          heldToken *= 2;
          removedTokens.add(id);
          updateStatus();
          drawGrid();
          return;
        }
        alert("You can only merge tokens of the same value!");
      };

      rect.on("click", handleClick);
      marker.on("click", handleClick);
    }
  }
}

function isTokenRect(layer: leaflet.Layer): layer is leaflet.Rectangle & {
  _isTokenRect: boolean;
} {
  return (layer as unknown as { _isTokenRect?: boolean })._isTokenRect === true;
}

// === 9. Initialize ===
updateStatus();
drawGrid();

// === 10. (Optional) reset button ===
const resetBtn = document.createElement("button");
resetBtn.innerText = "Reset Game";
resetBtn.onclick = () => {
  heldToken = null;
  removedTokens.clear();
  updateStatus();
  drawGrid();
};
controlPanelDiv.append(resetBtn);
