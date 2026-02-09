/**
 * Main Game Controller
 * Integrates Three.js rendering, Firebase networking, and GameLogic.
 */

// Access shared game logic
const GL = window.GameLogic;
const CONSTANTS = GL.GAME_CONSTANTS;

// ============================================
// WEB AUDIO - PROCEDURAL SOUND EFFECTS
// ============================================
const AudioSystem = (() => {
    let ctx = null;
    let masterGain = null;
    const volume = 0.35;

    function init() {
        if (ctx) return;
        try {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            masterGain = ctx.createGain();
            masterGain.gain.value = volume;
            masterGain.connect(ctx.destination);
        } catch (e) { /* Audio unavailable */ }
    }

    function ensureContext() {
        if (!ctx) init();
        if (ctx && ctx.state === 'suspended') ctx.resume();
        return !!ctx;
    }

    function noise(duration, volume = 0.3) {
        if (!ensureContext()) return;
        const sr = ctx.sampleRate;
        const len = sr * duration;
        const buf = ctx.createBuffer(1, len, sr);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * volume;
        return buf;
    }

    // Metallic sword clash
    function playSwordClash() {
        if (!ensureContext()) return;
        const t = ctx.currentTime;

        // High-frequency metallic ring
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'square';
        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.15);

        filter.type = 'bandpass';
        filter.frequency.value = 2000;
        filter.Q.value = 8;

        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.2);

        // Noise burst for impact texture
        const noiseBuf = noise(0.05, 0.5);
        const nSrc = ctx.createBufferSource();
        const nGain = ctx.createGain();
        nSrc.buffer = noiseBuf;
        nGain.gain.setValueAtTime(0.3, t);
        nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        nSrc.connect(nGain);
        nGain.connect(masterGain);
        nSrc.start(t);
    }

    // Parry / deflect - bright metallic ring
    function playParry() {
        if (!ensureContext()) return;
        const t = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(2400, t);
        osc1.frequency.exponentialRampToValueAtTime(1800, t + 0.3);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(3600, t);
        osc2.frequency.exponentialRampToValueAtTime(2000, t + 0.4);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(masterGain);
        osc1.start(t); osc1.stop(t + 0.4);
        osc2.start(t); osc2.stop(t + 0.4);
    }

    // Flesh hit impact - dull thud
    function playHit() {
        if (!ensureContext()) return;
        const t = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.12);

        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.15);

        // Add noise for texture
        const noiseBuf = noise(0.08, 0.4);
        const nSrc = ctx.createBufferSource();
        const nGain = ctx.createGain();
        nSrc.buffer = noiseBuf;
        nGain.gain.setValueAtTime(0.25, t);
        nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        nSrc.connect(nGain);
        nGain.connect(masterGain);
        nSrc.start(t);
    }

    // Dash whoosh - filtered noise sweep
    function playDash() {
        if (!ensureContext()) return;
        const t = ctx.currentTime;

        const noiseBuf = noise(0.25, 0.6);
        const src = ctx.createBufferSource();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        src.buffer = noiseBuf;
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, t);
        filter.frequency.exponentialRampToValueAtTime(200, t + 0.25);
        filter.Q.value = 3;

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        src.start(t);
    }

    // Heal chime - warm ascending tones
    function playHeal() {
        if (!ensureContext()) return;
        const t = ctx.currentTime;
        const notes = [523, 659, 784]; // C5, E5, G5

        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            const start = t + i * 0.12;
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.15, start + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(start);
            osc.stop(start + 0.4);
        });
    }

    // Posture break - heavy crumble
    function playPostureBreak() {
        if (!ensureContext()) return;
        const t = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.3);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.35);

        const noiseBuf = noise(0.2, 0.5);
        const nSrc = ctx.createBufferSource();
        const nGain = ctx.createGain();
        nSrc.buffer = noiseBuf;
        nGain.gain.setValueAtTime(0.3, t);
        nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        nSrc.connect(nGain);
        nGain.connect(masterGain);
        nSrc.start(t);
    }

    // Perilous attack warning - ominous tone
    function playPerilous() {
        if (!ensureContext()) return;
        const t = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.linearRampToValueAtTime(440, t + 0.3);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.25, t + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.5);
    }

    return { init, playSwordClash, playParry, playHit, playDash, playHeal, playPostureBreak, playPerilous };
})();

/**
 * Three.js Setup
 */
let scene, camera, renderer;
let clock = new THREE.Clock();

// Game Objects
let player, boss;
let floor;
let envGroup;
let particles = [];
let shockwaves = [];
let cameraShake = 0;
let obstacles = [];
let hitStopTimer = 0;

// Boss Aura System
let bossAuraParticles = [];
let bossAuraTimer = 0;
const AURA_PARTICLE_GEO = new THREE.SphereGeometry(0.05, 4, 4);

// Shared Geometry for Optimization
const PARTICLE_GEO = new THREE.BoxGeometry(0.1, 0.1, 0.1);
const SHOCKWAVE_GEO = new THREE.RingGeometry(0.1, 0.5, 32);

// Game State
let gameState = 'MENU';
let keys = { w: false, a: false, s: false, d: false, space: false, e: false };
let mouse = { left: false, right: false, clickInvalidated: false };
let clickStartTime = 0;

// Gamepad State
const gamepadState = {
    attackPressed: false,
    dashPressed: false,
    blockPressed: false,
    healPressed: false,
    attackStartTime: 0,
    attackInvalidated: false
};

// ===========================================
// MULTIPLAYER STATE
// ===========================================
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyA3RXnFx9ZPVjd_ktZfxMkbt9n1oeTXzf4",
    authDomain: "nosouls.firebaseapp.com",
    databaseURL: "https://nosouls-default-rtdb.firebaseio.com",
    projectId: "nosouls",
    storageBucket: "nosouls.firebasestorage.app",
    messagingSenderId: "27720238191",
    appId: "1:27720238191:web:19fe26cb829ab5010df99a"
};

let db = null;
let localPlayerId = null;
let sessionId = null;
let isHost = false;
let remotePlayers = {}; // { oderId: { character, lastUpdate, data } }
let sessionRef = null;
let playersRef = null;
let bossRef = null;

const SYNC_RATE = 50; // ms between position syncs
let lastSyncTime = 0;

// Player colors for multiplayer
const PLAYER_COLORS = [0xaaaaaa, 0x4fc3f7, 0x81c784, 0xffb74d, 0xba68c8, 0xf06292];

