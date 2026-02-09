# Hollow Duel

A 3D souls-like multiplayer combat game — fight procedurally generated bosses with friends in the browser.

Built with **Three.js**, **Firebase Realtime Database**, and **vanilla JavaScript**. No frameworks, no bundlers.

![Three.js](https://img.shields.io/badge/Three.js-r128-black?style=flat&logo=three.js)
![Firebase](https://img.shields.io/badge/Firebase-Realtime_DB-FFCA28?style=flat&logo=firebase&logoColor=black)
![JavaScript](https://img.shields.io/badge/Vanilla_JS-ES6+-F7DF1E?style=flat&logo=javascript&logoColor=black)

## Play Now

[**Play the Demo →**](https://cgpeterson.github.io/shadow-duel-3d/)

<!-- Replace with an actual gameplay GIF or screenshot -->
<!-- ![Hollow Duel Gameplay](./screenshot.gif) -->

## What It Does

Enter a boss name, and the game deterministically generates an opponent from four distinct archetypes — each with unique AI behaviors, combat stats, visual auras, and special attacks. Team up with friends by sharing the same boss name as a session key.

**Core Mechanics:**

- **Posture system** — block and deflect to build posture damage; break their stance for a critical window
- **Stamina management** — attacks, dashes, and blocks cost stamina; overcommit and you're vulnerable
- **Parry timing** — a tight deflect window rewards precise play with massive posture damage to the boss
- **Healing flasks** — limited heals that leave you exposed during the animation
- **Four boss archetypes** — Agile (fast dodger), Aggressive (relentless attacker), Tank (high defense), Duelist (parry master)

## Controls

| Action | Keyboard | Gamepad |
|--------|----------|---------|
| Move | WASD | Left Stick |
| Attack | Left Click | X / RB |
| Heavy Attack | Hold Left Click | Hold X / RB |
| Block / Parry | Right Click | LB |
| Dash | Space | A |
| Heal | E | Y |

## Architecture

```
hollow-duel/
├── index.html       # Entry point, HUD layout, loading screen
├── styles.css       # UI styling (menu, HUD bars, end screens)
├── game.js          # Game controller — Three.js scene, input, networking, AI, combat
├── gameLogic.js     # Pure functions — damage calc, stamina, collision, boss configs (UMD)
└── package.json     # Dev dependencies (Jest, Playwright for testing)
```

**Key Design Decisions:**

- **Separation of concerns** — `gameLogic.js` exports pure, testable functions (damage calculation, stamina management, collision detection, boss configuration). `game.js` handles rendering, state, and side effects. The logic module uses UMD for dual browser/Node.js compatibility.

- **Procedural IK animation** — characters use a two-bone IK solver for arms and legs rather than pre-baked animations. This allows dynamic sword swings, walk cycles, and blocking poses to blend naturally based on game state.

- **Threat-based AI targeting** — in multiplayer, the boss evaluates targets using a weighted scoring system (distance, attack state, health, stun status) rather than simple proximity, creating more believable aggro behavior.

- **Host-authoritative networking** — the first player in a session controls boss AI; others receive interpolated state. Stale session detection automatically promotes a new host if the original disconnects uncleanly.

- **Procedural audio** — all sound effects are synthesized at runtime using the Web Audio API (oscillators, noise buffers, filters) — zero audio file dependencies.

- **Boss aura system** — each archetype emits persistent particles in their signature color. Below 30% health, auras shift red and intensify, giving visual read on boss phase.

## Running Locally

```bash
git clone https://github.com/cgpeterson/shadow-duel-3d.git
cd shadow-duel-3d
npx http-server .
# Open http://localhost:8080
```

## Multiplayer

The game uses Firebase Realtime Database. Players sharing the same boss name join the same session automatically. To use your own Firebase project:

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Realtime Database
3. Update `FIREBASE_CONFIG` in `game.js`

## Testing

```bash
npm install
npm test          # Unit tests (Jest) + E2E tests (Playwright)
npm run test:unit # Unit tests only
```

## License

MIT

---

Built by [Rowan Vale](https://cgpeterson.github.io/BeyondTheVale/)