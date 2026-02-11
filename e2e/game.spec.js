// @ts-check
const { test, expect } = require('@playwright/test');

// ============================================
// HELPERS
// ============================================

/** Navigate and wait for Three.js canvas to be ready */
async function loadGame(page) {
  await page.goto('/');
  await page.waitForSelector('#game-container canvas', { timeout: 10000 });
}

/** Start a game with the given settings and wait for HUD to appear */
async function startGame(page, { playerName, bossName, map = 'arena' } = {}) {
  await loadGame(page);

  if (playerName !== undefined) {
    await page.locator('#playerNameInput').fill(playerName);
  }
  if (bossName !== undefined) {
    await page.locator('#bossNameInput').fill(bossName);
  }
  if (map) {
    await page.selectOption('#mapSelect', map);
  }

  await page.click('#startBtn');

  // Wait for game to start: menu hidden, HUD visible
  // Firebase may fail — game falls back to offline after ~1s
  await page.waitForFunction(() => {
    const hud = document.getElementById('hud');
    return hud && hud.style.display === 'block';
  }, { timeout: 15000 });
}

/** Force player death via endGame(false) directly — more reliable than takeHit */
async function triggerDeath(page) {
  await page.evaluate(() => {
    // Access the function directly from script scope
    if (typeof endGame === 'function') endGame(false);
  });
  await page.waitForTimeout(300);
}

/** Force victory via endGame(true) directly */
async function triggerVictory(page) {
  await page.evaluate(() => {
    if (typeof endGame === 'function') endGame(true);
  });
  await page.waitForTimeout(300);
}

/** Click the resurrect button using JS to bypass canvas overlay */
async function clickReturn(page) {
  await page.evaluate(() => {
    document.getElementById('resurrectBtn')?.click();
  });
  await page.waitForTimeout(500);
}

// ============================================
// MENU & INITIAL LOAD
// ============================================

test.describe('Menu & Initial Load', () => {
  test('page loads with correct title and meta', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Hollow Duel/);
    const description = await page.getAttribute('meta[name="description"]', 'content');
    expect(description).toContain('souls-like');
  });

  test('menu is visible with all elements on load', async ({ page }) => {
    await loadGame(page);
    await expect(page.locator('#menu')).toBeVisible();
    await expect(page.locator('h1')).toHaveText('Hollow Duel');
    await expect(page.locator('.menu-subtitle')).toHaveText('A Souls-Like Combat Experience');
    await expect(page.locator('#playerNameInput')).toBeVisible();
    await expect(page.locator('#bossNameInput')).toBeVisible();
    await expect(page.locator('#mapSelect')).toBeVisible();
    await expect(page.locator('#startBtn')).toBeVisible();
    await expect(page.locator('#startBtn')).toBeEnabled();
  });

  test('boss name input has default value', async ({ page }) => {
    await loadGame(page);
    await expect(page.locator('#bossNameInput')).toHaveValue('Sword Saint');
  });

  test('map selector has three options', async ({ page }) => {
    await loadGame(page);
    const options = page.locator('#mapSelect option');
    await expect(options).toHaveCount(3);
    await expect(options.nth(0)).toHaveText('Dark Arena');
    await expect(options.nth(1)).toHaveText('Snowy Forest');
    await expect(options.nth(2)).toHaveText('Green Meadow');
  });

  test('player name input respects maxlength of 12', async ({ page }) => {
    await loadGame(page);
    const input = page.locator('#playerNameInput');
    await input.fill('ABCDEFGHIJKLMNOP');
    const value = await input.inputValue();
    expect(value.length).toBeLessThanOrEqual(12);
  });

  test('boss name input respects maxlength of 20', async ({ page }) => {
    await loadGame(page);
    const input = page.locator('#bossNameInput');
    await input.fill('A'.repeat(25));
    const value = await input.inputValue();
    expect(value.length).toBeLessThanOrEqual(20);
  });

  test('controls help text shows keyboard and gamepad bindings', async ({ page }) => {
    await loadGame(page);
    const controls = page.locator('.controls');
    await expect(controls).toBeVisible();
    await expect(controls).toContainText('WASD');
    await expect(controls).toContainText('SPACE');
    await expect(controls).toContainText('L-CLICK');
    await expect(controls).toContainText('R-CLICK');
    await expect(controls).toContainText('L-STICK');
    await expect(controls).toContainText('LB');
  });

  test('end screen and HUD are hidden on load', async ({ page }) => {
    await loadGame(page);
    await expect(page.locator('#endScreen')).toHaveClass(/hidden/);
    const hudDisplay = await page.locator('#hud').evaluate(el => el.style.display);
    expect(hudDisplay === 'none' || hudDisplay === '').toBeTruthy();
  });

  test('loading screen is hidden on initial load', async ({ page }) => {
    await loadGame(page);
    await expect(page.locator('#loadingScreen')).toHaveClass(/hidden/);
  });
});

