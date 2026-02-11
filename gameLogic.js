/**
 * Game Logic Module - Pure functions for game mechanics
 * Universal Module Definition (UMD) for Browser and Node.js compatibility.
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        // Node.js/CommonJS
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.GameLogic = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {

    // ============================================
    // CONSTANTS
    // ============================================
    const GAME_CONSTANTS = {
        PLAYER_SPEED: 10,
        DASH_SPEED: 30,
        BOSS_SPEED: 6,
        PARRY_WINDOW: 0.2,
        CHARGE_THRESHOLD: 200,
        STAMINA_MAX: 100,
        COST_DASH: 20,
        COST_LIGHT: 15,
        COST_HEAVY: 30,
        COST_BLOCK_HIT: 10,
        REGEN_RATE: 30,
        REGEN_DELAY: 0.8,
        ARENA_RADIUS: 48
    };

    // ============================================
    // COMBAT CALCULATIONS
    // ============================================

    function calculateDamage(attackType, isTargetStunned = false) {
        const baseDamage = attackType === 'heavy' ? 40 : 15;
        const basePosture = attackType === 'heavy' ? 60 : 25;

        const damageMultiplier = isTargetStunned ? 1.5 : 1.0;

        return {
            damage: Math.floor(baseDamage * damageMultiplier),
            postureDamage: basePosture
        };
    }

    function calculateBlockedDamage(attackType, isParry = false) {
        if (isParry) {
            return {
                healthDamage: 0,
                postureDamage: 5,
                attackerPostureDamage: attackType === 'heavy' ? 80 : 35
            };
        }

        return {
            healthDamage: attackType === 'heavy' ? 10 : 3,
            postureDamage: attackType === 'heavy' ? 70 : 30,
            attackerPostureDamage: 0
        };
    }

    function isPostureBroken(currentPosture, maxPosture) {
        return currentPosture >= maxPosture;
    }

    function calculateHealAmount(maxHealth, healPercent = 0.4) {
        return Math.floor(maxHealth * healPercent);
    }

    // ============================================
    // STAMINA MANAGEMENT
    // ============================================

    function canPerformAction(currentStamina, action) {
        const costs = {
            dash: GAME_CONSTANTS.COST_DASH,
            light: GAME_CONSTANTS.COST_LIGHT,
            heavy: GAME_CONSTANTS.COST_HEAVY,
            block: GAME_CONSTANTS.COST_BLOCK_HIT
        };

        return currentStamina >= (costs[action] || 0);
    }

    function consumeStamina(currentStamina, action) {
        const costs = {
            dash: GAME_CONSTANTS.COST_DASH,
            light: GAME_CONSTANTS.COST_LIGHT,
            heavy: GAME_CONSTANTS.COST_HEAVY,
            block: GAME_CONSTANTS.COST_BLOCK_HIT
        };

        return Math.max(0, currentStamina - (costs[action] || 0));
    }

    function regenerateStamina(currentStamina, deltaTime, maxStamina = GAME_CONSTANTS.STAMINA_MAX) {
        const regenAmount = GAME_CONSTANTS.REGEN_RATE * deltaTime;
        return Math.min(maxStamina, currentStamina + regenAmount);
    }

    // ============================================
    // BOSS CONFIGURATION
    // ============================================

    const BOSS_ARCHETYPES = {
        agile: {
            type: 'agile',
            color: 0x00bcd4,
            health: 250,
            posture: 120,
            speed: 9,
            scale: 1.1,
            ai: { aggro: 0.4, defend: 0.1, dodge: 0.8, strafe: 0.8, heavyChance: 0.2 },
            specialName: "Phantom Flurry",
            aura: { color: 0x00bcd4, intensity: 0.6, rate: 0.4, size: 0.08 },
        },
        aggressive: {
            type: 'aggressive',
            color: 0xd32f2f,
            health: 400,
            posture: 200,
            speed: 7.5,
            scale: 1.4,
            ai: { aggro: 0.9, defend: 0.05, dodge: 0.1, strafe: 0.1, heavyChance: 0.7 },
            specialName: "Whirlwind",
            aura: { color: 0xff3300, intensity: 1.0, rate: 0.6, size: 0.12 },
        },
        tank: {
            type: 'tank',
            color: 0x607d8b,
            health: 600,
            posture: 350,
            speed: 4,
            scale: 1.5,
            ai: { aggro: 0.3, defend: 0.8, dodge: 0.0, strafe: 0.2, heavyChance: 0.9 },
            specialName: "Earthshaker",
            aura: { color: 0x607d8b, intensity: 0.4, rate: 0.2, size: 0.15 },
        },
        duelist: {
            type: 'duelist',
            color: 0x9c27b0,
            health: 300,
            posture: 250,
            speed: 6,
            scale: 1.2,
            ai: { aggro: 0.5, defend: 0.6, dodge: 0.4, strafe: 0.5, heavyChance: 0.4, parryMaster: true },
            specialName: "Death Lunge",
            aura: { color: 0x9c27b0, intensity: 0.7, rate: 0.3, size: 0.10 },
        }
    };

    function hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return hash;
    }

    function getBossConfig(name) {
        const hash = hashString(name);
        const keys = Object.keys(BOSS_ARCHETYPES);
        const index = Math.abs(hash) % keys.length;
        return { ...BOSS_ARCHETYPES[keys[index]] };
    }

    // ============================================
    // BOSS SCALING
    // ============================================

    function scaleBossStats(baseHealth, basePosture, playerCount) {
        const healthMultiplier = 1 + (playerCount - 1) * 0.6;
        const postureMultiplier = 1 + (playerCount - 1) * 0.4;

        return {
            maxHealth: Math.floor(baseHealth * healthMultiplier),
            maxPosture: Math.floor(basePosture * postureMultiplier)
        };
    }

    // ============================================
    // COLLISION & UTILS
    // ============================================

    function calculateDistance(pos1, pos2) {
        const dx = pos1.x - pos2.x;
        const dz = pos1.z - pos2.z;
        return Math.sqrt(dx * dx + dz * dz);
    }

    function checkCircleCollision(pos1, radius1, pos2, radius2) {
        const distance = calculateDistance(pos1, pos2);
        return distance < (radius1 + radius2);
    }

    function isWithinArena(pos, arenaRadius = GAME_CONSTANTS.ARENA_RADIUS) {
        const distanceFromCenter = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
        return distanceFromCenter <= arenaRadius;
    }

    function clampToArena(pos, arenaRadius = GAME_CONSTANTS.ARENA_RADIUS) {
        const distanceFromCenter = Math.sqrt(pos.x * pos.x + pos.z * pos.z);

        if (distanceFromCenter > arenaRadius) {
            const scale = arenaRadius / distanceFromCenter;
            return {
                x: pos.x * scale,
                z: pos.z * scale
            };
        }

        return { ...pos };
    }

    function getAttackDuration(attackType) {
        return attackType === 'heavy' ? 0.8 : 0.3;
    }

    function isInHitWindow(attackTimer, attackType) {
        const duration = getAttackDuration(attackType);
        const hitStart = duration * 0.7;
        const hitEnd = duration * 0.2;

        return attackTimer < hitStart && attackTimer > hitEnd;
    }

    function isWithinParryWindow(parryTimer) {
        return parryTimer > 0;
    }

    function calculateThreatScore(target, bossPos, currentTargetId = null) {
        let score = 0;

        const distance = calculateDistance(bossPos, target.position);

        // Prefer closer targets
        score -= distance * 2;

        // Prefer targets that are attacking
        if (target.isAttacking) score += 50;

        // Prefer targets that just hit the boss
        if (target.hasHit) score += 30;

        // Prefer stunned/healing targets (easy punish)
        if (target.isStunned) score += 80;
        if (target.isHealing) score += 60;

        // Prefer low health targets
        const healthPercent = target.health / target.maxHealth;
        if (healthPercent < 0.3) score += 40;

        // Aggro from cumulative damage dealt to boss
        if (target.damageDealt > 0) {
            score += Math.min(target.damageDealt * 0.5, 100);
        }

        // Sticky target bonus
        if (currentTargetId === target.id) {
            score += 25;
        }

        return score;
    }

    // Expose public API
    return {
        GAME_CONSTANTS,
        BOSS_ARCHETYPES,
        calculateDamage,
        calculateBlockedDamage,
        isPostureBroken,
        calculateHealAmount,
        canPerformAction,
        consumeStamina,
        regenerateStamina,
        getBossConfig,
        hashString,
        scaleBossStats,
        calculateDistance,
        checkCircleCollision,
        isWithinArena,
        clampToArena,
        getAttackDuration,
        isInHitWindow,
        isWithinParryWindow,
        calculateThreatScore
    };
}));