// ===========================================
// NETWORK MANAGER
// ===========================================
const NetworkManager = {
    init() {
        if (db) return Promise.resolve();
        try {
            firebase.initializeApp(FIREBASE_CONFIG);
            db = firebase.database();
            localPlayerId = 'p_' + Math.random().toString(36).substr(2, 9);
            return Promise.resolve();
        } catch (e) {
            console.error('[NetworkManager] Firebase init failed, running in offline mode:', e);
            return Promise.resolve();
        }
    },

    async joinOrCreateSession(bossName, mapType, playerName) {
        if (!db) {
            console.warn('[NetworkManager] No database connection - playing offline');
            return { offline: true };
        }
        sessionId = bossName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        sessionRef = db.ref(`sessions/${sessionId}`);
        playersRef = sessionRef.child('players');
        bossRef = sessionRef.child('boss');

        const sessionSnapshot = await sessionRef.once('value');
        const sessionData = sessionSnapshot.val();

        let shouldBeHost = false;
        if (!sessionData || sessionData.state === 'ENDED') {
            shouldBeHost = true;
        } else {
            // Check if there are any LIVE players in the session
            const playersSnapshot = await playersRef.once('value');
            const playersData = playersSnapshot.val();

            if (!playersData) {
                shouldBeHost = true;
            } else {
                // Clean stale players: if a player has no recent state update
                // and joined more than 30s ago, they're a ghost from a crashed session
                const now = Date.now();
                const STALE_THRESHOLD = 30000; // 30 seconds
                const staleKeys = [];

                for (const [key, pData] of Object.entries(playersData)) {
                    const joinedAt = pData.joinedAt || 0;
                    const hasState = pData.state && (pData.state.pos || pData.state.health !== undefined);
                    const age = now - joinedAt;

                    // Player is stale if they joined a while ago but have no state data,
                    // or if the session is old (>30s) and no active state
                    if (age > STALE_THRESHOLD && !hasState) {
                        staleKeys.push(key);
                    }
                }

                // Remove stale players
                for (const key of staleKeys) {
                    await playersRef.child(key).remove();
                    delete playersData[key];
                }

                const remainingCount = Object.keys(playersData).length - staleKeys.length;

                if (remainingCount <= 0) {
                    // No live players - take over
                    shouldBeHost = true;
                } else {
                    // There are players, but check if the current host is still among them
                    const currentHostId = sessionData.hostId;
                    const hostStillPresent = currentHostId && playersData[currentHostId];
                    if (!hostStillPresent) {
                        // Host disconnected without cleanup - we take over
                        shouldBeHost = true;
                    }
                }
            }
        }

        if (shouldBeHost) {
            isHost = true;
            // Clear any leftover players from previous session before setting up fresh
            await playersRef.remove();

            await sessionRef.set({
                bossName: bossName,
                mapType: mapType,
                state: 'PLAYING',
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                hostId: localPlayerId,
                playerCount: 1
            });
        } else {
            isHost = false;
            await sessionRef.update({
                playerCount: firebase.database.ServerValue.increment(1)
            });
        }

        // Register local player
        const playerRef = playersRef.child(localPlayerId);
        await playerRef.set({
            name: playerName || 'Wolf',
            color: PLAYER_COLORS[Object.keys(remotePlayers).length % PLAYER_COLORS.length],
            joinedAt: firebase.database.ServerValue.TIMESTAMP,
            state: {}
        });

        // Remove player on disconnect
        playerRef.onDisconnect().remove();
        sessionRef.child('playerCount').onDisconnect().set(
            firebase.database.ServerValue.increment(-1)
        );

        // Listen for other players
        playersRef.on('child_added', snap => {
            if (snap.key !== localPlayerId) {
                this.onPlayerJoined(snap.key, snap.val());
            }
        });

        playersRef.on('child_removed', snap => {
            if (snap.key !== localPlayerId) {
                this.onPlayerLeft(snap.key);
            }
        });

        playersRef.on('child_changed', snap => {
            if (snap.key !== localPlayerId) {
                this.onPlayerUpdate(snap.key, snap.val());
            }
        });

        // If not host, listen for boss state
        if (!isHost) {
            bossRef.on('value', snap => {
                const data = snap.val();
                if (data && boss) {
                    this.applyBossState(data);
                }
            });
        }

        // Get session info for returning map type
        const finalSnapshot = await sessionRef.once('value');
        return finalSnapshot.val();
    },

    onPlayerJoined(playerId, data) {
        const spawnAngle = Math.random() * Math.PI * 2;
        const spawnDist = 6 + Math.random() * 2;
        const spawnPos = new THREE.Vector3(
            Math.cos(spawnAngle) * spawnDist,
            0,
            Math.sin(spawnAngle) * spawnDist
        );

        const remoteChar = new Character(true, data.color || 0x4fc3f7, spawnPos);
        remoteChar.isRemote = true;
        remoteChar.remoteName = data.name;

        remotePlayers[playerId] = {
            character: remoteChar,
            lastUpdate: Date.now(),
            targetPos: spawnPos.clone(),
            targetRot: 0,
            data: data
        };

        this.updatePlayerCount();
        this.updateAllyHuds();

        // Scale boss for new player
        if (isHost && boss) {
            scaleBossForPlayerCount();
        }

        createFloatingText(`${data.name} JOINED`, new THREE.Vector3(0, 3, 0), '#4fc3f7');
    },

    onPlayerLeft(playerId) {
        const remote = remotePlayers[playerId];
        if (remote) {
            if (remote.character && remote.character.mesh) {
                scene.remove(remote.character.mesh);
            }
            delete remotePlayers[playerId];
            this.updatePlayerCount();
            this.updateAllyHuds();

            if (isHost && boss) {
                scaleBossForPlayerCount();
            }
        }
    },

    onPlayerUpdate(playerId, data) {
        const remote = remotePlayers[playerId];
        if (!remote || !data.state) return;

        const s = data.state;
        remote.lastUpdate = Date.now();

        if (s.pos) {
            remote.targetPos.set(s.pos.x, s.pos.y || 0, s.pos.z);
        }
        if (s.rot !== undefined) {
            remote.targetRot = s.rot;
        }

        // Apply action states
        const char = remote.character;
        if (s.attacking && !char.isAttacking) {
            char.isAttacking = true;
            char.attackType = s.attackType || 'light';
            char.attackTimer = GL.getAttackDuration(char.attackType);
            char.swingType = Math.random() < 0.5 ? 1 : 2;
        }
        if (s.blocking !== undefined) char.isBlocking = s.blocking;
        if (s.healing && !char.isHealing) {
            char.isHealing = true;
            char.healTimer = 1.0;
        }
        if (s.health !== undefined) char.health = s.health;
        if (s.posture !== undefined) char.posture = s.posture;
        if (s.stunned !== undefined) char.stunTimer = s.stunned ? 1.0 : 0;
    },

    syncLocalPlayer() {
        if (!db || !playersRef || !player) return;

        const now = Date.now();
        if (now - lastSyncTime < SYNC_RATE) return;
        lastSyncTime = now;

        const state = {
            pos: { x: player.mesh.position.x, z: player.mesh.position.z },
            rot: player.mesh.rotation.y,
            attacking: player.isAttacking,
            attackType: player.attackType,
            blocking: player.isBlocking,
            healing: player.isHealing,
            health: player.health,
            posture: player.posture,
            stunned: player.stunTimer > 0
        };

        playersRef.child(localPlayerId).child('state').set(state);
    },

    syncBossState() {
        if (!db || !bossRef || !boss || !isHost) return;

        const state = {
            pos: { x: boss.mesh.position.x, y: boss.mesh.position.y, z: boss.mesh.position.z },
            rot: boss.mesh.rotation.y,
            health: boss.health,
            posture: boss.posture,
            aiState: boss.aiState,
            attacking: boss.isAttacking,
            attackType: boss.attackType,
            attackTimer: boss.attackTimer,
            specialAttacking: boss.isSpecialAttacking,
            specialType: boss.specialType,
            stunned: boss.stunTimer > 0,
            targetId: boss.currentTargetId || localPlayerId
        };
        bossRef.set(state);
    },

    applyBossState(data) {
        if (!boss || isHost) return;
        // Interpolate position
        boss.mesh.position.lerp(
            new THREE.Vector3(data.pos.x, data.pos.y || 0, data.pos.z),
            0.3
        );

        // Apply rotation
        boss.mesh.rotation.y = data.rot;

        // Apply stats
        boss.health = data.health;
        boss.posture = data.posture;
        boss.aiState = data.aiState;

        // Apply attack state
        if (data.attacking && !boss.isAttacking) {
            boss.isAttacking = true;
            boss.attackType = data.attackType;
            boss.attackTimer = data.attackTimer;
        } else if (!data.attacking) {
            boss.isAttacking = false;
        }

        if (data.specialAttacking && !boss.isSpecialAttacking) {
            boss.isSpecialAttacking = true;
            boss.specialType = data.specialType;
            boss.attackTimer = data.attackTimer;
        } else if (!data.specialAttacking) {
            boss.isSpecialAttacking = false;
        }

        boss.stunTimer = data.stunned ? 1.0 : 0;
    },

    updatePlayerCount() {
        const count = 1 + Object.keys(remotePlayers).length;
        document.getElementById('playerCount').textContent = `Players: ${count}`;
    },

    updateAllyHuds() {
        const container = document.getElementById('allyHuds');
        container.innerHTML = '';

        for (const [id, remote] of Object.entries(remotePlayers)) {
            const hud = document.createElement('div');
            hud.className = 'ally-hud';
            hud.innerHTML = `
                <div class="boss-name">${remote.data.name || 'Ally'}</div>
                <div class="bar-container">
                    <div class="health-bar" style="width: ${(remote.character.health / remote.character.maxHealth) * 100}%"></div>
                </div>
            `;
            container.appendChild(hud);
        }
    },

    updateRemotePlayers(dt) {
        for (const [id, remote] of Object.entries(remotePlayers)) {
            const char = remote.character;
            if (!char || !char.mesh) continue;

            // Interpolate position smoothly
            char.mesh.position.lerp(remote.targetPos, 0.15);

            // Interpolate rotation
            const currentRot = char.mesh.rotation.y;
            const targetRot = remote.targetRot;
            let diff = targetRot - currentRot;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            char.mesh.rotation.y += diff * 0.15;

            // Update character (handles animations)
            char.update(dt, boss);
        }

        this.updateAllyHuds();
    },

    cleanup() {
        if (playersRef) {
            playersRef.off();
            if (localPlayerId) {
                playersRef.child(localPlayerId).remove();
            }
        }
        if (bossRef) bossRef.off();

        for (const [id, remote] of Object.entries(remotePlayers)) {
            if (remote.character && remote.character.mesh) {
                scene.remove(remote.character.mesh);
            }
        }
        remotePlayers = {};
        sessionRef = null;
        playersRef = null;
        bossRef = null;
        isHost = false;
    }
};

// ===========================================
// BOSS SCALING & TARGET SELECTION
// ===========================================
let baseBossHealth = 0;
let baseBossPosture = 0;

function scaleBossForPlayerCount() {
    if (!boss) return;
    const playerCount = 1 + Object.keys(remotePlayers).length;
    const stats = GL.scaleBossStats(baseBossHealth, baseBossPosture, playerCount);

    // Defensive: ensure boss.maxHealth and boss.maxPosture are valid numbers
    if (!Number.isFinite(boss.maxHealth) || boss.maxHealth <= 0) {
        console.warn('[BossScaling] Invalid boss.maxHealth, using fallback value. Value:', boss.maxHealth);
        boss.maxHealth = baseBossHealth > 0 ? baseBossHealth : (stats.maxHealth || 300);
        boss.health = boss.maxHealth;
    }
    if (!Number.isFinite(boss.maxPosture) || boss.maxPosture <= 0) {
        console.warn('[BossScaling] Invalid boss.maxPosture, using fallback value. Value:', boss.maxPosture);
        boss.maxPosture = baseBossPosture > 0 ? baseBossPosture : (stats.maxPosture || 200);
        boss.posture = 0;
    }

    // Scale current HP proportionally, but only if valid
    const healthRatio = Number.isFinite(boss.health) && Number.isFinite(boss.maxHealth) && boss.maxHealth > 0 ? boss.health / boss.maxHealth : 1;
    const postureRatio = Number.isFinite(boss.posture) && Number.isFinite(boss.maxPosture) && boss.maxPosture > 0 ? boss.posture / boss.maxPosture : 0;

    boss.maxHealth = stats.maxHealth;
    boss.maxPosture = stats.maxPosture;

    boss.health = Math.floor(boss.maxHealth * healthRatio);
    boss.posture = Math.floor(boss.maxPosture * postureRatio);

    // Final check: if any value is NaN, set to fallback
    if (!Number.isFinite(boss.health) || boss.health < 0) boss.health = boss.maxHealth;
    if (!Number.isFinite(boss.posture) || boss.posture < 0) boss.posture = 0;

}

function selectBossTarget() {
    if (!boss) return null;

    // Use GameLogic for threat scoring
    // First, gather all potential targets
    const targets = [];
    if (player && player.health > 0) targets.push({ id: localPlayerId, character: player });

    for (const [id, remote] of Object.entries(remotePlayers)) {
        if (remote.character && remote.character.health > 0) {
            targets.push({ id: id, character: remote.character });
        }
    }

    if (targets.length === 0) return null;

    let bestTarget = null;
    let bestScore = -Infinity;

    for (const target of targets) {
        // Use the pure function from GameLogic to calculate threat
        // We map our character structure to what GameLogic expects (simple object with properties)
        const char = target.character;
        const targetData = {
            id: target.id,
            position: char.mesh.position,
            isAttacking: char.isAttacking,
            hasHit: char.hasHit,
            isStunned: char.stunTimer > 0,
            isHealing: char.isHealing,
            health: char.health,
            maxHealth: char.maxHealth
        };

        const score = GL.calculateThreatScore(targetData, boss.mesh.position, boss.currentTargetId);

        // Add some randomness
        const finalScore = score + Math.random() * 20;

        if (finalScore > bestScore) {
            bestScore = finalScore;
            bestTarget = target;
        }
    }

    if (bestTarget) {
        boss.currentTargetId = bestTarget.id;
    }

    return bestTarget;
}


function initThree() {
    const container = document.getElementById('game-container');

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    scene.fog = new THREE.Fog(0x050505, 10, 60);

    // Camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    scene.add(dirLight);

    // Floor
    const floorGeo = new THREE.PlaneGeometry(100, 100);
    const floorMat = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        roughness: 0.8,
        metalness: 0.2
    });
    floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Environment Group
    envGroup = new THREE.Group();
    scene.add(envGroup);

    // Resize Handler
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Input Listeners
    window.addEventListener('keydown', e => {
        if (e.key.toLowerCase() === 'w') keys.w = true;
        if (e.key.toLowerCase() === 'a') keys.a = true;
        if (e.key.toLowerCase() === 's') keys.s = true;
        if (e.key.toLowerCase() === 'd') keys.d = true;
        if (e.key === ' ') {
            keys.space = true;
            // Prevent Space from clicking the button again
            e.preventDefault();
        }
        if (e.key.toLowerCase() === 'e') keys.e = true;
    });

    window.addEventListener('keyup', e => {
        if (e.key.toLowerCase() === 'w') keys.w = false;
        if (e.key.toLowerCase() === 'a') keys.a = false;
        if (e.key.toLowerCase() === 's') keys.s = false;
        if (e.key.toLowerCase() === 'd') keys.d = false;
        if (e.key === ' ') keys.space = false;
        if (e.key.toLowerCase() === 'e') keys.e = false;
    });

    window.addEventListener('mousedown', e => {
        if (e.button === 0) {
            mouse.left = true;
            mouse.clickInvalidated = false;
            clickStartTime = performance.now();
        }
        if (e.button === 2) mouse.right = true;
    });

    window.addEventListener('mouseup', e => {
        if (e.button === 0) {
            mouse.left = false;

            if (mouse.clickInvalidated) {
                if (player) player.isCharging = false;
                return;
            }

            if (player && !player.isAttacking && !player.isHealing) {
                const duration = performance.now() - clickStartTime;
                if (duration < CONSTANTS.CHARGE_THRESHOLD) {
                    player.attack('light');
                } else {
                    if (player.isCharging) {
                        player.attack('heavy');
                    }
                }
                player.isCharging = false;
            }
        }
        if (e.button === 2) mouse.right = false;
    });

    window.addEventListener('contextmenu', e => e.preventDefault());

    // Start Loop
    animate();
}