// ============================================
// THREE.JS / WEBGL RENDERING
// ============================================

test.describe('WebGL Rendering', () => {
  test('Three.js creates a canvas element', async ({ page }) => {
    await loadGame(page);
    await expect(page.locator('#game-container canvas')).toBeAttached();
  });

  test('canvas fills the viewport', async ({ page }) => {
    await loadGame(page);
    const canvasBox = await page.locator('#game-container canvas').boundingBox();
    const viewport = page.viewportSize();
    expect(canvasBox).not.toBeNull();
    expect(canvasBox.width).toBeCloseTo(viewport.width, -1);
    expect(canvasBox.height).toBeCloseTo(viewport.height, -1);
  });

  test('canvas has non-zero dimensions', async ({ page }) => {
    await loadGame(page);
    const dims = await page.evaluate(() => {
      const c = document.querySelector('#game-container canvas');
      return c ? { w: c.width, h: c.height } : null;
    });
    expect(dims).not.toBeNull();
    expect(dims.w).toBeGreaterThan(0);
    expect(dims.h).toBeGreaterThan(0);
  });
});

// ============================================
// GAME START & TRANSITION
// ============================================

test.describe('Game Start & Transition', () => {
  test('clicking start hides menu and shows HUD', async ({ page }) => {
    await startGame(page);
    await expect(page.locator('#menu')).toHaveClass(/hidden/);
    const hudDisplay = await page.locator('#hud').evaluate(el => el.style.display);
    expect(hudDisplay).toBe('block');
  });

  test('player name appears in HUD', async ({ page }) => {
    await startGame(page, { playerName: 'Aragorn' });
    await expect(page.locator('#localPlayerName')).toHaveText('Aragorn');
  });

  test('boss name appears in HUD', async ({ page }) => {
    await startGame(page, { bossName: 'Malenia' });
    await expect(page.locator('#hudBossName')).toHaveText('Malenia');
  });

  test('boss archetype label is one of four valid types', async ({ page }) => {
    await startGame(page, { bossName: 'ArchetypeCheck' });
    // CSS text-transform: uppercase means innerText may be uppercased
    const text = await page.locator('#hudBossArchetype').evaluate(el => el.innerText.trim());
    const validTypes = ['agile', 'aggressive', 'tank', 'duelist'];
    expect(validTypes).toContain(text.toLowerCase());
  });

  test('same boss name always produces same archetype (deterministic)', async ({ page }) => {
    await startGame(page, { bossName: 'DeterministicBoss' });
    const archetype1 = await page.locator('#hudBossArchetype').evaluate(el => el.innerText.trim());

    // Trigger death and reset via JS to avoid canvas click interception
    await triggerDeath(page);
    await clickReturn(page);

    // Start again with same name
    await startGame(page, { bossName: 'DeterministicBoss' });
    const archetype2 = await page.locator('#hudBossArchetype').evaluate(el => el.innerText.trim());

    expect(archetype1).toBe(archetype2);
  });

  test('empty player name defaults to Wolf', async ({ page }) => {
    await startGame(page, { playerName: '' });
    await expect(page.locator('#localPlayerName')).toHaveText('Wolf');
  });

  test('clearing boss name uses fallback', async ({ page }) => {
    // fill('') clears the input; startGame reads .value which is ''
    // game.js: const bossName = ... || "UNKNOWN"
    await loadGame(page);
    await page.locator('#bossNameInput').fill('');
    await page.click('#startBtn');
    await page.waitForFunction(() => {
      const hud = document.getElementById('hud');
      return hud && hud.style.display === 'block';
    }, { timeout: 15000 });
    const bossNameText = await page.locator('#hudBossName').innerText();
    // Should be "UNKNOWN" since the input was empty
      expect(bossNameText).toBe('UNKNOWN');
  });

  test('game state transitions to PLAYING', async ({ page }) => {
    await startGame(page);
    // gameState is a top-level let — not on window, but accessible in evaluate
    const state = await page.evaluate('gameState');
    expect(state).toBe('PLAYING');
  });
});

