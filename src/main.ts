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
// 🌍 Step 14: Use world origin (LA)
const WORLD_ORIGIN = leaflet.latLng(34.0522, -118.2437);

const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 0.0001; // about one house
const NEIGHBORHOOD_SIZE = 10; // how many cells in each direction
const INTERACTION_RANGE = 3; // how many cells away player can act
const TARGET_VALUE = 32; // win condition

const playerCell = toCell(WORLD_ORIGIN.lat, WORLD_ORIGIN.lng);

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
  center: WORLD_ORIGIN,
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
const playerMarker = leaflet.marker(WORLD_ORIGIN);
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
    i: Math.floor((lat - WORLD_ORIGIN.lat) / TILE_DEGREES),
    j: Math.floor((lng - WORLD_ORIGIN.lng) / TILE_DEGREES),
  };
}

function fromCell(i: number, j: number) {
  const base = WORLD_ORIGIN;
  const lat = base.lat + i * TILE_DEGREES;
  const lng = base.lng + j * TILE_DEGREES;
  const lat2 = base.lat + (i + 1) * TILE_DEGREES;
  const lng2 = base.lng + (j + 1) * TILE_DEGREES;
  return leaflet.latLngBounds([
    [lat, lng],
    [lat2, lng2],
  ]);
}

// function cellId(i: number, j: number) {
//   return `${i},${j}`;
// }

function distance(a: { i: number; j: number }, b: { i: number; j: number }) {
  return Math.max(Math.abs(a.i - b.i), Math.abs(a.j - b.j));
}

// === 7. Deterministic Token Spawn ===
function spawnValue(i: number, j: number): number | null {
  const r = luck([i, j, "spawn"].toString());
  // 20% chance of token; weighted toward smaller values
  if (r < 0.1) return 1;
  if (r < 0.18) return 2;
  if (r < 0.22) return 4;
  if (r < 0.24) return 8;
  if (r < 0.245) return 16;
  return null;
}

// 🟢 Step 13: clear old token layers before redrawing
map.eachLayer((layer) => {
  if (isTokenRect(layer)) map.removeLayer(layer);
});

// === 8. Draw Grid & Tokens ===
function drawGrid() {
  map.eachLayer((layer) => {
    if (isTokenRect(layer)) map.removeLayer(layer);
  });

  // draw relative to current playerCell
  for (let di = -NEIGHBORHOOD_SIZE; di <= NEIGHBORHOOD_SIZE; di++) {
    for (let dj = -NEIGHBORHOOD_SIZE; dj <= NEIGHBORHOOD_SIZE; dj++) {
      const i = playerCell.i + di;
      const j = playerCell.j + dj;

      const bounds = fromCell(i, j);
      //const id = cellId(i, j);
      //if (removedTokens.has(id)) continue;

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
          //removedTokens.add(id);
          updateStatus();
          drawGrid();
          return;
        }
        if (heldToken === value) {
          heldToken *= 2;
          //removedTokens.add(id);
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

// === 10b. Optional: Redraw when map is panned or zoomed ===
map.on("moveend", () => {
  drawGrid();
});

// === 11. Player Movement Controls ===
const moveButtonsDiv = document.createElement("div");
moveButtonsDiv.style.marginTop = "1rem";
moveButtonsDiv.innerHTML = `
  <button id="moveNorth">⬆️ North</button>
  <div>
    <button id="moveWest">⬅️ West</button>
    <button id="moveEast">➡️ East</button>
  </div>
  <button id="moveSouth">⬇️ South</button>
`;
controlPanelDiv.append(moveButtonsDiv);

// Helper: move player by delta
function movePlayer(di: number, dj: number) {
  // update player's cell coordinates
  playerCell.i += di;
  playerCell.j += dj;

  // recenter map and marker
  const newCenter = fromCell(playerCell.i, playerCell.j).getCenter();
  map.setView(newCenter);

  // move player marker visually
  playerMarker.setLatLng(newCenter);

  // redraw visible grid
  drawGrid();
  updateStatus();
}

// Attach button handlers
document.getElementById("moveNorth")!.addEventListener(
  "click",
  () => movePlayer(1, 0),
);
document.getElementById("moveSouth")!.addEventListener(
  "click",
  () => movePlayer(-1, 0),
);
document.getElementById("moveWest")!.addEventListener(
  "click",
  () => movePlayer(0, -1),
);
document.getElementById("moveEast")!.addEventListener(
  "click",
  () => movePlayer(0, 1),
);