function createEnvironment(type = 'arena') {
    while (envGroup.children.length > 0) {
        const child = envGroup.children[0];
        envGroup.remove(child);
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
    }
    obstacles = [];

    if (type === 'arena') {
        scene.background = new THREE.Color(0x050505);
        scene.fog = new THREE.Fog(0x050505, 10, 60);
        floor.material.color.setHex(0x1a1a1a);

        const pillarGeo = new THREE.CylinderGeometry(1.2, 1.2, 8, 8);
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
        const rockGeo = new THREE.DodecahedronGeometry(1.5);
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });

        const positions = [
            { x: 12, z: 12 }, { x: -12, z: 12 },
            { x: 12, z: -12 }, { x: -12, z: -12 },
            { x: 0, z: 18 }, { x: 0, z: -18 }
        ];

        positions.forEach(p => {
            const mesh = new THREE.Mesh(pillarGeo, pillarMat);
            mesh.position.set(p.x, 4, p.z);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.rotation.z = (Math.random() - 0.5) * 0.2;
            mesh.rotation.x = (Math.random() - 0.5) * 0.2;
            envGroup.add(mesh);
            obstacles.push({ pos: new THREE.Vector3(p.x, 0, p.z), radius: 1.8 });
        });

        for (let i = 0; i < 8; i++) {
            const mesh = new THREE.Mesh(rockGeo, rockMat);
            let rx, rz;
            do {
                rx = (Math.random() - 0.5) * 35;
                rz = (Math.random() - 0.5) * 35;
            } while (Math.sqrt(rx * rx + rz * rz) < 10);

            const s = 1 + Math.random() * 2;
            mesh.scale.set(s, s, s);
            mesh.position.set(rx, s / 2, rz);
            mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            envGroup.add(mesh);
            obstacles.push({ pos: new THREE.Vector3(rx, 0, rz), radius: s * 1.2 });
        }

    } else if (type === 'snow') {
        scene.background = new THREE.Color(0xcfd8dc);
        scene.fog = new THREE.Fog(0xcfd8dc, 5, 40);
        floor.material.color.setHex(0xeceff1);

        // Pre-create geometries to prevent memory leaks
        const trunkGeo = new THREE.CylinderGeometry(0.4, 0.6, 2, 6);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4e342e });
        const leavesGeo = new THREE.ConeGeometry(2.5, 6, 8);
        const leavesMat = new THREE.MeshStandardMaterial({ color: 0x263238 });
        const capGeo = new THREE.ConeGeometry(2.0, 2, 8);
        const snowCapMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

        for (let i = 0; i < 15; i++) {
            let tx, tz;
            do {
                tx = (Math.random() - 0.5) * 45;
                tz = (Math.random() - 0.5) * 45;
            } while (Math.sqrt(tx * tx + tz * tz) < 12);

            const group = new THREE.Group();
            group.position.set(tx, 0, tz);

            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = 1;
            trunk.castShadow = true;
            group.add(trunk);

            const leaves = new THREE.Mesh(leavesGeo, leavesMat);
            leaves.position.y = 4;
            leaves.castShadow = true;
            group.add(leaves);

            const cap = new THREE.Mesh(capGeo, snowCapMat);
            cap.position.y = 6;
            group.add(cap);

            envGroup.add(group);
            obstacles.push({ pos: new THREE.Vector3(tx, 0, tz), radius: 1.0 });
        }

        const rockGeo = new THREE.DodecahedronGeometry(1.0);
        const iceMat = new THREE.MeshStandardMaterial({ color: 0xb0bec5, roughness: 0.1 });
        for (let i = 0; i < 10; i++) {
            let rx, rz;
            do {
                rx = (Math.random() - 0.5) * 40;
                rz = (Math.random() - 0.5) * 40;
            } while (Math.sqrt(rx * rx + rz * rz) < 10);
            const mesh = new THREE.Mesh(rockGeo, iceMat);
            mesh.position.set(rx, 0.8, rz);
            mesh.rotation.set(Math.random(), Math.random(), Math.random());
            mesh.castShadow = true;
            envGroup.add(mesh);
            obstacles.push({ pos: new THREE.Vector3(rx, 0, rz), radius: 1.0 });
        }

    } else if (type === 'meadow') {
        scene.background = new THREE.Color(0x87CEEB);
        scene.fog = new THREE.Fog(0x87CEEB, 20, 80);
        floor.material.color.setHex(0x4CAF50);

        const trunkGeo = new THREE.CylinderGeometry(0.6, 0.8, 2.5, 6);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
        const foliageGeo = new THREE.DodecahedronGeometry(2.5);
        const foliageMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32 });
        const bushGeo = new THREE.DodecahedronGeometry(0.6);

        for (let i = 0; i < 12; i++) {
            let tx, tz;
            do {
                tx = (Math.random() - 0.5) * 45;
                tz = (Math.random() - 0.5) * 45;
            } while (Math.sqrt(tx * tx + tz * tz) < 15);

            const group = new THREE.Group();
            group.position.set(tx, 0, tz);

            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = 1.25;
            trunk.castShadow = true;
            group.add(trunk);

            const foliage = new THREE.Mesh(foliageGeo, foliageMat);
            foliage.position.y = 4;
            foliage.castShadow = true;
            group.add(foliage);

            envGroup.add(group);
            obstacles.push({ pos: new THREE.Vector3(tx, 0, tz), radius: 1.2 });
        }

        const rockGeo = new THREE.DodecahedronGeometry(0.8);
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x757575 });
        for (let i = 0; i < 20; i++) {
            let rx, rz;
            do {
                rx = (Math.random() - 0.5) * 45;
                rz = (Math.random() - 0.5) * 45;
            } while (Math.sqrt(rx * rx + rz * rz) < 8);

            if (Math.random() > 0.5) {
                const mesh = new THREE.Mesh(rockGeo, rockMat);
                mesh.position.set(rx, 0.5, rz);
                mesh.castShadow = true;
                envGroup.add(mesh);
                obstacles.push({ pos: new THREE.Vector3(rx, 0, rz), radius: 0.8 });
            } else {
                const bush = new THREE.Mesh(bushGeo, foliageMat);
                bush.position.set(rx, 0.4, rz);
                envGroup.add(bush);
            }
        }
    }
}

function resolveCollision(pos, radius) {
    for (let obs of obstacles) {
        const dx = pos.x - obs.pos.x;
        const dz = pos.z - obs.pos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const minDist = radius + obs.radius;

        if (dist < minDist) {
            const angle = Math.atan2(dz, dx);
            const pushOut = minDist - dist;
            pos.x += Math.cos(angle) * pushOut;
            pos.z += Math.sin(angle) * pushOut;
        }
    }

    // Use GameLogic for clamping to arena
    const clamped = GL.clampToArena(pos, CONSTANTS.ARENA_RADIUS);
    pos.x = clamped.x;
    pos.z = clamped.z;
}

/**
 * Character Classes
 */