// ============================================
// HUD ELEMENTS
// ============================================

test.describe('HUD Elements', () => {
  test('all bars are present in the DOM', async ({ page }) => {
    await startGame(page);
    await expect(page.locator('#bossHealth')).toBeAttached();
    await expect(page.locator('#bossPosture')).toBeAttached();
    await expect(page.locator('#playerHealth')).toBeAttached();
    await expect(page.locator('#playerPosture')).toBeAttached();
    await expect(page.locator('#playerStamina')).toBeAttached();
  });

  test('boss health bar starts at 100%', async ({ page }) => {
    await startGame(page);
    await page.waitForTimeout(200);
    const width = await page.locator('#bossHealth').evaluate(el => el.style.width);
    expect(width).toBe('100%');
  });

  test('player health bar starts at 100%', async ({ page }) => {
    await startGame(page);
    await page.waitForTimeout(200);
    const width = await page.locator('#playerHealth').evaluate(el => el.style.width);
    expect(width).toBe('100%');
  });

  test('player stamina bar starts at 100%', async ({ page }) => {
    await startGame(page);
    await page.waitForTimeout(200);
    const width = await page.locator('#playerStamina').evaluate(el => el.style.width);
    expect(width).toBe('100%');
  });

  test('flask count starts at 3', async ({ page }) => {
    await startGame(page);
    await expect(page.locator('#flaskCount')).toHaveText('3');
  });

  test('player count is displayed', async ({ page }) => {
    await startGame(page);
    await expect(page.locator('#playerCount')).toContainText('Players:');
  });

  test('kanji element exists but is not visible', async ({ page }) => {
    await startGame(page);
    const opacity = await page.locator('#kanji').evaluate(el => getComputedStyle(el).opacity);
    expect(opacity).toBe('0');
  });

  test('HUD bars update when player takes damage', async ({ page }) => {
    await startGame(page);
    await page.waitForTimeout(500);

    // Damage the player and wait for the next animation frame to update HUD
    await page.evaluate(() => {
      player.takeHit(30, 20);
    });
    // Wait for animation frame to update DOM
    await page.waitForFunction(() => {
      const hw = parseFloat(document.getElementById('playerHealth').style.width);
      return hw < 100;
    }, { timeout: 3000 });

    const healthWidth = await page.locator('#playerHealth').evaluate(el => parseFloat(el.style.width));
    expect(healthWidth).toBeLessThan(100);
    const postureWidth = await page.locator('#playerPosture').evaluate(el => parseFloat(el.style.width));
    expect(postureWidth).toBeGreaterThan(0);
  });

  test('boss health bar updates when boss takes damage', async ({ page }) => {
    await startGame(page);
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      boss.takeHit(50, 30);
    });
    await page.waitForFunction(() => {
      const hw = parseFloat(document.getElementById('bossHealth').style.width);
      return hw < 100;
    }, { timeout: 3000 });

    const healthWidth = await page.locator('#bossHealth').evaluate(el => parseFloat(el.style.width));
    expect(healthWidth).toBeLessThan(100);
  });
});

// ============================================
// KEYBOARD INPUT DURING GAMEPLAY
// ============================================

