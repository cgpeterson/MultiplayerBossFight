/**
 * Unit Tests for Shadow Duel 3D Game Logic
 */

const {
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
} = require('./gameLogic');

// ============================================
// COMBAT CALCULATIONS
// ============================================

describe('Combat Calculations', () => {
    describe('calculateDamage', () => {
        it('should return correct damage for light attack', () => {
            const result = calculateDamage('light');
            expect(result.damage).toBe(15);
            expect(result.postureDamage).toBe(25);
        });

        it('should return correct damage for heavy attack', () => {
            const result = calculateDamage('heavy');
            expect(result.damage).toBe(40);
            expect(result.postureDamage).toBe(60);
        });

        it('should apply 1.5x damage multiplier when target is stunned', () => {
            const result = calculateDamage('light', true);
            expect(result.damage).toBe(22); // 15 * 1.5 = 22.5, floored to 22
        });

        it('should apply 1.5x damage multiplier for heavy attack on stunned target', () => {
            const result = calculateDamage('heavy', true);
            expect(result.damage).toBe(60); // 40 * 1.5 = 60
        });
    });

    describe('calculateBlockedDamage', () => {
        it('should return chip damage for blocked light attack', () => {
            const result = calculateBlockedDamage('light', false);
            expect(result.healthDamage).toBe(3);
            expect(result.postureDamage).toBe(30);
            expect(result.attackerPostureDamage).toBe(0);
        });

        it('should return chip damage for blocked heavy attack', () => {
            const result = calculateBlockedDamage('heavy', false);
            expect(result.healthDamage).toBe(10);
            expect(result.postureDamage).toBe(70);
        });

        it('should return parry result for perfect parry on light attack', () => {
            const result = calculateBlockedDamage('light', true);
            expect(result.healthDamage).toBe(0);
            expect(result.postureDamage).toBe(5);
            expect(result.attackerPostureDamage).toBe(35);
        });

        it('should return parry result for perfect parry on heavy attack', () => {
            const result = calculateBlockedDamage('heavy', true);
            expect(result.attackerPostureDamage).toBe(80);
        });
    });

    describe('isPostureBroken', () => {
        it('should return true when posture equals max', () => {
            expect(isPostureBroken(100, 100)).toBe(true);
        });

        it('should return true when posture exceeds max', () => {
            expect(isPostureBroken(150, 100)).toBe(true);
        });

        it('should return false when posture is below max', () => {
            expect(isPostureBroken(50, 100)).toBe(false);
        });
    });

    describe('calculateHealAmount', () => {
        it('should heal 40% of max health by default', () => {
            expect(calculateHealAmount(100)).toBe(40);
        });

        it('should allow custom heal percentage', () => {
            expect(calculateHealAmount(100, 0.5)).toBe(50);
        });

        it('should floor the result', () => {
            expect(calculateHealAmount(75, 0.4)).toBe(30);
        });
    });
});

// ============================================
// STAMINA MANAGEMENT
// ============================================

describe('Stamina Management', () => {
    describe('canPerformAction', () => {
        it('should return true when stamina is sufficient for dash', () => {
            expect(canPerformAction(20, 'dash')).toBe(true);
        });

        it('should return false when stamina is insufficient for dash', () => {
            expect(canPerformAction(19, 'dash')).toBe(false);
        });

        it('should return true when stamina is sufficient for light attack', () => {
            expect(canPerformAction(15, 'light')).toBe(true);
        });

        it('should return false when stamina is insufficient for heavy attack', () => {
            expect(canPerformAction(29, 'heavy')).toBe(false);
        });

        it('should return true for unknown action', () => {
            expect(canPerformAction(0, 'unknown')).toBe(true);
        });
    });

    describe('consumeStamina', () => {
        it('should reduce stamina by dash cost', () => {
            expect(consumeStamina(100, 'dash')).toBe(80);
        });

        it('should reduce stamina by light attack cost', () => {
            expect(consumeStamina(100, 'light')).toBe(85);
        });

        it('should reduce stamina by heavy attack cost', () => {
            expect(consumeStamina(100, 'heavy')).toBe(70);
        });

        it('should not go below zero', () => {
            expect(consumeStamina(10, 'dash')).toBe(0);
        });
    });

    describe('regenerateStamina', () => {
        it('should regenerate stamina over time', () => {
            const result = regenerateStamina(50, 1);
            expect(result).toBe(80); // 50 + 30 * 1
        });

        it('should not exceed max stamina', () => {
            const result = regenerateStamina(90, 1);
            expect(result).toBe(100);
        });

        it('should use custom max stamina', () => {
            const result = regenerateStamina(90, 1, 150);
            expect(result).toBe(120);
        });
    });
});

// ============================================
// BOSS CONFIGURATION
// ============================================