class Character {
    constructor(isPlayer, color, startPos) {
        this.isPlayer = isPlayer;
        this.config = color.color ? color : { color: color };

        this.mesh = new THREE.Group();
        this.mesh.position.copy(startPos);
        scene.add(this.mesh);
        this.lastPos = startPos.clone();

        this.baseScale = (!isPlayer && this.config.scale) ? this.config.scale : 1.0;
        if (this.baseScale !== 1.0) {
            this.mesh.scale.set(this.baseScale, this.baseScale, this.baseScale);
        }

        this.baseColor = this.config.color !== undefined ? this.config.color : (isPlayer ? 0xaaaaaa : 0xff0000);
        this.bodyMat = new THREE.MeshStandardMaterial({ color: this.baseColor });

        this.bodyRadius = 0.5;
        this.bodyHeight = 0.6;

        const cylGeo = new THREE.CylinderGeometry(this.bodyRadius, this.bodyRadius, this.bodyHeight, 16);
        const cylinder = new THREE.Mesh(cylGeo, this.bodyMat);
        const bodyY = 1.0 + this.bodyHeight / 2;
        cylinder.position.y = bodyY;
        cylinder.castShadow = true;
        this.mesh.add(cylinder);

        const capGeo = new THREE.SphereGeometry(this.bodyRadius, 16, 16);
        const topCap = new THREE.Mesh(capGeo, this.bodyMat);
        topCap.position.y = bodyY + this.bodyHeight / 2;
        this.mesh.add(topCap);

        const botCap = new THREE.Mesh(capGeo, this.bodyMat);
        botCap.position.y = bodyY - this.bodyHeight / 2;
        this.mesh.add(botCap);

        const headRadius = 0.35;
        const headGeo = new THREE.SphereGeometry(headRadius, 16, 16);
        const headMat = new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0x111111 });
        this.head = new THREE.Mesh(headGeo, headMat);
        this.head.position.set(0, bodyY + this.bodyHeight / 2 + headRadius + 0.05, 0);
        this.mesh.add(this.head);

        const eyeGeo = new THREE.BoxGeometry(0.4, 0.1, 0.2);
        const eyeColor = (!isPlayer && this.config.ai && this.config.ai.aggro > 0.8) ? 0xff0000 : 0x00ffff;
        const eye = new THREE.Mesh(eyeGeo, new THREE.MeshBasicMaterial({ color: isPlayer ? 0x00ff00 : eyeColor }));
        eye.position.set(0, 0, 0.25);
        this.head.add(eye);

        this.armPivot = new THREE.Group();
        this.armPivot.position.set(0, bodyY + 0.2, 0.8);
        this.mesh.add(this.armPivot);

        this.weaponGroup = new THREE.Group();
        this.armPivot.add(this.weaponGroup);

        const swordLen = 3.5;
        const bladeGeo = new THREE.BoxGeometry(0.15, swordLen, 0.05);
        const swordMat = new THREE.MeshStandardMaterial({
            color: 0xeeeeee,
            emissive: 0x111111,
            metalness: 0.9,
            roughness: 0.2
        });
        this.sword = new THREE.Mesh(bladeGeo, swordMat);
        this.sword.position.y = swordLen / 2;
        this.weaponGroup.add(this.sword);

        this.hitboxPoints = [];
        const numPoints = 12;
        for (let i = 0; i <= numPoints; i++) {
            const pt = new THREE.Object3D();
            const ratio = i / numPoints;
            const localY = (ratio - 0.5) * swordLen;
            pt.position.set(0, localY, 0);
            this.sword.add(pt);
            this.hitboxPoints.push(pt);
        }

        const guardGeo = new THREE.BoxGeometry(0.6, 0.1, 0.1);
        const guard = new THREE.Mesh(guardGeo, new THREE.MeshStandardMaterial({ color: 0x333333 }));
        this.weaponGroup.add(guard);

        const handleGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.6);
        const handle = new THREE.Mesh(handleGeo, new THREE.MeshStandardMaterial({ color: 0x5c3a21 }));
        handle.position.y = -0.3;
        this.weaponGroup.add(handle);

        this.ikJoints = {};
        this.handTargets = { left: new THREE.Object3D(), right: new THREE.Object3D() };
        this.weaponGroup.add(this.handTargets.right);
        this.handTargets.right.position.set(0, -0.1, 0);
        this.weaponGroup.add(this.handTargets.left);
        this.handTargets.left.position.set(0, -0.4, 0);

        this.shoulderPos = {
            left: new THREE.Vector3(-0.55, bodyY + 0.3, 0),
            right: new THREE.Vector3(0.55, bodyY + 0.3, 0)
        };

        this.createLimb('left', 'arm');
        this.createLimb('right', 'arm');

        this.ikJointsLegs = {};
        this.walkTimer = 0;
        this.hipPos = {
            left: new THREE.Vector3(-0.3, bodyY - this.bodyHeight / 2 - 0.1, 0),
            right: new THREE.Vector3(0.3, bodyY - this.bodyHeight / 2 - 0.1, 0)
        };
        this.footTargets = {
            left: new THREE.Vector3(-0.3, 0, 0),
            right: new THREE.Vector3(0.3, 0, 0)
        };

        this.createLimb('left', 'leg');
        this.createLimb('right', 'leg');

        this.maxHealth = this.config.health || (isPlayer ? 100 : 300);
        this.health = this.maxHealth;
        this.maxPosture = this.config.posture || (isPlayer ? 100 : 200);
        this.posture = 0;

        this.stamina = CONSTANTS.STAMINA_MAX;
        this.staminaTimer = 0;
        this.estusCharges = 3;

        this.aiWeights = this.config.ai || { aggro: 0.5, defend: 0.5, dodge: 0.2, strafe: 0.5, heavyChance: 0.5 };
        this.moveSpeed = this.config.speed || CONSTANTS.PLAYER_SPEED;

        this.isBlocking = false;
        this.parryTimer = 0;
        this.isAttacking = false;
        this.attackType = 'light';
        this.isCharging = false;
        this.isHealing = false;
        this.healTimer = 0;
        this.swingType = 0;
        this.attackTimer = 0;
        this.dashCooldown = 0;
        this.stunTimer = 0;
        this.invulnTimer = 0;
        this.velocity = new THREE.Vector3();
        this.currentSpeed = 0;
        this.aiState = 'IDLE';
        this.aiTimer = 0;
        this.strafeDir = 1;
        this.hasHit = false;
        this.actionLockoutTimer = 0;
        this.wasLockedOut = false;
        this.isSpecialAttacking = false;
        this.specialType = '';
        this.hasSlammed = false;
    }

    createLimb(side, type) {
        const armMat = new THREE.MeshStandardMaterial({ color: this.config.color || (this.isPlayer ? 0xaaaaaa : 0x800000) });
        const jointColor = new THREE.Color(armMat.color).multiplyScalar(0.5);
        const jointMat = new THREE.MeshStandardMaterial({ color: jointColor });

        const isLeg = type === 'leg';
        const len = isLeg ? 0.55 : 0.6;
        const rad = isLeg ? 0.15 : 0.12;

        const upperGeo = new THREE.CylinderGeometry(rad, rad * 0.8, len, 8);
        upperGeo.rotateX(-Math.PI / 2);
        upperGeo.translate(0, 0, len / 2);

        const lowerGeo = new THREE.CylinderGeometry(rad * 0.8, rad * 0.6, len, 8);
        lowerGeo.rotateX(-Math.PI / 2);
        lowerGeo.translate(0, 0, len / 2);

        const upper = new THREE.Mesh(upperGeo, armMat);
        const lower = new THREE.Mesh(lowerGeo, armMat);
        const joint = new THREE.Mesh(new THREE.SphereGeometry(rad * 0.9), jointMat);
        const root = new THREE.Mesh(new THREE.SphereGeometry(rad * 1.1), jointMat);

        this.mesh.add(root);
        this.mesh.add(upper);
        this.mesh.add(lower);
        upper.add(joint);
        joint.position.z = len;

        const data = {
            upper: upper,
            lower: lower,
            rootMesh: root,
            upperLen: len,
            lowerLen: len
        };

        if (isLeg) {
            this.ikJointsLegs[side] = data;
            root.position.copy(this.hipPos[side]);
        } else {
            this.ikJoints[side] = data;
            root.position.copy(this.shoulderPos[side]);
        }
    }

    update(dt, target) {
        if (this.invulnTimer > 0) {
            this.invulnTimer -= dt;
            this.mesh.traverse(c => {
                if (c.isMesh && c.material) {
                    c.material.transparent = true;
                    c.material.opacity = 0.5;
                }
            });
        } else {
            this.mesh.traverse(c => {
                if (c.isMesh && c.material) {
                    c.material.transparent = false;
                    c.material.opacity = 1.0;
                }
            });
        }

        if (this.stunTimer > 0) {
            this.stunTimer -= dt;
            this.mesh.rotation.z = Math.sin(Date.now() * 0.01) * 0.3;
            this.mesh.rotation.x = Math.cos(Date.now() * 0.01) * 0.3;
            this.armPivot.rotation.set(Math.PI / 2, 0, 0);
            if (this.stunTimer <= 0) {
                this.mesh.rotation.set(0, 0, 0);
                this.posture = 0;
            }
            this.updateIK();
            return;
        }

        // Action Lockout Update
        if (this.actionLockoutTimer > 0) {
            this.actionLockoutTimer -= dt;
            const pulseSpeed = Date.now() * 0.02;
            const pulse = (Math.sin(pulseSpeed) + 1) * 0.5;
            const scaleThrob = 1.0 + (Math.sin(pulseSpeed * 2) * 0.1);
            this.mesh.scale.setScalar(this.baseScale * scaleThrob);
            this.bodyMat.color.setHex(0xff0000);
            this.bodyMat.emissive.setHex(0xff0000);
            this.bodyMat.emissiveIntensity = 0.5 + pulse;
            this.wasLockedOut = true;
        } else if (this.wasLockedOut) {
            this.wasLockedOut = false;
            this.mesh.scale.setScalar(this.baseScale);
            this.bodyMat.color.setHex(this.baseColor);
            this.bodyMat.emissive.setHex(0x000000);
            this.bodyMat.emissiveIntensity = 0;
        }

        // Stamina Regen using GameLogic
        if (this.stamina < CONSTANTS.STAMINA_MAX && this.staminaTimer <= 0 && !this.isBlocking && !this.isAttacking && !this.isCharging && !this.isSpecialAttacking) {
            this.stamina = GL.regenerateStamina(this.stamina, dt);
        }
        if (this.staminaTimer > 0) this.staminaTimer -= dt;

        if (!this.isBlocking && !this.isAttacking && !this.isSpecialAttacking && this.posture > 0) {
            this.posture -= 2 * dt;
            if (this.posture < 0) this.posture = 0;
        }

        // Healing Logic
        if (this.isHealing) {
            this.healTimer -= dt;
            this.armPivot.rotation.x = -Math.PI / 1.5;
            this.armPivot.rotation.z = -Math.PI / 4;
            this.mesh.position.add(this.velocity.clone().multiplyScalar(dt * 0.5));
            this.velocity.multiplyScalar(0.9);
            if (Math.random() < 0.2) createParticles(this.head.position, 1, 0xffaa00);
            if (this.healTimer <= 0) {
                this.isHealing = false;
                const healAmount = GL.calculateHealAmount(this.maxHealth);
                this.health = Math.min(this.maxHealth, this.health + healAmount);
                createFloatingText("HEAL", this.mesh.position.clone().add(new THREE.Vector3(0, 2, 0)), '#00ff00');
            }
            this.updateIK();
            return;
        }

        let targetRotX = 0, targetRotY = 0, targetRotZ = 0;
        let interpSpeed = 10;

        targetRotX = -Math.PI / 8;

        // --- Special Attack Animation Logic ---
        if (this.isSpecialAttacking) {
            this.attackTimer -= dt;
            const t = this.attackTimer;

            if (this.specialType === 'Whirlwind') {
                this.mesh.rotation.y += 15 * dt;
                this.armPivot.rotation.set(0, 0, Math.PI / 2);
                if (target) {
                    const dist = this.mesh.position.distanceTo(target.mesh.position);
                    if (dist > 2.0) {
                        const dir = target.mesh.position.clone().sub(this.mesh.position).normalize();
                        this.mesh.position.add(dir.multiplyScalar(this.moveSpeed * 1.5 * dt));
                    }
                }
            } else if (this.specialType === 'Phantom Flurry') {
                const phase = Math.floor(t * 3);
                this.armPivot.rotation.set(-Math.PI / 2, Math.sin(t * 20), Math.PI / 2);
                if (target) {
                    const dist = this.mesh.position.distanceTo(target.mesh.position);
                    if (dist > 2.5) {
                        const dir = target.mesh.position.clone().sub(this.mesh.position).normalize();
                        this.mesh.position.add(dir.multiplyScalar(this.moveSpeed * 2.5 * dt));
                    }
                    this.mesh.lookAt(target.mesh.position.x, this.mesh.position.y, target.mesh.position.z);
                }
            } else if (this.specialType === 'Earthshaker') {
                if (t > 0.5) { // Up Phase
                    this.mesh.position.y += 15 * dt;
                    if (target) {
                        const dir = target.mesh.position.clone().sub(this.mesh.position);
                        dir.y = 0;

                        if (dir.lengthSq() > 0.1) {
                            this.mesh.position.add(dir.normalize().multiplyScalar(25 * dt));
                        }
                    }
                } else { // Slam down
                    if (!this.hasSlammed) {
                        this.hasSlammed = true;
                        createShockwave(this.mesh.position.clone());
                        cameraShake = 2.0;
                    }
                    this.mesh.position.y = Math.max(0, this.mesh.position.y - 35 * dt);
                    this.armPivot.rotation.set(-Math.PI, 0, 0);
                }
            } else if (this.specialType === 'Death Lunge') {
                // Phase 1: Windup (0.8s to 0.35s)
                if (t > 0.35) {
                    this.armPivot.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
                    if (target) this.mesh.lookAt(target.mesh.position.x, this.mesh.position.y, target.mesh.position.z);
                }
                // Phase 2: Dash Approach (0.35s to 0.15s)
                else if (t > 0.15) {
                    if (target) {
                        this.mesh.lookAt(target.mesh.position.x, this.mesh.position.y, target.mesh.position.z);
                        const dist = this.mesh.position.distanceTo(target.mesh.position);
                        if (dist > 3.0) {
                            this.mesh.translateZ(60 * dt);
                        }
                    }
                }
                // Phase 3: Thrust (0.15s to 0.0s)
                else {
                    this.armPivot.rotation.set(0, 0, 0);
                    this.mesh.translateZ(10 * dt);
                }
            }

            if (this.attackTimer <= 0) {
                this.isSpecialAttacking = false;
                if (this.specialType === 'Whirlwind') this.mesh.rotation.set(0, this.mesh.rotation.y, 0);
                this.mesh.position.y = 0;
                this.hasSlammed = false;
            }
            this.updateIK();
            return;
        }

        if (this.isAttacking) {
            interpSpeed = this.attackType === 'heavy' ? 8 : 20;
            const duration = GL.getAttackDuration(this.attackType);
            const progress = 1 - (this.attackTimer / duration);

            if (this.attackType === 'heavy') {
                if (progress < 0.4) targetRotX = -Math.PI * 1.1;
                else if (progress < 0.6) {
                    const sm = (progress - 0.4) / 0.2;
                    targetRotX = -Math.PI * 1.1 + (Math.PI * 1.7 * sm);
                } else targetRotX = Math.PI * 0.6;
            } else {
                if (this.swingType === 1) {
                    if (progress < 0.3) {
                        targetRotY = -Math.PI * 0.8; targetRotZ = Math.PI / 2; targetRotX = 0;
                    } else if (progress < 0.7) {
                        const sm = (progress - 0.3) / 0.4;
                        targetRotY = -Math.PI * 0.8 + (Math.PI * 1.6 * sm); targetRotZ = Math.PI / 2; targetRotX = 0;
                    } else { targetRotY = Math.PI * 0.8; targetRotZ = Math.PI / 4; }
                } else {
                    if (progress < 0.3) {
                        targetRotY = Math.PI * 0.8; targetRotZ = -Math.PI / 2; targetRotX = 0;
                    } else if (progress < 0.7) {
                        const sm = (progress - 0.3) / 0.4;
                        targetRotY = Math.PI * 0.8 - (Math.PI * 1.6 * sm); targetRotZ = -Math.PI / 2; targetRotX = 0;
                    } else { targetRotY = -Math.PI * 0.8; targetRotZ = -Math.PI / 4; }
                }
            }
            this.armPivot.rotation.set(targetRotX, targetRotY, targetRotZ);
            this.weaponGroup.rotation.z = 0;

        } else if (this.isCharging) {
            targetRotX = -Math.PI * 0.7;
            targetRotY = -Math.PI * 0.3;
            targetRotZ = Math.PI * 0.2;
            this.smoothRot(targetRotX, targetRotY, targetRotZ, 5, dt);
            this.armPivot.position.add(new THREE.Vector3((Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02, 0));

        } else if (this.isBlocking) {
            if (this.parryTimer > 0.1) {
                targetRotX = -Math.PI / 4; targetRotZ = Math.PI / 4; interpSpeed = 25;
            } else {
                targetRotX = -Math.PI / 4; targetRotZ = Math.PI / 2; interpSpeed = 10;
            }
            this.smoothRot(targetRotX, targetRotY, targetRotZ, interpSpeed, dt);

        } else {
            // --- Idle breathing & sway ---
            const t = Date.now() * 0.001;

            // Breathing: slow body bob
            const breathCycle = Math.sin(t * 1.8) * 0.03;
            this.mesh.children.forEach(c => {
                if (c !== this.armPivot && c.position) {
                    // Don't touch arm pivot or IK limbs directly
                }
            });

            // Boss-specific idle presence
            if (!this.isPlayer) {
                // Heavier, slower breathing for bosses
                const bossBreath = Math.sin(t * 1.2) * 0.04;
                const bossLean = Math.sin(t * 0.7) * 0.015;
                this.mesh.rotation.x = bossLean;
                // Subtle weight shift side to side
                this.mesh.rotation.z = Math.sin(t * 0.5) * 0.01;
                // Head tracking micro-movement (menacing)
                if (this.head) {
                    this.head.rotation.x = Math.sin(t * 2.5) * 0.03;
                    this.head.rotation.z = Math.sin(t * 1.3) * 0.02;
                }
                // Sword held low and ready with subtle drift
                targetRotX = -Math.PI / 12 + Math.sin(t * 0.8) * 0.06;
                targetRotY = Math.sin(t * 0.6) * 0.08;
            } else {
                // Player idle: lighter, more alert
                targetRotX = -Math.PI / 20 + Math.sin(t * 2.0) * 0.04;
                targetRotY = Math.sin(t * 1.5) * 0.04;
                if (this.head) {
                    this.head.rotation.x = Math.sin(t * 3.0) * 0.015;
                }
            }

            this.smoothRot(targetRotX, targetRotY, targetRotZ, 5, dt);
            this.armPivot.position.set(0, this.bodyHeight / 2 + 1.2, 0.8);
            this.armPivot.position.y = 1.0 + this.bodyHeight / 2 + 0.2;
        }

        this.mesh.position.add(this.velocity.clone().multiplyScalar(dt));
        this.velocity.multiplyScalar(0.9);

        const currentPos = this.mesh.position.clone();
        const delta = currentPos.clone().sub(this.lastPos);
        this.lastPos.copy(currentPos);

        const speed = delta.length() / dt;

        if (speed > 0.5) {
            this.walkTimer += dt * speed * 2;
            const stride = 0.5;

            const localDelta = delta.clone().applyQuaternion(this.mesh.quaternion.clone().invert()).normalize();

            const footX = localDelta.x * stride;
            const footZ = localDelta.z * stride;

            this.footTargets.left.x = -0.3 + footX * Math.sin(this.walkTimer);
            this.footTargets.left.z = footZ * Math.sin(this.walkTimer);

            this.footTargets.right.x = 0.3 + footX * Math.sin(this.walkTimer + Math.PI);
            this.footTargets.right.z = footZ * Math.sin(this.walkTimer + Math.PI);

            this.footTargets.left.y = Math.max(0, Math.sin(this.walkTimer + Math.PI / 2)) * 0.3;
            this.footTargets.right.y = Math.max(0, Math.sin(this.walkTimer + Math.PI * 1.5)) * 0.3;
        } else {
            this.footTargets.left.lerp(new THREE.Vector3(-0.3, 0, 0.2), 0.1);
            this.footTargets.right.lerp(new THREE.Vector3(0.3, 0, -0.2), 0.1);
        }

        let allowRotation = !this.isAttacking;
        if (this.isAttacking && this.attackType === 'heavy') {
            const progress = 1 - (this.attackTimer / 0.8);
            if (progress < 0.3) allowRotation = true;
        }

        if (target && allowRotation) {
            this.mesh.lookAt(target.mesh.position.x, this.mesh.position.y, target.mesh.position.z);
        }

        this.updateIK();
    }

    smoothRot(tx, ty, tz, speed, dt) {
        this.armPivot.rotation.x += (tx - this.armPivot.rotation.x) * speed * dt;
        this.armPivot.rotation.y += (ty - this.armPivot.rotation.y) * speed * dt;
        this.armPivot.rotation.z += (tz - this.armPivot.rotation.z) * speed * dt;
        this.weaponGroup.rotation.z += (0 - this.weaponGroup.rotation.z) * speed * dt;
    }

    updateIK() {
        this.mesh.updateMatrixWorld();
        const armPole = new THREE.Vector3(0, -1, -0.5);
        this.solveLimbIK('left', this.ikJoints, this.handTargets.left, this.shoulderPos.left, armPole, true);
        this.solveLimbIK('right', this.ikJoints, this.handTargets.right, this.shoulderPos.right, armPole, true);

        const leftFootWorld = this.footTargets.left.clone().applyMatrix4(this.mesh.matrixWorld);
        leftFootWorld.y = this.footTargets.left.y;

        const rightFootWorld = this.footTargets.right.clone().applyMatrix4(this.mesh.matrixWorld);
        rightFootWorld.y = this.footTargets.right.y;

        const legPole = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);

        this.solveLimbIK('left', this.ikJointsLegs, null, this.hipPos.left, legPole, false, leftFootWorld);
        this.solveLimbIK('right', this.ikJointsLegs, null, this.hipPos.right, legPole, false, rightFootWorld);
    }

    dash(dir) {
        if (this.actionLockoutTimer > 0) return;
        if (this.dashCooldown > 0 || this.stunTimer > 0) return;

        // Use GameLogic
        if (!GL.canPerformAction(this.stamina, 'dash')) return;
        this.stamina = GL.consumeStamina(this.stamina, 'dash');
        this.staminaTimer = CONSTANTS.REGEN_DELAY;

        this.isAttacking = false;
        this.isCharging = false;
        this.attackTimer = 0;
        this.isHealing = false;
        if (this.isPlayer) {
            mouse.clickInvalidated = true;
            gamepadState.attackInvalidated = true;
        }

        this.velocity.set(0, 0, 0);
        this.velocity.add(dir.clone().normalize().multiplyScalar(CONSTANTS.DASH_SPEED));
        this.dashCooldown = 0.5;
        this.invulnTimer = 0.2;
        createParticles(this.mesh.position, 10, 0x555555);
        if (this.isPlayer) AudioSystem.playDash();
    }

    startSpecial() {
        this.isSpecialAttacking = true;
        this.specialType = this.config.specialName;
        this.attackTimer = 3.0;
        if (this.specialType === 'Death Lunge') this.attackTimer = 0.8;
        if (this.specialType === 'Earthshaker') this.attackTimer = 1.0;
        if (this.specialType === 'Phantom Flurry') this.attackTimer = 1.5;

        this.isAttacking = false;
        this.isCharging = false;
        this.hasSlammed = false;
    }

    solveLimbIK(side, jointsObj, targetObj, rootLocalPos, poleVec, isTargetChild, explicitWorldTarget = null) {
        const joint = jointsObj[side];
        const rootWorldPos = rootLocalPos.clone().applyMatrix4(this.mesh.matrixWorld);
        let endWorldPos;
        if (explicitWorldTarget) {
            endWorldPos = explicitWorldTarget;
        } else {
            endWorldPos = new THREE.Vector3();
            targetObj.getWorldPosition(endWorldPos);
        }

        const start = rootWorldPos;
        const end = endWorldPos;
        const axis = new THREE.Vector3().subVectors(end, start);
        const len = axis.length();
        const dir = axis.clone().normalize();
        const l1 = joint.upperLen;
        const l2 = joint.lowerLen;
        const reach = Math.min(len, l1 + l2 - 0.001);
        const cosAlpha = (l1 * l1 + reach * reach - l2 * l2) / (2 * l1 * reach);
        const alpha = Math.acos(Math.max(-1, Math.min(1, cosAlpha)));

        const proj = dir.clone().multiplyScalar(poleVec.dot(dir));
        const up = new THREE.Vector3().subVectors(poleVec, proj).normalize();
        const adjacent = Math.cos(alpha) * l1;
        const opposite = Math.sin(alpha) * l1;

        const elbowPos = start.clone()
            .add(dir.clone().multiplyScalar(adjacent))
            .add(up.multiplyScalar(opposite));

        const localStart = this.mesh.worldToLocal(start.clone());
        const localElbow = this.mesh.worldToLocal(elbowPos.clone());
        const localEnd = this.mesh.worldToLocal(end.clone());

        joint.upper.position.copy(localStart);
        joint.upper.lookAt(this.mesh.localToWorld(localElbow.clone()));
        joint.lower.position.copy(localElbow);
        joint.lower.lookAt(this.mesh.localToWorld(localEnd.clone()));
    }

    attack(type = 'light') {
        if (this.actionLockoutTimer > 0) return;
        if (this.isAttacking || this.isBlocking || this.stunTimer > 0 || this.isHealing || this.isSpecialAttacking) return;

        // Use GameLogic
        if (!GL.canPerformAction(this.stamina, type)) return;
        this.stamina = GL.consumeStamina(this.stamina, type);
        this.staminaTimer = CONSTANTS.REGEN_DELAY;

        this.isAttacking = true;
        this.attackType = type;
        this.hasHit = false;

        this.attackTimer = GL.getAttackDuration(type);
        if (type === 'heavy') {
            this.swingType = 0;
        } else {
            this.swingType = Math.random() < 0.5 ? 1 : 2;
        }
    }

    block(isHolding) {
        if (this.actionLockoutTimer > 0 || this.isHealing || this.isSpecialAttacking) {
            this.isBlocking = false;
            return;
        }

        if (this.isAttacking || this.stunTimer > 0) return;
        if (!this.isBlocking && isHolding) {
            this.parryTimer = CONSTANTS.PARRY_WINDOW;
        }
        this.isBlocking = isHolding;
        if (this.parryTimer > 0) this.parryTimer -= 0.016;
    }

    heal() {
        if (this.actionLockoutTimer > 0 || this.isHealing || this.isAttacking || this.isBlocking || this.stunTimer > 0 || this.isSpecialAttacking) return;
        if (this.estusCharges <= 0 || this.health >= this.maxHealth) return;

        this.isHealing = true;
        this.healTimer = 1.0;
        this.estusCharges--;
        this.staminaTimer = CONSTANTS.REGEN_DELAY;
        if (this.isPlayer) AudioSystem.playHeal();
    }

    takeHit(dmg, postureDmg) {
        if (this.invulnTimer > 0) {
            createFloatingText("DODGE", this.mesh.position.clone().add(new THREE.Vector3(0, 2, 0)), '#ffffff');
            return;
        }

        // Damage multiplier handled by GameLogic usually, but here applied conditionally
        if (this.stunTimer > 0) dmg *= 1.5;
        this.health -= dmg;
        this.posture += postureDmg;

        this.isHealing = false;

        this.mesh.position.add(new THREE.Vector3((Math.random() - 0.5) * 0.5, 0, (Math.random() - 0.5) * 0.5));
        createParticles(this.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), 15, 0x8a0303);

        hitStopTimer = 0.08;
        AudioSystem.playHit();

        if (GL.isPostureBroken(this.posture, this.maxPosture)) {
            this.stunTimer = 1.0;
            this.posture = this.maxPosture;
            createFloatingText("BROKEN", this.mesh.position, '#e6a72e');
            AudioSystem.playPostureBreak();
        }
        if (this.health <= 0) {
            endGame(this.isPlayer ? false : true);
        }
    }
}