test.describe('Keyboard Input', () => {
  test('spacebar does not re-trigger start button during gameplay', async ({ page }) => {
    await startGame(page);
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);
    const hudDisplay = await page.locator('#hud').evaluate(el => el.style.display);
    expect(hudDisplay).toBe('block');
  });

  test('right-click context menu is suppressed', async ({ page }) => {
    await startGame(page);
    // Use page.evaluate to dispatch a real contextmenu event and check if it was prevented
    const prevented = await page.evaluate(() => {
      let wasPrevented = false;
      const handler = (e) => {
        wasPrevented = e.defaultPrevented;
      };
      document.addEventListener('contextmenu', handler, { once: true, capture: true });
      const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      document.querySelector('canvas')?.dispatchEvent(event);
      return wasPrevented || event.defaultPrevented;
    });
    expect(prevented).toBe(true);
  });

  test('game does not crash on rapid key presses', async ({ page }) => {
    await startGame(page);
    for (let i = 0; i < 10; i++) {
      await page.keyboard.down('w');
      await page.keyboard.down('Space');
      await page.keyboard.up('w');
      await page.keyboard.up('Space');
    }
    await page.waitForTimeout(200);
    const state = await page.evaluate('gameState');
    expect(state).toBe('PLAYING');
  });
});

// ============================================
// COMBAT & STAMINA
// ============================================

test.describe('Combat Mechanics', () => {
  test('dashing decreases stamina', async ({ page }) => {
    await startGame(page);
    await page.waitForTimeout(300);

    const before = await page.evaluate('player ? player.stamina : -1');

    await page.keyboard.down('Space');
    await page.waitForTimeout(50);
    await page.keyboard.up('Space');
    await page.waitForTimeout(200);

    const after = await page.evaluate('player ? player.stamina : -1');

    if (before > 0) {
      expect(after).toBeLessThan(before);
    }
  });

  test('stamina bar visually reflects drain after multiple dashes', async ({ page }) => {
    await startGame(page);
    await page.waitForTimeout(300);

    for (let i = 0; i < 3; i++) {
      await page.keyboard.down('Space');
      await page.waitForTimeout(50);
      await page.keyboard.up('Space');
      await page.waitForTimeout(300);
    }

    await page.waitForFunction(() => {
      return parseFloat(document.getElementById('playerStamina').style.width) < 100;
    }, { timeout: 3000 });

    const barWidth = await page.locator('#playerStamina').evaluate(el => parseFloat(el.style.width));
    expect(barWidth).toBeLessThan(100);
  });

  test('stamina regenerates over time', async ({ page }) => {
    await startGame(page);
    await page.waitForTimeout(300);

    // Drain stamina via direct manipulation for reliability
    await page.evaluate(() => {
      player.stamina = 40;
      player.staminaTimer = 0; // Allow immediate regen
    });
    await page.waitForTimeout(100);

    const drained = await page.evaluate('player.stamina');

    // Wait for regen (30/sec rate, so ~2s to regen a lot)
    await page.waitForTimeout(2000);

    const regen = await page.evaluate('player.stamina');
    expect(regen).toBeGreaterThan(drained);
  });

  test('healing with E key decreases flask count when damaged', async ({ page }) => {
    await startGame(page);
    await page.waitForTimeout(500);

    // Set up conditions for heal: damaged, not attacking/blocking, etc.
    await page.evaluate(() => {
      player.health = 50;
      player.isAttacking = false;
      player.isBlocking = false;
      player.isHealing = false;
      player.isSpecialAttacking = false;
      player.stunTimer = 0;
      player.actionLockoutTimer = 0;
    });

    await page.keyboard.press('e');
    await page.waitForTimeout(1200);

    const flaskCount = await page.locator('#flaskCount').innerText();
    expect(parseInt(flaskCount)).toBeLessThanOrEqual(2);
  });

  test('healing does not work at full health', async ({ page }) => {
    await startGame(page);
    await page.waitForTimeout(500);

    // Ensure player is at full health and able to act
    await page.evaluate(() => {
      player.health = player.maxHealth;
      player.isAttacking = false;
      player.isBlocking = false;
      player.isHealing = false;
      player.stunTimer = 0;
      player.actionLockoutTimer = 0;
    });

    await page.keyboard.press('e');
    await page.waitForTimeout(1200);

    const flaskCount = await page.locator('#flaskCount').innerText();
    expect(parseInt(flaskCount)).toBe(3);
  });

  test('light attack does not crash the game', async ({ page }) => {
    await startGame(page);
    await page.waitForTimeout(300);

    // Dispatch a quick click
    await page.evaluate(() => {
      window.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
      setTimeout(() => window.dispatchEvent(new MouseEvent('mouseup', { button: 0 })), 50);
    });
    await page.waitForTimeout(200);

    const state = await page.evaluate('gameState');
    expect(state).toBe('PLAYING');
  });

  test('player posture resets after stun recovery', async ({ page }) => {
    await startGame(page);
    await page.waitForTimeout(300);

    // Break player posture directly
    await page.evaluate(() => {
      player.posture = player.maxPosture + 10;
      player.stunTimer = 1.0;
    });

    // Wait for stun to recover (1s)
    await page.waitForTimeout(1500);

    const posture = await page.evaluate('player ? player.posture : -1');
    expect(posture).toBeLessThanOrEqual(5);
  });
});