describe('Boss Configuration', () => {
    describe('hashString', () => {
        it('should return consistent hash for same string', () => {
            const hash1 = hashString('Sword Saint');
            const hash2 = hashString('Sword Saint');
            expect(hash1).toBe(hash2);
        });

        it('should return different hash for different strings', () => {
            const hash1 = hashString('Boss A');
            const hash2 = hashString('Boss B');
            expect(hash1).not.toBe(hash2);
        });

        it('should return 0 for empty string', () => {
            expect(hashString('')).toBe(0);
        });
    });

    describe('getBossConfig', () => {
        it('should return a valid boss configuration', () => {
            const config = getBossConfig('Test Boss');
            expect(config).toHaveProperty('type');
            expect(config).toHaveProperty('health');
            expect(config).toHaveProperty('posture');
            expect(config).toHaveProperty('speed');
            expect(config).toHaveProperty('ai');
        });

        it('should return consistent config for same name', () => {
            const config1 = getBossConfig('Sword Saint');
            const config2 = getBossConfig('Sword Saint');
            expect(config1.type).toBe(config2.type);
        });

        it('should return one of the defined archetypes', () => {
            const config = getBossConfig('Random Boss');
            const archetypeTypes = Object.values(BOSS_ARCHETYPES).map(a => a.type);
            expect(archetypeTypes).toContain(config.type);
        });
    });

    describe('scaleBossStats', () => {
        it('should not scale for single player', () => {
            const result = scaleBossStats(300, 200, 1);
            expect(result.maxHealth).toBe(300);
            expect(result.maxPosture).toBe(200);
        });

        it('should scale health by 60% per additional player', () => {
            const result = scaleBossStats(300, 200, 2);
            expect(result.maxHealth).toBe(480); // 300 * 1.6
        });

        it('should scale posture by 40% per additional player', () => {
            const result = scaleBossStats(300, 200, 2);
            expect(result.maxPosture).toBe(280); // 200 * 1.4
        });

        it('should handle multiple players correctly', () => {
            const result = scaleBossStats(300, 200, 4);
            expect(result.maxHealth).toBe(840); // 300 * (1 + 3 * 0.6) = 300 * 2.8
            expect(result.maxPosture).toBe(440); // 200 * (1 + 3 * 0.4) = 200 * 2.2
        });
    });
});

// ============================================
// COLLISION DETECTION
// ============================================

describe('Collision Detection', () => {
    describe('calculateDistance', () => {
        it('should return 0 for same position', () => {
            const pos = { x: 5, z: 5 };
            expect(calculateDistance(pos, pos)).toBe(0);
        });

        it('should calculate horizontal distance correctly', () => {
            const pos1 = { x: 0, z: 0 };
            const pos2 = { x: 3, z: 4 };
            expect(calculateDistance(pos1, pos2)).toBe(5);
        });

        it('should handle negative coordinates', () => {
            const pos1 = { x: -3, z: 0 };
            const pos2 = { x: 0, z: 4 };
            expect(calculateDistance(pos1, pos2)).toBe(5);
        });
    });

    describe('checkCircleCollision', () => {
        it('should detect collision when circles overlap', () => {
            const pos1 = { x: 0, z: 0 };
            const pos2 = { x: 1, z: 0 };
            expect(checkCircleCollision(pos1, 1, pos2, 1)).toBe(true);
        });

        it('should not detect collision when circles are apart', () => {
            const pos1 = { x: 0, z: 0 };
            const pos2 = { x: 5, z: 0 };
            expect(checkCircleCollision(pos1, 1, pos2, 1)).toBe(false);
        });

        it('should detect collision when circles touch exactly', () => {
            const pos1 = { x: 0, z: 0 };
            const pos2 = { x: 2, z: 0 };
            // Distance is 2, radii sum is 2, so they're touching but not overlapping
            expect(checkCircleCollision(pos1, 1, pos2, 1)).toBe(false);
        });
    });

    describe('isWithinArena', () => {
        it('should return true for center position', () => {
            expect(isWithinArena({ x: 0, z: 0 })).toBe(true);
        });

        it('should return true for position within arena', () => {
            expect(isWithinArena({ x: 30, z: 30 })).toBe(true);
        });

        it('should return false for position outside arena', () => {
            expect(isWithinArena({ x: 50, z: 0 })).toBe(false);
        });

        it('should use custom arena radius', () => {
            expect(isWithinArena({ x: 15, z: 0 }, 10)).toBe(false);
        });
    });

    describe('clampToArena', () => {
        it('should not modify position within arena', () => {
            const pos = { x: 10, z: 10 };
            const result = clampToArena(pos);
            expect(result.x).toBe(10);
            expect(result.z).toBe(10);
        });

        it('should clamp position outside arena', () => {
            const pos = { x: 96, z: 0 }; // Distance is 96, arena radius is 48
            const result = clampToArena(pos);
            expect(result.x).toBe(48);
            expect(result.z).toBe(0);
        });

        it('should not mutate original position', () => {
            const pos = { x: 96, z: 0 };
            clampToArena(pos);
            expect(pos.x).toBe(96);
        });
    });
});

// ============================================
// ATTACK TIMING
// ============================================