function createShockwave(pos) {
    const mat = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
    });
    // Reuse geometry, create new material (needed for opacity fade)
    const mesh = new THREE.Mesh(SHOCKWAVE_GEO, mat);
    mesh.position.copy(pos);
    mesh.position.y = 0.1;
    mesh.rotation.x = -Math.PI / 2;
    scene.add(mesh);
    shockwaves.push({ mesh: mesh, scale: 1.0, alpha: 0.8 });
}

function updateShockwaves(dt) {
    for (let i = shockwaves.length - 1; i >= 0; i--) {
        let sw = shockwaves[i];
        sw.scale += 20 * dt;
        sw.alpha -= 1.5 * dt;

        sw.mesh.scale.set(sw.scale, sw.scale, sw.scale);
        sw.mesh.material.opacity = sw.alpha;

        if (sw.alpha <= 0) {
            scene.remove(sw.mesh);
            sw.mesh.material.dispose();
            shockwaves.splice(i, 1);
        }
    }
}

function startGame() {
    const bossName = document.getElementById('bossNameInput').value || "Unknown";
    const playerName = document.getElementById('playerNameInput').value || "Wolf";
    const mapSelect = document.getElementById('mapSelect');
    let mapType = mapSelect.value;

    // Initialize audio on first user interaction
    AudioSystem.init();

    document.getElementById('hudBossName').innerText = bossName;
    document.getElementById('localPlayerName').innerText = playerName;
    document.getElementById('statusText').textContent = 'Connecting...';
    document.getElementById('startBtn').disabled = true;

    // Show loading screen
    document.getElementById('loadingScreen').classList.remove('hidden');

    // Blur any active element
    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }

    // Initialize multiplayer
    NetworkManager.init().then(() => {
        return NetworkManager.joinOrCreateSession(bossName, mapType, playerName);
    }).then(sessionData => {
        // Use session's map if joining existing game
        if (sessionData && !sessionData.offline && sessionData.mapType) {
            mapType = sessionData.mapType;
        }

        // Hide loading, show game
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('menu').classList.add('hidden');
        document.getElementById('hud').style.display = 'block';
        document.getElementById('endScreen').classList.add('hidden');
        document.getElementById('endScreen').classList.remove('show-death', 'death-screen', 'victory-screen');
        document.getElementById('startBtn').disabled = false;

        // Request pointer lock for immersive controls
        renderer.domElement.requestPointerLock?.();

        // Clean up existing characters
        if (player && player.mesh) scene.remove(player.mesh);
        if (boss && boss.mesh) scene.remove(boss.mesh);
        for (const [id, remote] of Object.entries(remotePlayers)) {
            if (remote.character && remote.character.mesh) {
                scene.remove(remote.character.mesh);
            }
        }
        remotePlayers = {};

        // Initialize Map
        createEnvironment(mapType);

        // Get Boss Configuration using GameLogic
        const bossConfig = GL.getBossConfig(bossName);

        // Show boss archetype in HUD
        const archetypeEl = document.getElementById('hudBossArchetype');
        if (archetypeEl) {
            archetypeEl.innerText = bossConfig.type ? bossConfig.type.charAt(0).toUpperCase() + bossConfig.type.slice(1) : '';
            archetypeEl.style.color = '#' + new THREE.Color(bossConfig.color || 0xaaaaaa).getHexString();
        }
        // Determine spawn position based on player count
        const existingPlayers = Object.keys(remotePlayers).length;
        const spawnAngle = existingPlayers * (Math.PI * 2 / 6);
        const spawnPos = new THREE.Vector3(
            Math.sin(spawnAngle) * 6,
            0,
            Math.cos(spawnAngle) * 6
        );

        // Create Characters
        const playerColor = PLAYER_COLORS[existingPlayers % PLAYER_COLORS.length];
        player = new Character(true, playerColor, spawnPos);
        boss = new Character(false, bossConfig, new THREE.Vector3(0, 0, -5));

        // Add aura glow light to boss
        if (bossConfig.aura) {
            const auraLight = new THREE.PointLight(bossConfig.aura.color, bossConfig.aura.intensity * 0.5, 8);
            auraLight.position.set(0, 1.5, 0);
            boss.mesh.add(auraLight);
            boss.auraLight = auraLight;
        }

        // Store base boss stats for scaling
        baseBossHealth = boss.maxHealth;
        baseBossPosture = boss.maxPosture;

        // Reset aura state
        bossAuraParticles.forEach(p => { scene.remove(p); p.material.dispose(); });
        bossAuraParticles = [];
        bossAuraTimer = 0;

        // Scale boss if there are already other players
        scaleBossForPlayerCount();

        NetworkManager.updatePlayerCount();

        gameState = 'PLAYING';
        clock.start();

        if (isHost) {
        } else {
        }
    }).catch(err => {
        console.error('[Game] Failed to start game:', err);
        document.getElementById('statusText').textContent = 'Connection failed - playing offline';
        document.getElementById('startBtn').disabled = false;

        // Fall back to offline mode
        setTimeout(() => {
            document.getElementById('menu').classList.add('hidden');
            document.getElementById('hud').style.display = 'block';

            createEnvironment(mapType);
            const bossConfig = GL.getBossConfig(bossName);

            // Show boss archetype in HUD (offline)
            const archetypeEl = document.getElementById('hudBossArchetype');
            if (archetypeEl) {
                archetypeEl.innerText = bossConfig.type ? bossConfig.type.charAt(0).toUpperCase() + bossConfig.type.slice(1) : '';
                archetypeEl.style.color = '#' + new THREE.Color(bossConfig.color || 0xaaaaaa).getHexString();
            }

            document.getElementById('loadingScreen').classList.add('hidden');
            player = new Character(true, 0xaaaaaa, new THREE.Vector3(0, 0, 5));
            boss = new Character(false, bossConfig, new THREE.Vector3(0, 0, -5));

            // Add aura glow light to boss (offline)
            if (bossConfig.aura) {
                const auraLight = new THREE.PointLight(bossConfig.aura.color, bossConfig.aura.intensity * 0.5, 8);
                auraLight.position.set(0, 1.5, 0);
                boss.mesh.add(auraLight);
                boss.auraLight = auraLight;
            }

            baseBossHealth = boss.maxHealth;
            baseBossPosture = boss.maxPosture;

            // Reset aura state for offline
            bossAuraParticles.forEach(p => { scene.remove(p); p.material.dispose(); });
            bossAuraParticles = [];

            gameState = 'PLAYING';
            clock.start();
        }, 1000);
    });
}