// ============================================
// GAME OVER & RESET
// ============================================

test.describe('Game Over & Reset', () => {
  test('death screen appears on player death', async ({ page }) => {
    await startGame(page);
    await page.waitForTimeout(500);
    await triggerDeath(page);

    const endScreen = page.locator('#endScreen');
    await expect(endScreen).not.toHaveClass(/hidden/);
    await expect(endScreen).toHaveClass(/death-screen/);
  });

  test('death message is uppercase text', async ({ page }) => {
    await startGame(page);
    await page.waitForTimeout(500);
    await triggerDeath(page);

    const text = await page.locator('#endText').innerText();
    expect(text.length).toBeGreaterThan(0);
    expect(text).toBe(text.toUpperCase());
  });

  test('victory screen appears on boss death', async ({ page }) => {
    await startGame(page);
    await page.waitForTimeout(500);
    await triggerVictory(page);

    const endScreen = page.locator('#endScreen');
    await expect(endScreen).not.toHaveClass(/hidden/);
    await expect(endScreen).toHaveClass(/victory-screen/);
  });

  test('victory message is uppercase text', async ({ page }) => {
    await startGame(page);
    await page.waitForTimeout(500);
    await triggerVictory(page);

    const text = await page.locator('#endText').innerText();
    expect(text.length).toBeGreaterThan(0);
    expect(text).toBe(text.toUpperCase());
  });

  test('return button is visible and labeled correctly', async ({ page }) => {
    await startGame(page);
    await page.waitForTimeout(500);
    await triggerDeath(page);

    // Check via evaluate since canvas may overlay
    const btnText = await page.evaluate(() => document.getElementById('resurrectBtn')?.innerText);
      expect(btnText).toBe('RETURN');
  });

  test('game state is ENDED after death', async ({ page }) => {
    await startGame(page);
    await page.waitForTimeout(500);
    await triggerDeath(page);

    const state = await page.evaluate('gameState');
    expect(state).toBe('ENDED');
  });

  test('clicking Return resets to menu', async ({ page }) => {
    await startGame(page);
    await page.waitForTimeout(500);
    await triggerDeath(page);
    await clickReturn(page);

    await expect(page.locator('#menu')).not.toHaveClass(/hidden/);
    await expect(page.locator('#endScreen')).toHaveClass(/hidden/);
    const hudDisplay = await page.locator('#hud').evaluate(el => el.style.display);
    expect(hudDisplay).toBe('none');
  });

  test('game state is MENU after reset', async ({ page }) => {
    await startGame(page);
    await page.waitForTimeout(500);
    await triggerDeath(page);
    await clickReturn(page);

    const state = await page.evaluate('gameState');
    expect(state).toBe('MENU');
  });

  test('can start a new game after death and reset', async ({ page }) => {
    await startGame(page, { bossName: 'FirstBoss' });
    await page.waitForTimeout(500);
    await triggerDeath(page);
    await clickReturn(page);

    await startGame(page, { bossName: 'SecondBoss' });
    await expect(page.locator('#hudBossName')).toHaveText('SecondBoss');
    const hudDisplay = await page.locator('#hud').evaluate(el => el.style.display);
    expect(hudDisplay).toBe('block');
  });

  test('can start a new game after victory and reset', async ({ page }) => {
    await startGame(page, { bossName: 'FirstBoss' });
    await page.waitForTimeout(500);
    await triggerVictory(page);
    await clickReturn(page);

    await startGame(page, { bossName: 'ThirdBoss' });
    await expect(page.locator('#hudBossName')).toHaveText('ThirdBoss');
  });

  test('player count resets to 1 after returning to menu', async ({ page }) => {
    await startGame(page);
    await page.waitForTimeout(500);
    await triggerDeath(page);
    await clickReturn(page);

    await expect(page.locator('#playerCount')).toHaveText('Players: 1');
  });
});

