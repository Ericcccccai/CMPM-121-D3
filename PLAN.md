# D3: World of Bits

## Game Design Vision

**World of Bits** is a map-based crafting game inspired by _2048_ and _Pokémon Go_.\
Players explore a real-world map to collect and merge digital “bits” — tokens of numeric value — to reach higher-value tokens.\
The player can interact only with nearby cells, encouraging exploration, and must strategically combine matching tokens to reach the target value (e.g., 256).\
Gameplay occurs on a grid aligned with latitude-longitude coordinates and persists across sessions in later milestones.

---

## Technologies

- **Language:** TypeScript
- **Frameworks/Libraries:** Leaflet.js for map rendering, Luck hashing for deterministic token placement
- **Build Tools:** Vite + Deno
- **Deployment:** GitHub Actions + GitHub Pages
- **Persistence APIs:** localStorage (for D3.d)
- **Optional Patterns:** Flyweight, Facade, Memento (introduced gradually in C and D)

---

# Assignments

---

## D3.a: Core Mechanics (Token Collection & Crafting)

**Goal:** Build a playable prototype that displays a Leaflet map with an interactive grid, allows token collection and crafting, and detects victory.

### Technical Requirements

- Render an interactive **Leaflet** map centered on the classroom coordinates.
- Draw a grid of small rectangular **cells** (≈ 0.0001° × 0.0001°).
- Use a deterministic **hash (“luck”) function** to decide if each cell has a token and what value it has.
- Display tokens (numbers or icons) **directly on the map** without clicking.
- Allow **cell clicks** to trigger collecting or crafting.
- Player can interact only with nearby cells (e.g., ≤ 3 cells away).

### Gameplay Requirements

- The player can **pick up** only one token at a time.
- Picking up removes that token from its cell.
- If holding a token and clicking a cell with a token of **equal value**, merge them into one of **double value**.
- Display the currently held token (“Held: 8”) on the screen.
- Detect and display victory when player reaches a target token (e.g., 16 or 256).

### Steps

- [x] Fork starter repo from <https://github.com/rndmcnlly/cmpm-121-f25-d3>
- [x] Enable GitHub Pages via Actions → Pages → Source → GitHub Actions
- [x] Copy `main.ts` → `reference.ts` for reference
- [x] Clear `main.ts` and start fresh
- [x] Initialize Leaflet map centered on UCSC classroom coordinates
- [x] Add player marker
- [ ] Generate grid cells around player (10×10 window)
- [ ] Use deterministic hashing (Luck library) to assign token presence/value
- [ ] Render token numbers or sprites in each cell
- [ ] Limit interaction range (~3 cells radius)
- [ ] Implement picking up a token (updates held state + removes from map)
- [ ] Implement merging mechanic (equal value → double value token)
- [ ] Update on-screen “Held Token” UI
- [ ] Detect win condition (token ≥ target value)
- [ ] Commit: “(D3.a complete)”

---

## D3.b: Globe-Spanning Gameplay

**Goal:** Expand gameplay to work anywhere on Earth and introduce simulated movement buttons.

### Technical Requirements

- Add on-screen buttons for **N/S/E/W** simulated movement (each = 1 grid cell).
- Implement **map scrolling** with cell regeneration as player moves.
- Anchor grid coordinates to **Null Island (0°, 0°)** to allow world-spanning play.
- Ensure grid redraws as player moves so visible cells always fill the map view.
- Cells outside of the visible region “forget” their state (temporary loss of memory).

### Gameplay Requirements

- Player can move the avatar across the global map using movement buttons.
- Can scroll freely to look at other areas.
- Interaction is restricted to nearby cells.
- Cells behave **memorylessly** — tokens respawn when leaving/re-entering region.
- Victory threshold increases (e.g., craft a token ≥ 32).

### Steps

- [x] Add directional buttons (N/S/E/W) to move player one cell per press
- [ ] Refactor grid rendering into a reusable function (so it updates on move)
- [ ] When player moves, refresh visible cells around new position
- [ ] Maintain separate data structure for cell coordinates (i,j pairs)
- [ ] Convert lat/long ↔ cell ID conversion functions
- [ ] Handle Leaflet’s `moveend` event to detect scroll completion
- [ ] Ensure old cells are discarded when off-screen
- [ ] Keep token logic from D3.a working in new locations
- [ ] Raise win condition threshold (e.g., token ≥ 32)
- [ ] Commit: “(D3.b complete)”

---

## D3.c: Object Persistence

**Goal:** Introduce persistence for off-screen cells and practice the Flyweight and Memento patterns.

### Technical Requirements

- Use **Flyweight** pattern (or equivalent) so invisible cells do not consume memory.
- Use **Memento** pattern (or equivalent serialization) to store and restore modified cells.
- Maintain a `Map<CellID, TokenData>` data structure to record modified state.
- When cells scroll off-screen, save their state; when they return, restore it.

### Gameplay Requirements

- Cells retain their token state even after scrolling off screen.
- No persistence yet across page reloads.
- Prevent token farming by moving in/out of range.
- Continue progression toward higher value tokens (e.g., 64 or 128).

### Steps

- [x] Create `Cell` type/interface for (i,j) coordinates
- [ ] Replace any direct arrays with a `Map<CellID, Token>` structure
- [ ] Implement saveCellState(cellID, tokenValue) → store in Map
- [ ] Implement restoreCellState(cellID) → read from Map when redrawing
- [ ] Remove unused cell objects when off-screen (Flyweight)
- [ ] Use Memento-style serialization function (e.g., JSON save of Map)
- [ ] Test scrolling away and back → cells retain token state
- [ ] Commit: “(D3.c complete)”

---

## D3.d: Gameplay Across Real-World Space and Time

**Goal:** Integrate real-world geolocation and full game state persistence.

### Technical Requirements

- Replace button movement with **browser geolocation API** (`navigator.geolocation`).
- Wrap movement logic in a **Facade** interface so core game code is agnostic to control method.
- Store entire game state (`Map` of cells + player inventory) in **localStorage**.
- Add UI for “Start New Game” and toggle between button/geo movement.

### Gameplay Requirements

- Player moves by physically moving their device in the real world.
- Game state persists across page reloads or browser closes.
- Option to start a new session or switch to simulated movement.
- Long-term goal: craft the highest token (≥ 256) through real-world exploration.

### Steps

- [x] Create interface `IPlayerMovement` with methods `moveNorth/…` and `updatePosition()`
- [ ] Implement `ButtonMovement` class (using existing controls)
- [ ] Implement `GeolocationMovement` class (using `navigator.geolocation.watchPosition`)
- [ ] Add Façade controller that switches between movement types based on query string or UI toggle
- [ ] Implement saveGameState() and loadGameState() with `localStorage`
- [ ] Add “Start New Game” button to clear storage and reset map
- [ ] Add runtime toggle between button and geo movement
- [ ] Verify persistent resume after refresh or tab close/open
- [ ] Commit: “(D3.d complete)”

---

# Maintenance & Documentation

### Ongoing Plan Updates

- Update this PLAN.md after every 1–2 commits.
- Add `[x]` to completed tasks and brief notes when you modify plan content.
- Include at least one “cleanup-only” commit per milestone (removing debugging code and comments).

### Submission Checklist (per milestone)

- [ ] PLAN.md updated with new progress
- [ ] Required gameplay and software features present
- [ ] Code is clean and readable
- [ ] Meaningful commit messages (including “(D3.x complete)”)
- [ ] Deployed build works on GitHub Pages

---