function updatePhysics(dt) {
    if (gameState !== 'PLAYING') return;

    // Sync local player to network
    NetworkManager.syncLocalPlayer();

    // Update remote players
    NetworkManager.updateRemotePlayers(dt);

    // --- GAMEPAD POLLING ---
    let gpMove = new THREE.Vector3();
    let gpAttack = false;
    let gpBlock = false;
    let gpDash = false;
    let gpHeal = false;

    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];

    if (gp) {
        const dz = 0.15;
        let lx = gp.axes[0];
        let ly = gp.axes[1];
        if (Math.abs(lx) < dz) lx = 0;
        if (Math.abs(ly) < dz) ly = 0;
        gpMove.set(lx, 0, ly);

        if (gp.buttons[0].pressed) gpDash = true;
        if (gp.buttons[4].pressed || gp.buttons[6].pressed) gpBlock = true;
        if (gp.buttons[2].pressed || gp.buttons[5].pressed) gpAttack = true;
        if (gp.buttons[3].pressed) gpHeal = true;

        if (gpAttack) {
            if (!gamepadState.attackPressed) {
                gamepadState.attackPressed = true;
                gamepadState.attackStartTime = performance.now();
                gamepadState.attackInvalidated = false;
            } else {
                if (!player.isAttacking && !player.isBlocking && !gamepadState.attackInvalidated) {
                    if (performance.now() - gamepadState.attackStartTime > CONSTANTS.CHARGE_THRESHOLD) {
                        player.isCharging = true;
                    }
                }
            }
        } else {
            if (gamepadState.attackPressed) {
                if (!player.isAttacking && !gamepadState.attackInvalidated) {
                    const duration = performance.now() - gamepadState.attackStartTime;
                    if (duration < CONSTANTS.CHARGE_THRESHOLD) {
                        player.attack('light');
                    } else if (player.isCharging) {
                        player.attack('heavy');
                    }
                }
                player.isCharging = false;
                gamepadState.attackPressed = false;
            }
        }

        if (gpDash && !gamepadState.dashPressed) {
            const forward = new THREE.Vector3();
            forward.subVectors(boss.mesh.position, player.mesh.position).normalize();
            forward.y = 0;
            const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

            let dashDir = new THREE.Vector3();
            if (gpMove.length() > 0.1) {
                dashDir.add(forward.clone().multiplyScalar(-gpMove.z));
                dashDir.add(right.clone().multiplyScalar(gpMove.x));
            } else {
                dashDir = forward.clone().negate();
            }
            player.dash(dashDir.normalize());
        }
        gamepadState.dashPressed = gpDash;

        if (gpHeal && !gamepadState.healPressed) {
            player.heal();
        }
        gamepadState.healPressed = gpHeal;
    }

    if (mouse.left && !player.isAttacking && !player.isBlocking && !mouse.clickInvalidated) {
        if (performance.now() - clickStartTime > CONSTANTS.CHARGE_THRESHOLD) {
            player.isCharging = true;
        }
    }

    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();

    forward.subVectors(boss.mesh.position, player.mesh.position).normalize();
    forward.y = 0;

    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const moveDir = new THREE.Vector3();
    if (keys.w) moveDir.add(forward);
    if (keys.s) moveDir.sub(forward);
    if (keys.a) moveDir.sub(right);
    if (keys.d) moveDir.add(right);

    if (gp && gpMove.length() > 0.1) {
        moveDir.add(forward.clone().multiplyScalar(-gpMove.z));
        moveDir.add(right.clone().multiplyScalar(gpMove.x));
    }

    if (moveDir.length() > 0 && !player.isHealing) {
        moveDir.normalize();
        const moveStep = moveDir.clone().multiplyScalar(player.moveSpeed * dt);
        player.mesh.position.add(moveStep);
    }

    if (keys.space) {
        const dashDir = (moveDir.length() > 0) ? moveDir.clone() : forward.clone().negate();
        player.dash(dashDir);
        keys.space = false;
    }

    if (keys.e) {
        player.heal();
        keys.e = false;
    }

    resolveCollision(player.mesh.position, player.bodyRadius);

    if (player.dashCooldown > 0) player.dashCooldown -= dt;

    player.block(mouse.right || gpBlock);

    // Only run boss AI if we're the host
    if (isHost) {
        updateBossAI(dt);
        NetworkManager.syncBossState();
    }

    resolveCollision(boss.mesh.position, boss.bodyRadius);

    // Get current boss target for updates
    const bossTarget = selectBossTarget();
    const bossTargetChar = bossTarget ? bossTarget.character : player;

    player.update(dt, boss);
    boss.update(dt, bossTargetChar);

    // Handle attacks between local player and boss
    handleAttacks(player, boss, dt);
    handleAttacks(boss, player, dt);

    // Handle attacks between boss and remote players
    for (const [id, remote] of Object.entries(remotePlayers)) {
        handleAttacks(boss, remote.character, dt);
    }

    const midPoint = player.mesh.position.clone().add(boss.mesh.position).multiplyScalar(0.5);
    const camOffset = player.mesh.position.clone().sub(boss.mesh.position).normalize().multiplyScalar(7);
    camOffset.y = 4;

    const idealPos = player.mesh.position.clone().add(camOffset);
    camera.position.lerp(idealPos, 0.1);

    if (cameraShake > 0) {
        camera.position.add(new THREE.Vector3((Math.random() - 0.5) * cameraShake, (Math.random() - 0.5) * cameraShake, 0));
        cameraShake *= 0.9;
        if (cameraShake < 0.1) cameraShake = 0;
    }
    camera.lookAt(boss.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0)));

    // Boss aura
    updateBossAura(dt);
}