// ============================================
// AUDIO SYSTEM
// ============================================

test.describe('Audio System', () => {
  test('AudioSystem exists with all 8 methods', async ({ page }) => {
    await loadGame(page);
    const methods = await page.evaluate(() => {
      const a = AudioSystem;
      if (!a) return [];
      return ['init', 'playSwordClash', 'playParry', 'playHit', 'playDash', 'playHeal', 'playPostureBreak', 'playPerilous']
        .filter(m => typeof a[m] === 'function');
    });
    expect(methods).toHaveLength(8);
  });

  test('all audio methods execute without throwing', async ({ page }) => {
    await startGame(page);
    const errors = await page.evaluate(() => {
      const errs = [];
      const a = AudioSystem;
      ['playSwordClash', 'playParry', 'playHit', 'playDash', 'playHeal', 'playPostureBreak', 'playPerilous'].forEach(m => {
        try { a[m](); } catch (e) { errs.push(m + ': ' + e.message); }
      });
      return errs;
    });
    expect(errors).toHaveLength(0);
  });

  test('AudioSystem initializes on game start', async ({ page }) => {
    await startGame(page);
    const noError = await page.evaluate(() => {
      try {
        AudioSystem.playHit();
        return true;
      } catch { return false; }
    });
    expect(noError).toBe(true);
  });
});

// ============================================
// GAME LOGIC MODULE (in browser context)
// ============================================

test.describe('GameLogic Module in Browser', () => {
  test('GameLogic is available on window', async ({ page }) => {
    await loadGame(page);
    const hasGL = await page.evaluate(() => !!window.GameLogic);
    expect(hasGL).toBe(true);
  });

  test('all four boss archetypes are defined', async ({ page }) => {
    await loadGame(page);
    const types = await page.evaluate(() => Object.keys(window.GameLogic.BOSS_ARCHETYPES).sort());
    expect(types).toEqual(['aggressive', 'agile', 'duelist', 'tank']);
  });

  test('every archetype has aura config', async ({ page }) => {
    await loadGame(page);
    const allHaveAura = await page.evaluate(() => {
      return Object.values(window.GameLogic.BOSS_ARCHETYPES).every(
        (a) => a.aura && a.aura.color !== undefined && a.aura.rate > 0
      );
    });
    expect(allHaveAura).toBe(true);
  });

  test('getBossConfig is deterministic in browser', async ({ page }) => {
    await loadGame(page);
    const match = await page.evaluate(() => {
      const c1 = window.GameLogic.getBossConfig('BrowserTest');
      const c2 = window.GameLogic.getBossConfig('BrowserTest');
      return c1.type === c2.type && c1.health === c2.health && c1.speed === c2.speed;
    });
    expect(match).toBe(true);
  });

  test('different boss names can produce different archetypes', async ({ page }) => {
    await loadGame(page);
    const types = await page.evaluate(() => {
      const names = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta'];
      return [...new Set(names.map(n => window.GameLogic.getBossConfig(n).type))];
    });
    expect(types.length).toBeGreaterThanOrEqual(2);
  });
});

