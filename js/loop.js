// Constants
const SAVE_INTERVAL = 10000; // 10 seconds
const MILLISECONDS_TO_SECONDS = 1000;

const TAB_CHANGE_COOLDOWN = 0.25;
let TAB_CHANGE_CUR_TIME = 0;

// Core game loop handling all mechanics
function gameLoop() {
  const now = Date.now();
  const deltaTime = calculateDeltaTime(now);

  updateSingularity(deltaTime);
  processGenerators(deltaTime);
  handleKeyboardInput(deltaTime);

  player.lastUpdate = now;
  requestAnimationFrame(gameLoop);
}

function calculateDeltaTime(now) {
  return (now - player.lastUpdate) / MILLISECONDS_TO_SECONDS;
}

function updateSingularity(deltaTime) {
  // Check unlock condition
  if (player.generators[0].prestigeAmount.exponent >= singularityUnlockExp) {
    player.singularity.unlocked = true;
  }

  // Generate currency if unlocked
  if (player.singularity.unlocked) {
    const baseRate =
      player.generators[0].prestigeAmount.max(1).log(10) / singularityUnlockExp;
    player.singularity.currencyAmount += Math.pow(baseRate, 3) * deltaTime;
  }
}

function processGenerators(deltaTime) {
  for (
    let tierIndex = player.generators.length - 1;
    tierIndex >= 0;
    tierIndex--
  ) {
    const generator = player.generators[tierIndex];

    processGeneratorTier(generator, tierIndex, deltaTime);
    handleAutomation(generator, tierIndex);
    processPrestige(tierIndex, deltaTime);
  }
}

function processGeneratorTier(generator, tierIndex, deltaTime) {
  for (let level = generator.list.length - 1; level >= 0; level--) {
    const gain = calculateGain(generator, tierIndex, level, deltaTime);
    distributeResources(generator, tierIndex, level, gain);
  }
}

function calculateGain(generator, tierIndex, level, deltaTime) {
  return generator.list[level].amount
    .times(getMult(tierIndex, level))
    .times(deltaTime);
}

function distributeResources(generator, tierIndex, level, gain) {
  if (level === 0) {
    if (tierIndex === 0) {
      generator.prestigeAmount = generator.prestigeAmount.plus(gain);
    } else {
      generator.currencyAmount = generator.currencyAmount.plus(gain);
    }
  } else {
    generator.list[level - 1].amount =
      generator.list[level - 1].amount.plus(gain);
  }
}

function handleAutomation(generator, tierIndex) {
  if (generator.autoMaxAll) {
    maxAll(tierIndex);
  }
}

function processPrestige(tierIndex, deltaTime) {
  const currentGen = player.generators[tierIndex];
  if (currentGen.prestigeGain && tierIndex < player.generators.length - 1) {
    const nextGen = player.generators[tierIndex + 1];
    const gain = getPrestigeGain(currentGen.prestigeAmount).times(deltaTime);
    nextGen.prestigeAmount = nextGen.prestigeAmount.plus(gain);
  }
}


// Constants for key mappings
const KEYS = {
  MAX_ALL: 'm',
  TAB_LEFT: 'a',
  TAB_RIGHT: 'd',
  PRESTIGE: 'r'
};

// Constants for timing
const TAB_CONTROLS = {
  COOLDOWN: .15, // seconds
  currentCooldown: 0
};

/**
 * Handles keyboard input for game controls
 * @param {number} deltaTime - Time elapsed since last frame in milliseconds
 * @param {Object} player - Player state object
 * @param {Object} app - Application context with key press state
 */
function handleKeyboardInput(deltaTime) {
  updateTabCooldown(deltaTime);
  
  // Early return if no keys are pressed
  if (!app.keyPressed) return;
  
  const actions = {
    [KEYS.MAX_ALL]: () => handleMaxAll(),
    [KEYS.TAB_LEFT]: () => handleTabChange(-1),
    [KEYS.TAB_RIGHT]: () => handleTabChange(1),
    [KEYS.PRESTIGE]: () => handlePrestige()
  };

  // Execute action if key is pressed
  Object.entries(actions).forEach(([key, action]) => {
    if (app.keyPressed(key)) action();
  });
}

/**
 * Updates the tab change cooldown timer
 * @param {number} deltaTime - Time elapsed since last frame
 */
function updateTabCooldown(deltaTime) {
  if (TAB_CONTROLS.currentCooldown > 0) {
    TAB_CONTROLS.currentCooldown = Math.max(0, TAB_CONTROLS.currentCooldown - deltaTime);
  }
}

/**
 * Handles the max all action
 */
function handleMaxAll() {
  app.maxAll(player.tab);
}

/**
 * Handles tab change in either direction
 * @param {number} direction - Direction to change tab (-1 for left, 1 for right)
 */
function handleTabChange(direction) {
  if (TAB_CONTROLS.currentCooldown > 0) return;
  
  const newTab = player.tab + direction;
  player.tab = clamp(newTab, 0, player.generators.length - 1);
  TAB_CONTROLS.currentCooldown = TAB_CONTROLS.COOLDOWN;
}

/**
 * Handles prestige action
 */
function handlePrestige() {
  const currentGen = player.generators[player.tab];
  if (getPrestigeGain(currentGen.prestigeAmount).gt(0)) {
    app.prestige(player.tab);
  }
}

/**
 * Clamps a number between min and max values
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
// Initialize game
function initializeGame() {
  loadGame();
  setInterval(saveGame, SAVE_INTERVAL);
  gameLoop();
}

initializeGame();
