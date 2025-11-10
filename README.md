# World of Bits – CMPM 121 D3

A map-based crafting game inspired by _2048_ and _Pokémon Go_. Explore real-world locations to collect and merge digital "bits" (tokens with numeric values) and reach the target value.

## Game Overview

**World of Bits** combines location-based gameplay with tile-matching mechanics:

- **Explore:** Navigate a real-world map (or use simulated movement buttons)
- **Collect:** Find tokens scattered across grid cells
- **Merge:** Combine two tokens of equal value to create one token of double value
- **Win:** Craft a token that reaches the target value (e.g., 256)

## Current Status

**Milestone:** D3.a – Core Mechanics (In Progress)

Progress on core features:

- ✅ Map initialization with Leaflet.js
- ✅ Player marker and location display
- 🔄 Grid generation and token spawning
- 🔄 Collection and merging mechanics
- 🔄 Victory detection

## Technologies

- **Language:** TypeScript
- **Map Engine:** Leaflet.js + OpenStreetMap tiles
- **Build Tools:** Vite + Deno
- **Hashing:** Luck (murmur-32) for deterministic token placement
- **Deployment:** GitHub Actions + GitHub Pages

## How to Play (When Complete)

1. **Move:** Use directional buttons or real GPS to navigate
2. **Collect:** Click a nearby cell to pick up a token
3. **Merge:** Click another cell with a matching token value to combine them
4. **Progress:** Keep merging to reach higher values
5. **Win:** Reach the target token value

## Development

### Setup

```bash
# Install dependencies
deno task build

# Start dev server
deno task dev
```

### Commands

```bash
deno task dev       # Start development server (auto-opens in browser)
deno task build     # Build for production
deno task preview   # Preview production build
deno task lint      # Run linter
deno task fmt       # Format code
deno task ci        # Run all checks (formatting, linting, types, build)
```

### Project Structure

```
src/
  main.ts                 # Game logic and UI
  style.css              # Game styling
  _luck.ts               # Deterministic hash function (do not modify)
  _leafletWorkaround.ts  # Leaflet fixes (do not modify)
```

## Milestones

### D3.a: Core Mechanics _(Current)_

Build a playable prototype with token collection and crafting on a local grid.

### D3.b: Globe-Spanning Gameplay

Expand to world-wide play with simulated movement and memoryless cells.

### D3.c: Object Persistence

Add cell state persistence using Flyweight and Memento patterns.

### D3.d: Real-World Gameplay

Integrate geolocation and localStorage for persistent cross-session gameplay.

## Deployment

The game is automatically deployed to GitHub Pages on each push to `main`.

---

**For detailed development plan and checklist, see [PLAN.md](PLAN.md)**
