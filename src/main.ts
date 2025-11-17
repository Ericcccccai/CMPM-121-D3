// @deno-types="npm:@types/leaflet"
import leaflet from "leaflet";

// CSS
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix Leaflet missing images
import "./_leafletWorkaround.ts";

// Deterministic randomness
import luck from "./_luck.ts";

// =====================================================
// MovementController INTERFACE (Facade core)
// =====================================================
interface MovementController {
  start(): void;
  stop(): void;
}

// =====================================================
// Movement System (FACADE)
// =====================================================
class MovementSystem {
  private current: MovementController | null = null;

  setController(controller: MovementController) {
    // Stop old controller if exists
    if (this.current) {
      this.current.stop();
    }

    // Assign and start new controller
    this.current = controller;
    this.current.start();
  }

  get activeController() {
    return this.current;
  }
}

// Create GLOBAL movement system instance
const movementSystem = new MovementSystem();

// =====================================================
// Button-based Movement Controller
// =====================================================
class ButtonMovementController implements MovementController {
  private handlerNorth = () => movePlayer(1, 0);
  private handlerSouth = () => movePlayer(-1, 0);
  private handlerWest = () => movePlayer(0, -1);
  private handlerEast = () => movePlayer(0, 1);

  start() {
    document.getElementById("moveNorth")?.addEventListener(
      "click",
      this.handlerNorth,
    );
    document.getElementById("moveSouth")?.addEventListener(
      "click",
      this.handlerSouth,
    );
    document.getElementById("moveWest")?.addEventListener(
      "click",
      this.handlerWest,
    );
    document.getElementById("moveEast")?.addEventListener(
      "click",
      this.handlerEast,
    );
  }

  stop() {
    document.getElementById("moveNorth")?.removeEventListener(
      "click",
      this.handlerNorth,
    );
    document.getElementById("moveSouth")?.removeEventListener(
      "click",
      this.handlerSouth,
    );
    document.getElementById("moveWest")?.removeEventListener(
      "click",
      this.handlerWest,
    );
    document.getElementById("moveEast")?.removeEventListener(
      "click",
      this.handlerEast,
    );
  }
}

// Create instance
const buttonMovement = new ButtonMovementController();

// =====================================================
// 1. CONSTANTS
// =====================================================
const WORLD_ORIGIN = leaflet.latLng(34.0522, -118.2437);
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 0.0001;
const NEIGHBORHOOD_SIZE = 10;
const INTERACTION_RANGE = 3;
const TARGET_VALUE = 32;

// =====================================================
// 2. PLAYER CELL (must come after constants)
// =====================================================
const playerCell = toCell(WORLD_ORIGIN.lat, WORLD_ORIGIN.lng);

// =====================================================
// 3. UI CREATION
// =====================================================
const controlPanelDiv = document.createElement("div");
controlPanelDiv.id = "controlPanel";
document.body.append(controlPanelDiv);

const mapDiv = document.createElement("div");
mapDiv.id = "map";
document.body.append(mapDiv);

const statusPanelDiv = document.createElement("div");
statusPanelDiv.id = "statusPanel";
document.body.append(statusPanelDiv);

// =====================================================
// 4. MAP INITIALIZATION
// =====================================================
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

// =====================================================
// 5. PLAYER MARKER
// =====================================================
const playerMarker = leaflet.marker(WORLD_ORIGIN);
playerMarker.bindTooltip("You are here");
playerMarker.addTo(map);

// =====================================================
// 6. GAME STATE + STATUS DISPLAY
// =====================================================
let heldToken: number | null = null;

function updateStatus() {
  statusPanelDiv.innerHTML = heldToken === null
    ? "Held: —"
    : `Held: ${heldToken}${heldToken >= TARGET_VALUE ? " ✅ You win!" : ""}`;
}

// =====================================================
// 7d. GEOLOCATION-BASED MOVEMENT IMPLEMENTATION (D3d Step 3)
// =====================================================

class GeolocationMovementController implements MovementController {
  private watchId: number | null = null;
  private lastLat: number | null = null;
  private lastLng: number | null = null;

  start() {
    if (!("geolocation" in navigator)) {
      alert("Geolocation not supported on this device.");
      return;
    }

    // Start tracking
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.handlePosition(pos),
      (err) => console.error("Geolocation error:", err),
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 5000,
      },
    );
  }

  stop() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  private handlePosition(pos: GeolocationPosition) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    // First reading → store and wait
    if (this.lastLat === null || this.lastLng === null) {
      this.lastLat = lat;
      this.lastLng = lng;
      return;
    }

    // Convert GPS to cell coordinates
    const oldCell = toCell(this.lastLat, this.lastLng);
    const newCell = toCell(lat, lng);

    const di = newCell.i - oldCell.i;
    const dj = newCell.j - oldCell.j;

    // Only move when crossing tile boundaries
    if (di !== 0 || dj !== 0) {
      movePlayer(di, dj);
    }

    // Update stored GPS
    this.lastLat = lat;
    this.lastLng = lng;
  }
}

// =====================================================
// 7. CELL MEMORY (D3c persistent world state)
// =====================================================
interface CellState {
  value: number | null;
  collected: boolean;
}