// ============================================
// MAP SELECTION
// ============================================

test.describe('Map Selection', () => {
  for (const map of ['arena', 'snow', 'meadow']) {
    test(`${map} map loads without errors`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await startGame(page, { map });
      await page.waitForTimeout(1000);
      const nonFirebaseErrors = errors.filter(e =>
        !e.includes('firebase') && !e.includes('Firebase') && !e.includes('network')
      );
      expect(nonFirebaseErrors).toHaveLength(0);
    });
  }
});

// ============================================
// RESPONSIVE / VIEWPORT
// ============================================

test.describe('Responsive Behavior', () => {
  test('game renders at 800x600', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    await loadGame(page);
    const box = await page.locator('#game-container canvas').boundingBox();
    expect(box.width).toBeCloseTo(800, -1);
    expect(box.height).toBeCloseTo(600, -1);
  });

  test('menu is usable at narrow mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loadGame(page);
    await expect(page.locator('#startBtn')).toBeVisible();
    await expect(page.locator('#bossNameInput')).toBeVisible();
    await expect(page.locator('h1')).toBeVisible();
  });

  test('canvas resizes when viewport changes', async ({ page }) => {
    await loadGame(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(200);
    const box = await page.locator('#game-container canvas').boundingBox();
    expect(box.width).toBeCloseTo(1024, -1);
    expect(box.height).toBeCloseTo(768, -1);
  });
});

// ============================================
// ERROR RESILIENCE
// ============================================

test.describe('Error Resilience', () => {
  test('no JS errors on fresh page load', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await loadGame(page);
    await page.waitForTimeout(500);
    const real = errors.filter(e =>
      !e.includes('firebase') && !e.includes('Firebase') && !e.includes('network')
    );
    expect(real).toHaveLength(0);
  });

  test('no JS errors during 3 seconds of gameplay', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await startGame(page);
    await page.waitForTimeout(3000);
    const real = errors.filter(e =>
      !e.includes('firebase') && !e.includes('Firebase') && !e.includes('network')
    );
    expect(real).toHaveLength(0);
  });

  test('no JS errors through full game lifecycle', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await startGame(page);
    await page.waitForTimeout(1000);
    await triggerDeath(page);
    await clickReturn(page);
    await startGame(page);
    await page.waitForTimeout(500);
    await triggerVictory(page);
    await clickReturn(page);

    const real = errors.filter(e =>
      !e.includes('firebase') && !e.includes('Firebase') && !e.includes('network')
    );
    expect(real).toHaveLength(0);
  });
});

// ============================================
// CSS & VISUAL POLISH
// ============================================

test.describe('CSS & Visual Polish', () => {
  test('title uses Cormorant Garamond font', async ({ page }) => {
    await loadGame(page);
    const font = await page.locator('h1').evaluate(el => getComputedStyle(el).fontFamily);
    expect(font).toContain('Cormorant Garamond');
  });

  test('title has entry animation', async ({ page }) => {
    await loadGame(page);
    const anim = await page.locator('h1').evaluate(el => getComputedStyle(el).animationName);
    expect(anim).not.toBe('none');
  });

  test('boss health bar has gradient background', async ({ page }) => {
    await startGame(page);
    await page.waitForTimeout(200);
    const bg = await page.locator('#bossHealth').evaluate(el => getComputedStyle(el).backgroundImage);
    expect(bg).toContain('gradient');
  });

  test('boss archetype label has inline color', async ({ page }) => {
    await startGame(page);
    const color = await page.locator('#hudBossArchetype').evaluate(el => el.style.color);
    expect(color).toBeTruthy();
    expect(color).not.toBe('');
  });

  test('menu divider element is present', async ({ page }) => {
    await loadGame(page);
    await expect(page.locator('.menu-divider')).toBeAttached();
  });

  test('flask icon is rendered', async ({ page }) => {
    await startGame(page);
    const icon = page.locator('.flask-icon');
    await expect(icon).toBeAttached();
    const box = await icon.boundingBox();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  });
});