function getAvoidanceForce(pos) {
    const force = new THREE.Vector3();
    const detectRange = 2.5;

    obstacles.forEach(obs => {
        const toMe = new THREE.Vector3().subVectors(pos, obs.pos);
        toMe.y = 0;
        const dist = toMe.length();
        const overlap = (obs.radius + detectRange) - dist;

        if (overlap > 0) {
            force.add(toMe.normalize().multiplyScalar(overlap * 0.6));
        }
    });

    const distFromCenter = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
    if (distFromCenter > 40) {
        const toCenter = pos.clone().negate().normalize();
        force.add(toCenter.multiplyScalar((distFromCenter - 40) * 1.0));
    }

    return force;
}

function updateBossAI(dt) {
    if (!isHost) {
        // Only host controls boss AI
        return;
    }
    if (boss.stunTimer > 0) {
        boss.block(false);
        return;
    }

    // Select target using intelligent targeting
    const targetInfo = selectBossTarget();
    if (!targetInfo) return;

    const target = targetInfo.character;
    const dist = target.mesh.position.distanceTo(boss.mesh.position);
    const vecToTarget = target.mesh.position.clone().sub(boss.mesh.position).normalize();

    if (target.stunTimer > 0) {
        if (boss.aiState !== 'ATTACK' && boss.aiState !== 'ATTACK_PREP' && boss.aiState !== 'RECOVER') {
            if (dist < 4.5) {
                boss.aiState = 'ATTACK_PREP';
                boss.aiTimer = 0.0;
            } else {
                boss.aiState = 'CHASE';
            }
        }
    }

    if (target.isAttacking && target.attackTimer > 0.15 && dist < 6.0 &&
        boss.aiState !== 'DEFEND' && boss.aiState !== 'ATTACK' &&
        boss.aiState !== 'PERILOUS_PREP' && boss.aiState !== 'RECOVER' &&
        !target.isHealing && !target.stunTimer) {

        let reactChance = 0.15;
        if (target.attackType === 'heavy') reactChance = 0.3;

        if (boss.aiWeights.parryMaster) reactChance += 0.2;
        if (boss.aiWeights.dodge > 0.7) reactChance += 0.1;

        if (Math.random() < reactChance) {
            const roll = Math.random();
            const defendThreshold = boss.aiWeights.parryMaster ? 0.7 : 0.3;

            if (roll < defendThreshold) {
                boss.aiState = 'DEFEND';
                boss.aiTimer = 0.5;
            } else {
                const right = new THREE.Vector3(0, 1, 0).cross(vecToTarget).normalize();
                const sideDir = Math.random() < 0.5 ? 1 : -1;
                const dodgeDir = vecToTarget.clone().negate().multiplyScalar(0.8)
                    .add(right.multiplyScalar(sideDir * 1.5))
                    .normalize();
                boss.dash(dodgeDir);
                boss.aiState = 'RECOVER';
                boss.aiTimer = 0.2;
            }
        }
    }

    if (boss.aiState === 'DEFEND') {
        boss.block(true);
        boss.aiTimer -= dt;
        boss.mesh.lookAt(target.mesh.position.x, boss.mesh.position.y, target.mesh.position.z);
        if (boss.aiTimer <= 0 || !target.isAttacking) {
            boss.block(false);
            if (dist < 3.5) {
                boss.aiState = 'ATTACK_PREP';
                boss.aiTimer = 0.1;
            } else {
                boss.aiState = 'STRAFE';
                boss.aiTimer = 1.0;
            }
        }
        return;
    } else {
        boss.block(false);
    }

    if (boss.aiState === 'IDLE') {
        boss.aiTimer -= dt;
        if (boss.aiTimer <= 0) {
            const roll = Math.random();
            if (dist < 3.0) {
                if (roll < boss.aiWeights.aggro) {
                    boss.aiState = 'ATTACK_PREP';
                    boss.aiTimer = 0.2;
                } else {
                    boss.dash(vecToTarget.clone().negate());
                    boss.aiState = 'STRAFE';
                    boss.aiTimer = 0.5;
                }
            } else if (dist > 8.0) {
                boss.aiState = 'CHASE';
                boss.aiTimer = 3.0;
            } else {
                if (roll < boss.aiWeights.strafe) {
                    boss.aiState = 'STRAFE';
                    boss.aiTimer = 0.5 + Math.random();
                    boss.strafeDir = Math.random() < 0.5 ? 1 : -1;
                } else {
                    boss.aiState = 'PERILOUS_PREP';
                    boss.aiTimer = 0.6;
                    showKanji();
                }
            }
        }
    } else if (boss.aiState === 'CHASE') {
        const moveDir = vecToTarget.clone();
        moveDir.add(getAvoidanceForce(boss.mesh.position));
        moveDir.normalize();

        const isPunishing = (target.stunTimer > 0 || target.isHealing);
        const chaseMult = isPunishing ? 2.0 : 1.2;

        const moveStep = moveDir.multiplyScalar(boss.moveSpeed * chaseMult * dt);
        boss.mesh.position.add(moveStep);
        boss.mesh.lookAt(target.mesh.position.x, boss.mesh.position.y, target.mesh.position.z);

        if (dist < 3.5) {
            boss.aiState = 'ATTACK_PREP';
            boss.aiTimer = 0.1;
        }

        if (!isPunishing) {
            boss.aiTimer -= dt;
            if (boss.aiTimer <= 0) boss.aiState = 'STRAFE';
        }

    } else if (boss.aiState === 'STRAFE') {
        const right = new THREE.Vector3(0, 1, 0).cross(vecToTarget).normalize();
        let moveDir = right.multiplyScalar(boss.strafeDir);
        if (dist > 5.0) moveDir.add(vecToTarget.clone().multiplyScalar(0.5));
        if (dist < 4.0) moveDir.sub(vecToTarget.clone().multiplyScalar(0.5));
        moveDir.add(getAvoidanceForce(boss.mesh.position));
        moveDir.normalize();
        boss.mesh.position.add(moveDir.multiplyScalar(boss.moveSpeed * dt));
        boss.mesh.lookAt(target.mesh.position.x, boss.mesh.position.y, target.mesh.position.z);
        boss.aiTimer -= dt;
        if (boss.aiTimer <= 0) {
            boss.aiState = 'IDLE';
            boss.aiTimer = 0;
        }
        if (dist < 4.5 && Math.random() < (boss.aiWeights.aggro * 0.1)) {
            boss.aiState = 'ATTACK_PREP';
            boss.aiTimer = 0.1;
        }

    } else if (boss.aiState === 'ATTACK_PREP') {
        boss.mesh.lookAt(target.mesh.position.x, boss.mesh.position.y, target.mesh.position.z);
        boss.aiTimer -= dt;
        if (boss.aiTimer <= 0) {
            if (target.stunTimer > 0 || target.isHealing) {
                boss.attack('heavy');
            } else {
                if (Math.random() < boss.aiWeights.heavyChance) {
                    boss.attack('heavy');
                } else {
                    boss.attack('light');
                }
            }
            boss.aiState = 'RECOVER';
            boss.aiTimer = 0.8;
        }
    } else if (boss.aiState === 'PERILOUS_PREP') {
        boss.mesh.children.forEach(c => {
            if (c.material) c.material.emissive = new THREE.Color(0xff0000);
        });
        boss.mesh.lookAt(target.mesh.position.x, boss.mesh.position.y, target.mesh.position.z);
        boss.aiTimer -= dt;
        if (boss.aiTimer <= 0) {
            boss.startSpecial();
            boss.mesh.children.forEach(c => {
                if (c.material) c.material.emissive = new THREE.Color(0x000000);
            });
            boss.aiState = 'RECOVER';
            boss.aiTimer = 2.0;
        }
    } else if (boss.aiState === 'RECOVER') {
        boss.aiTimer -= dt;
        if (boss.aiTimer <= 0) {
            boss.aiState = 'STRAFE';
            boss.aiTimer = 0.5;
            boss.strafeDir = Math.random() < 0.5 ? 1 : -1;
        }
    }
}