const cellMemory: Record<string, CellState> = {};

const saved = localStorage.getItem("worldState");
if (saved) {
  Object.assign(cellMemory, JSON.parse(saved));
}

// =====================================================
// 8. HELPER FUNCTIONS (coordinate math, id, distance)
// =====================================================
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

function cellId(i: number, j: number) {
  return `${i},${j}`;
}

function distance(a: { i: number; j: number }, b: { i: number; j: number }) {
  return Math.max(Math.abs(a.i - b.i), Math.abs(a.j - b.j));
}

// =====================================================
// 9. TOKEN GENERATION
// =====================================================
function spawnValue(i: number, j: number): number | null {
  const r = luck([i, j, "spawn"].toString());
  if (r < 0.1) return 1;
  if (r < 0.18) return 2;
  if (r < 0.22) return 4;
  if (r < 0.24) return 8;
  if (r < 0.245) return 16;
  return null;
}

// =====================================================
// 10. TOKEN LAYER TYPE GUARD
// =====================================================
function isTokenLayer(
  layer: leaflet.Layer,
): layer is leaflet.Layer & { _isTokenLayer: true } {
  return "_isTokenLayer" in layer &&
    (layer as { _isTokenLayer: true })._isTokenLayer === true;
}

// =====================================================
// 11. GRID DRAWING
// =====================================================
map.eachLayer((layer) => {
  if (isTokenLayer(layer)) map.removeLayer(layer);
});

function drawGrid() {
  map.eachLayer((layer) => {
    if (isTokenLayer(layer)) map.removeLayer(layer);
  });

  for (let di = -NEIGHBORHOOD_SIZE; di <= NEIGHBORHOOD_SIZE; di++) {
    for (let dj = -NEIGHBORHOOD_SIZE; dj <= NEIGHBORHOOD_SIZE; dj++) {
      const i = playerCell.i + di;
      const j = playerCell.j + dj;

      const bounds = fromCell(i, j);
      const id = cellId(i, j);

      let value: number | null;

      if (cellMemory[id]) {
        if (cellMemory[id].collected) continue;
        value = cellMemory[id].value;
      } else {
        value = spawnValue(i, j);
        cellMemory[id] = { value, collected: false };
      }

      if (value === null) continue;

      const rect = Object.assign(
        leaflet.rectangle(bounds, {
          color: "gray",
          weight: 1,
          fillOpacity: 0.05,
        }),
        { _isTokenLayer: true as const },
      );
      rect.addTo(map);

      const center = bounds.getCenter();
      const marker = Object.assign(
        leaflet.marker(center, {
          icon: leaflet.divIcon({
            className: "tokenLabel",
            html: `<div style="font-weight:700;color:black;">${value}</div>`,
            iconSize: [1, 1],
          }),
        }),
        { _isTokenLayer: true as const },
      );
      marker.addTo(map);

      const handleClick = () => {
        if (distance(playerCell, { i, j }) > INTERACTION_RANGE) {
          alert("Too far away to interact!");
          return;
        }
        if (heldToken === null) {
          heldToken = value;
          cellMemory[id].collected = true;
          localStorage.setItem("worldState", JSON.stringify(cellMemory));
          updateStatus();
          drawGrid();
          return;
        }
        if (heldToken === value) {
          heldToken *= 2;
          cellMemory[id].collected = true;
          localStorage.setItem("worldState", JSON.stringify(cellMemory));
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

// =====================================================
// 12. INITIALIZATION
// =====================================================
updateStatus();
drawGrid();

// =====================================================
// 13. RESET BUTTON
// =====================================================
const resetBtn = document.createElement("button");
resetBtn.innerText = "Reset Game";
resetBtn.onclick = () => {
  heldToken = null;

  localStorage.removeItem("worldState");
  for (const key in cellMemory) delete cellMemory[key];

  updateStatus();
  drawGrid();
};
controlPanelDiv.append(resetBtn);

// =====================================================
// 13b. Add switch button for movement modes (D3d Step 4)
// =====================================================
const switchBtn = document.createElement("button");
switchBtn.innerText = " Switch to Geolocation Movement";
controlPanelDiv.append(switchBtn);

let usingGeo = false;

switchBtn.onclick = () => {
  if (usingGeo) {
    movementSystem.setController(buttonMovement);
    switchBtn.innerText = "Switch to Geolocation Movement";
  } else {
    movementSystem.setController(new GeolocationMovementController());
    switchBtn.innerText = "Switch to Button Movement";
  }
  usingGeo = !usingGeo;
};

// =====================================================
// 14. REDRAW ON MAP MOVE
// =====================================================
map.on("moveend", () => {
  drawGrid();
});

// =====================================================
// 15. PLAYER MOVEMENT CONTROLS
// =====================================================
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
movementSystem.setController(buttonMovement);

function movePlayer(di: number, dj: number) {
  playerCell.i += di;
  playerCell.j += dj;

  const newCenter = fromCell(playerCell.i, playerCell.j).getCenter();
  map.setView(newCenter);
  playerMarker.setLatLng(newCenter);

  drawGrid();
  updateStatus();
}