describe('Attack Timing', () => {
    describe('getAttackDuration', () => {
        it('should return 0.3 for light attack', () => {
            expect(getAttackDuration('light')).toBe(0.3);
        });

        it('should return 0.8 for heavy attack', () => {
            expect(getAttackDuration('heavy')).toBe(0.8);
        });
    });

    describe('isInHitWindow', () => {
        it('should return true during hit window for light attack', () => {
            // Light attack: duration 0.3, hit window is 0.21 to 0.06
            expect(isInHitWindow(0.15, 'light')).toBe(true);
        });

        it('should return false before hit window', () => {
            expect(isInHitWindow(0.25, 'light')).toBe(false);
        });

        it('should return false after hit window', () => {
            expect(isInHitWindow(0.05, 'light')).toBe(false);
        });

        it('should work correctly for heavy attack', () => {
            // Heavy attack: duration 0.8, hit window is 0.56 to 0.16
            expect(isInHitWindow(0.4, 'heavy')).toBe(true);
        });
    });

    describe('isWithinParryWindow', () => {
        it('should return true when parry timer is positive', () => {
            expect(isWithinParryWindow(0.1)).toBe(true);
        });

        it('should return false when parry timer is zero', () => {
            expect(isWithinParryWindow(0)).toBe(false);
        });

        it('should return false when parry timer is negative', () => {
            expect(isWithinParryWindow(-0.1)).toBe(false);
        });
    });
});

// ============================================
// AI TARGET SCORING
// ============================================

describe('AI Target Scoring', () => {
    describe('calculateThreatScore', () => {
        const bossPos = { x: 0, z: 0 };
        
        const createTarget = (overrides = {}) => ({
            id: 'player1',
            position: { x: 5, z: 0 },
            isAttacking: false,
            hasHit: false,
            isStunned: false,
            isHealing: false,
            health: 100,
            maxHealth: 100,
            ...overrides
        });

        it('should prefer closer targets', () => {
            const closeTarget = createTarget({ position: { x: 2, z: 0 } });
            const farTarget = createTarget({ position: { x: 10, z: 0 } });
            
            const closeScore = calculateThreatScore(closeTarget, bossPos);
            const farScore = calculateThreatScore(farTarget, bossPos);
            
            expect(closeScore).toBeGreaterThan(farScore);
        });

        it('should prioritize attacking targets', () => {
            const attacking = createTarget({ isAttacking: true });
            const passive = createTarget({ isAttacking: false });
            
            const attackingScore = calculateThreatScore(attacking, bossPos);
            const passiveScore = calculateThreatScore(passive, bossPos);
            
            expect(attackingScore).toBeGreaterThan(passiveScore);
        });

        it('should prioritize stunned targets', () => {
            const stunned = createTarget({ isStunned: true });
            const normal = createTarget({ isStunned: false });
            
            const stunnedScore = calculateThreatScore(stunned, bossPos);
            const normalScore = calculateThreatScore(normal, bossPos);
            
            expect(stunnedScore).toBeGreaterThan(normalScore);
        });

        it('should prioritize healing targets', () => {
            const healing = createTarget({ isHealing: true });
            const normal = createTarget({ isHealing: false });
            
            const healingScore = calculateThreatScore(healing, bossPos);
            const normalScore = calculateThreatScore(normal, bossPos);
            
            expect(healingScore).toBeGreaterThan(normalScore);
        });

        it('should prioritize low health targets', () => {
            const lowHealth = createTarget({ health: 20, maxHealth: 100 });
            const fullHealth = createTarget({ health: 100, maxHealth: 100 });
            
            const lowHealthScore = calculateThreatScore(lowHealth, bossPos);
            const fullHealthScore = calculateThreatScore(fullHealth, bossPos);
            
            expect(lowHealthScore).toBeGreaterThan(fullHealthScore);
        });

        it('should give bonus to current target (sticky targeting)', () => {
            const target = createTarget({ id: 'player1' });
            
            const stickyScore = calculateThreatScore(target, bossPos, 'player1');
            const nonStickyScore = calculateThreatScore(target, bossPos, 'player2');
            
            expect(stickyScore).toBeGreaterThan(nonStickyScore);
        });
    });
});

// ============================================
// CONSTANTS VALIDATION
// ============================================

describe('Game Constants', () => {
    it('should have all required constants defined', () => {
        expect(GAME_CONSTANTS.PLAYER_SPEED).toBeDefined();
        expect(GAME_CONSTANTS.DASH_SPEED).toBeDefined();
        expect(GAME_CONSTANTS.STAMINA_MAX).toBeDefined();
        expect(GAME_CONSTANTS.PARRY_WINDOW).toBeDefined();
    });

    it('should have reasonable values', () => {
        expect(GAME_CONSTANTS.PLAYER_SPEED).toBeGreaterThan(0);
        expect(GAME_CONSTANTS.DASH_SPEED).toBeGreaterThan(GAME_CONSTANTS.PLAYER_SPEED);
        expect(GAME_CONSTANTS.STAMINA_MAX).toBe(100);
        expect(GAME_CONSTANTS.PARRY_WINDOW).toBeGreaterThan(0);
        expect(GAME_CONSTANTS.PARRY_WINDOW).toBeLessThan(1);
    });
});
