# Shadow Duel 3D

A Souls-like multiplayer 3D combat game built with Three.js and Firebase.

![Shadow Duel 3D](https://img.shields.io/badge/Three.js-black?style=flat&logo=three.js)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat&logo=firebase&logoColor=black)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)

## 🎮 Play Now

[**Play the Demo**](https://cgpeterson.github.io/shadow-duel-3d/)

## Features

- **Real-time 3D Combat** - Fluid attack, block, and parry mechanics
- **Boss AI Archetypes** - Four distinct boss types (Agile, Aggressive, Tank, Duelist)
- **Multiplayer Co-op** - Team up with friends via Firebase Realtime Database
- **Dynamic Boss Scaling** - Boss difficulty scales with player count
- **Multiple Maps** - Dark Arena, Snowy Forest, and Green Meadow
- **Souls-like Mechanics** - Stamina management, posture system, healing flasks

## Controls

| Action | Keyboard | Gamepad |
|--------|----------|---------|
| Move | WASD | Left Stick |
| Attack | Left Click | X / RB |
| Heavy Attack | Hold Left Click | Hold X / RB |
| Block/Parry | Right Click | LB |
| Dash | Space | A |
| Heal | E | Y |

## Tech Stack

- **Three.js** - 3D rendering and scene management
- **Firebase Realtime Database** - Multiplayer synchronization
- **Vanilla JavaScript** - No frameworks, pure performance

## Project Structure

```
shadow-duel-3d/
├── index.html      # Main HTML file
├── styles.css      # Game UI styles
├── game.js         # Main game logic, Three.js setup, gameplay
├── gameLogic.js    # Pure functions for combat calculations (testable)
├── gameLogic.test.js # Unit tests
└── package.json    # Dependencies for testing
```

## Running Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/cgpeterson/shadow-duel-3d.git
   cd shadow-duel-3d
   ```

2. Start a local server (required for ES modules):
   ```bash
   npx http-server .
   ```

3. Open `http://localhost:8080` in your browser

## Running Tests

```bash
npm install
npm test
```

## Multiplayer Setup

The game uses Firebase Realtime Database for multiplayer. To use multiplayer:

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Realtime Database
3. Update the `FIREBASE_CONFIG` in `game.js` with your credentials

## Architecture Highlights

- **Separation of Concerns** - Game logic separated into testable pure functions
- **IK Animation System** - Procedural arm and leg animations using inverse kinematics
- **Smart AI Targeting** - Boss selects targets based on threat scoring
- **Network Interpolation** - Smooth multiplayer movement with position lerping

## License

MIT License - Feel free to use this code for learning and personal projects.

---

Built by [Rowan Vale](https://cgpeterson.github.io/BeyondTheVale/) | [Portfolio](https://cgpeterson.github.io/BeyondTheVale/)