function handleAttacks(attacker, defender, dt) {
    if (attacker.isSpecialAttacking) {
        let hit = false;
        const defPos = defender.mesh.position;
        const dist = attacker.mesh.position.distanceTo(defPos);

        if (attacker.specialType === 'Whirlwind') {
            if (dist < 4.0) hit = true;
        } else if (attacker.specialType === 'Phantom Flurry') {
            if (dist < 3.0) hit = true;
        } else if (attacker.specialType === 'Earthshaker') {
            if (attacker.attackTimer < 0.3 && dist < 7.0) hit = true;
        } else if (attacker.specialType === 'Death Lunge') {
            if (attacker.attackTimer < 0.15 && dist < 5.0) {
                const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(attacker.mesh.quaternion);
                const toDef = defPos.clone().sub(attacker.mesh.position).normalize();
                if (forward.dot(toDef) > 0.9) hit = true;
            }
        }

        if (hit && !attacker.hasHit) {
            attacker.hasHit = true;
            let unblockable = (attacker.specialType === 'Earthshaker' || attacker.specialType === 'Death Lunge');
            if (defender.isBlocking && !unblockable) {
                createSparks(defender.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 5, 0xffffff);
                defender.posture += 40;
                defender.health -= 5;
            } else {
                defender.takeHit(25, 40);
                cameraShake = 1.0;
            }
        }
        return;
    }

    if (attacker.isAttacking) {
        attacker.attackTimer -= dt;

        // Use GameLogic for hit windows
        if (GL.isInHitWindow(attacker.attackTimer, attacker.attackType) && !attacker.hasHit) {
            let hitRegistered = false;
            const defPos = defender.mesh.position;
            const defRadius = defender.bodyRadius + 0.3;

            for (let pt of attacker.hitboxPoints) {
                const worldPt = new THREE.Vector3();
                pt.getWorldPosition(worldPt);
                const distXZ = Math.sqrt(Math.pow(worldPt.x - defPos.x, 2) + Math.pow(worldPt.z - defPos.z, 2));
                if (distXZ < defRadius && worldPt.y > 0.5 && worldPt.y < 2.0) {
                    hitRegistered = true;
                    break;
                }
            }

            if (hitRegistered) {
                attacker.hasHit = true;
                // Use GameLogic for damage calculation
                const damageInfo = GL.calculateDamage(attacker.attackType, defender.stunTimer > 0);
                let damage = damageInfo.damage;
                let postureDmg = damageInfo.postureDamage;
                let blocked = false;

                if (defender.isBlocking) {
                    const defForward = new THREE.Vector3(0, 0, 1).applyQuaternion(defender.mesh.quaternion);
                    const toAttacker = attacker.mesh.position.clone().sub(defender.mesh.position).normalize();
                    if (defForward.dot(toAttacker) > 0.4) {
                        blocked = true;
                    }
                }

                if (blocked) {
                    if (!GL.canPerformAction(defender.stamina, 'block')) {
                        defender.stamina = 0;
                        defender.takeHit(damage, postureDmg);
                        createFloatingText("GUARD BREAK", defender.mesh.position.clone().add(new THREE.Vector3(0, 2, 0)), '#ff0000');
                    } else {
                        defender.stamina = GL.consumeStamina(defender.stamina, 'block');
                        defender.staminaTimer = CONSTANTS.REGEN_DELAY;

                        const isParry = GL.isWithinParryWindow(defender.parryTimer);
                        const blockInfo = GL.calculateBlockedDamage(attacker.attackType, isParry);

                        if (isParry) {
                            createSparks(defender.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 20, 0xffaa00);
                            defender.posture += blockInfo.postureDamage;
                            attacker.posture += blockInfo.attackerPostureDamage;
                            createFloatingText("DEFLECT", defender.mesh.position.clone().add(new THREE.Vector3(0, 2, 0)), '#fff5a6');
                            AudioSystem.playParry();
                            cameraShake = 0.5;
                            attacker.attackTimer = 0;
                            attacker.actionLockoutTimer = 0.15;
                        } else {
                            createSparks(defender.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 5, 0xffffff);
                            defender.posture += blockInfo.postureDamage;
                            defender.health -= blockInfo.healthDamage;
                            AudioSystem.playSwordClash();
                        }
                    }
                } else {
                    defender.takeHit(damage, postureDmg);
                    cameraShake = attacker.attackType === 'heavy' ? 1.2 : 0.6;
                    if (attacker.attackType === 'heavy') {
                        defender.actionLockoutTimer = 0.15;
                    }
                }
            }
        }

        if (attacker.attackTimer <= 0) {
            attacker.isAttacking = false;
            attacker.hasHit = false;
        }
    }
}

function createParticles(pos, count, colorHex) {
    const mat = new THREE.MeshBasicMaterial({ color: colorHex });
    for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(PARTICLE_GEO, mat);
        mesh.position.copy(pos);
        mesh.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 5,
            (Math.random() * 5),
            (Math.random() - 0.5) * 5
        );
        scene.add(mesh);
        particles.push(mesh);
    }
}

function createSparks(pos, count, color) {
    createParticles(pos, count, color);
    const light = new THREE.PointLight(color, 2, 5);
    light.position.copy(pos);
    scene.add(light);
    setTimeout(() => scene.remove(light), 100);
}

function updateEffects(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.position.add(p.velocity.clone().multiplyScalar(dt));
        p.velocity.y -= 20 * dt;
        p.scale.multiplyScalar(0.9);

        if (p.position.y < 0 || p.scale.x < 0.01) {
            scene.remove(p);
            particles.splice(i, 1);
        }
    }

    updateShockwaves(dt);
}

let floatingTexts = [];
function createFloatingText(text, pos, color) {
    const el = document.createElement('div');
    el.innerText = text;
    el.style.position = 'absolute';
    el.style.color = color;
    el.style.fontWeight = 'bold';
    el.style.fontSize = '24px';
    el.style.fontFamily = 'Cinzel';
    el.style.textShadow = '0 0 5px black';
    el.style.pointerEvents = 'none';
    document.body.appendChild(el);

    floatingTexts.push({
        el: el,
        pos: pos.clone(),
        life: 1.0
    });
}

function updateFloatingTexts(dt) {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const t = floatingTexts[i];
        t.life -= dt;
        t.pos.y += 1 * dt;

        const vector = t.pos.clone().project(camera);
        const x = (vector.x * .5 + .5) * window.innerWidth;
        const y = (-(vector.y * .5) + .5) * window.innerHeight;

        t.el.style.left = `${x}px`;
        t.el.style.top = `${y}px`;
        t.el.style.opacity = t.life;

        if (t.life <= 0) {
            t.el.remove();
            floatingTexts.splice(i, 1);
        }
    }
}

function showKanji() {
    const el = document.getElementById('kanji');
    el.style.opacity = 1;
    el.style.transform = "translate(-50%, -50%) scale(1.5)";
    AudioSystem.playPerilous();
    setTimeout(() => {
        el.style.opacity = 0;
        el.style.transform = "translate(-50%, -50%) scale(1)";
    }, 800);
}

// ============================================
// BOSS AURA PARTICLE SYSTEM
// ============================================
function updateBossAura(dt) {
    if (!boss || !boss.config || !boss.config.aura) return;

    const aura = boss.config.aura;
    bossAuraTimer += dt;

    // Pulse the aura light
    if (boss.auraLight) {
        const healthRatio = boss.health / boss.maxHealth;
        const pulse = Math.sin(Date.now() * 0.003) * 0.3 + 0.7;
        const intensityBase = healthRatio < 0.3 ? aura.intensity * 2.0 : aura.intensity * 0.5;
        boss.auraLight.intensity = intensityBase * pulse;
        if (healthRatio < 0.3) {
            boss.auraLight.color.setHex(0xff0000);
        }
    }

    // Emit new aura particles based on rate (and intensity scales with low health)
    const healthRatio = boss.health / boss.maxHealth;
    const intensityMult = healthRatio < 0.3 ? 2.5 : (healthRatio < 0.5 ? 1.6 : 1.0);
    const emitRate = aura.rate * intensityMult;

    if (bossAuraTimer > (1 / (emitRate * 30))) {
        bossAuraTimer = 0;

        const color = healthRatio < 0.3 ? 0xff0000 : aura.color;
        const mat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: aura.intensity * 0.8
        });

        const p = new THREE.Mesh(AURA_PARTICLE_GEO, mat);

        // Spawn around the boss body
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.3 + Math.random() * 0.8 * boss.baseScale;
        p.position.set(
            boss.mesh.position.x + Math.cos(angle) * radius,
            0.2 + Math.random() * 2.0 * boss.baseScale,
            boss.mesh.position.z + Math.sin(angle) * radius
        );

        const s = aura.size * (0.8 + Math.random() * 0.6);
        p.scale.set(s * 15, s * 15, s * 15);

        p.userData = {
            life: 0.8 + Math.random() * 0.6,
            maxLife: 0.8 + Math.random() * 0.6,
            vx: Math.cos(angle) * 0.3,
            vy: 1.0 + Math.random() * 1.5,
            vz: Math.sin(angle) * 0.3,
            rotSpeed: (Math.random() - 0.5) * 3
        };

        scene.add(p);
        bossAuraParticles.push(p);
    }

    // Update existing aura particles
    for (let i = bossAuraParticles.length - 1; i >= 0; i--) {
        const p = bossAuraParticles[i];
        const d = p.userData;
        d.life -= dt;

        p.position.x += d.vx * dt;
        p.position.y += d.vy * dt;
        p.position.z += d.vz * dt;

        // Spiral inward slightly
        const toBoss = new THREE.Vector3(
            boss.mesh.position.x - p.position.x,
            0,
            boss.mesh.position.z - p.position.z
        );
        p.position.x += toBoss.x * 0.5 * dt;
        p.position.z += toBoss.z * 0.5 * dt;

        p.rotation.y += d.rotSpeed * dt;

        const lifeRatio = d.life / d.maxLife;
        p.material.opacity = lifeRatio * aura.intensity * 0.6;
        p.scale.multiplyScalar(0.995);

        if (d.life <= 0 || p.scale.x < 0.01) {
            scene.remove(p);
            p.material.dispose();
            bossAuraParticles.splice(i, 1);
        }
    }
}

function animate() {
    requestAnimationFrame(animate);

    // Hit Stop Logic
    if (hitStopTimer > 0) {
        hitStopTimer -= 0.016;
        renderer.render(scene, camera);
        return;
    }

    let dt = clock.getDelta();
    // Cap delta time to prevent physics explosions
    if (dt > 0.1) dt = 0.1;

    if (gameState === 'PLAYING') {
        updatePhysics(dt);
        updateEffects(dt);
        updateFloatingTexts(dt);

        const pHP = Math.max(0, (player.health / player.maxHealth) * 100);
        const pPost = Math.max(0, (player.posture / player.maxPosture) * 100);
        const pStam = Math.max(0, (player.stamina / CONSTANTS.STAMINA_MAX) * 100);
        const bHP = Math.max(0, (boss.health / boss.maxHealth) * 100);
        const bPost = Math.max(0, (boss.posture / boss.maxPosture) * 100);

        document.getElementById('playerHealth').style.width = `${pHP}%`;
        document.getElementById('playerPosture').style.width = `${pPost}%`;
        document.getElementById('playerStamina').style.width = `${pStam}%`;
        document.getElementById('bossHealth').style.width = `${bHP}%`;
        document.getElementById('bossPosture').style.width = `${bPost}%`;
        document.getElementById('flaskCount').innerText = player.estusCharges;
    }

    renderer.render(scene, camera);
}

function endGame(victory) {
    gameState = 'ENDED';
    document.exitPointerLock?.();
    const endScreen = document.getElementById('endScreen');
    const endText = document.getElementById('endText');
    const bossName = document.getElementById('hudBossName').innerText;

    endScreen.classList.remove('hidden');

    if (victory) {
        endScreen.classList.add('victory-screen');

        const winMessages = [
            "IMMORTALITY SEVERED",
            `${bossName} FALLEN`,
            "PREY SLAUGHTERED",
            "NIGHTMARE SLAIN",
            "LEGEND ENDED",
            "VICTORY ACHIEVED",
            "FATE DEFIED"
        ];
        const msg = winMessages[Math.floor(Math.random() * winMessages.length)];

        endText.innerText = msg;
        endText.classList.remove('death-text');
        endText.classList.add('victory-text');
        createSparks(boss.mesh.position, 100, 0xe6a72e);
    } else {
        endScreen.classList.add('death-screen');

        const loseMessages = [
            "DEATH",
            "YOU DIED",
            `CRUSHED BY ${bossName}`,
            "UNWORTHY",
            "FATE SEALED",
            `YIELD TO ${bossName}`,
            "EXTINGUISHED",
            "BROKEN"
        ];
        const msg = loseMessages[Math.floor(Math.random() * loseMessages.length)];

        endText.innerText = msg;
        endText.classList.remove('victory-text');
        endText.classList.add('death-text');
        setTimeout(() => endScreen.classList.add('show-death'), 100);
    }
}

function resetGame() {
    NetworkManager.cleanup();
    document.exitPointerLock?.();

    // Clean up boss aura particles
    bossAuraParticles.forEach(p => { scene.remove(p); p.material.dispose(); });
    bossAuraParticles = [];
    bossAuraTimer = 0;

    document.getElementById('endScreen').classList.add('hidden');
    document.getElementById('menu').classList.remove('hidden');
    document.getElementById('hud').style.display = 'none';
    document.getElementById('statusText').textContent = '';
    document.getElementById('allyHuds').innerHTML = '';
    document.getElementById('playerCount').textContent = 'Players: 1';

    floatingTexts.forEach(t => t.el.remove());
    floatingTexts = [];

    gameState = 'MENU';
}

initThree();

document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('resurrectBtn').addEventListener('click', resetGame);