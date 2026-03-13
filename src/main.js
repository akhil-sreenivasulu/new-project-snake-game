import {
  createInitialState,
  setDirection,
  advance,
  togglePause,
} from "./snakeLogic.js";

const GRID_WIDTH = 16;
const GRID_HEIGHT = 16;
const SPEEDS = {
  slow: 220,
  medium: 160,
  fast: 110,
};
const HIGH_SCORE_KEY = "snake-high-score";

const board = document.getElementById("game-board");
const scoreElement = document.getElementById("score");
const highScoreElement = document.getElementById("high-score");
const statusElement = document.getElementById("status");
const restartButton = document.getElementById("restart-btn");
const pauseButton = document.getElementById("pause-btn");
const mobileControls = document.querySelector(".mobile-controls");
const speedButtons = Array.from(document.querySelectorAll(".speed-btn"));

let state = createInitialState({ width: GRID_WIDTH, height: GRID_HEIGHT });
let lastTick = performance.now();
let audioContext = null;
let currentSpeed = "slow";
let highScore = loadHighScore();

function loadHighScore() {
  try {
    const stored = window.localStorage.getItem(HIGH_SCORE_KEY);
    const parsed = Number.parseInt(stored ?? "0", 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

function saveHighScore(score) {
  try {
    window.localStorage.setItem(HIGH_SCORE_KEY, String(score));
  } catch {}
}

function syncHighScore(score) {
  if (score <= highScore) {
    return;
  }

  highScore = score;
  saveHighScore(highScore);
}

function getAudioContext() {
  if (!window.AudioContext && !window.webkitAudioContext) {
    return null;
  }

  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContextClass();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }

  return audioContext;
}

function playEatSound() {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  const durationSeconds = 0.16;
  const noiseBuffer = context.createBuffer(
    1,
    context.sampleRate * durationSeconds,
    context.sampleRate,
  );
  const channel = noiseBuffer.getChannelData(0);
  for (let index = 0; index < channel.length; index += 1) {
    const fade = 1 - index / channel.length;
    channel[index] = (Math.random() * 2 - 1) * 0.28 * fade;
  }

  const source = context.createBufferSource();
  source.buffer = noiseBuffer;

  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(2200, context.currentTime);
  filter.frequency.exponentialRampToValueAtTime(1400, context.currentTime + durationSeconds);
  filter.Q.setValueAtTime(3.2, context.currentTime);

  const gain = context.createGain();
  gain.gain.setValueAtTime(0.001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.055, context.currentTime + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + durationSeconds);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);

  source.start();
  source.stop(context.currentTime + durationSeconds);
}

function cellClassName(x, y) {
  if (state.food && state.food.x === x && state.food.y === y) {
    return "cell food";
  }

  const snakeIndex = state.snake.findIndex((segment) => segment.x === x && segment.y === y);
  if (snakeIndex === 0) {
    return "cell snake head";
  }
  if (snakeIndex > 0) {
    return "cell snake";
  }
  return "cell";
}

function renderBoard() {
  board.style.setProperty("--grid-width", String(state.width));
  board.style.setProperty("--grid-height", String(state.height));

  const cells = [];
  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      cells.push(`<div class="${cellClassName(x, y)}"></div>`);
    }
  }
  board.innerHTML = cells.join("");
}

function renderHud() {
  scoreElement.textContent = String(state.score);
  highScoreElement.textContent = String(highScore);
  if (state.gameOver) {
    statusElement.textContent = "Game over";
  } else if (state.paused) {
    statusElement.textContent = "Paused";
  } else {
    statusElement.textContent = "Running";
  }
  pauseButton.textContent = state.paused ? "Resume" : "Pause";
}

function render() {
  renderHud();
  renderBoard();
}

function renderSpeedControls() {
  speedButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.speed === currentSpeed);
  });
}

function restart() {
  state = createInitialState({ width: GRID_WIDTH, height: GRID_HEIGHT });
  lastTick = performance.now();
  render();
}

function handleDirectionInput(direction) {
  getAudioContext();
  state = setDirection(state, direction);
}

function handleKeydown(event) {
  const key = event.key.toLowerCase();
  if (key === "arrowup" || key === "w") {
    event.preventDefault();
    handleDirectionInput("up");
  } else if (key === "arrowdown" || key === "s") {
    event.preventDefault();
    handleDirectionInput("down");
  } else if (key === "arrowleft" || key === "a") {
    event.preventDefault();
    handleDirectionInput("left");
  } else if (key === "arrowright" || key === "d") {
    event.preventDefault();
    handleDirectionInput("right");
  } else if (key === " " || key === "p") {
    event.preventDefault();
    state = togglePause(state);
    renderHud();
  } else if (key === "r") {
    event.preventDefault();
    restart();
  }
}

function loop(now) {
  if (now - lastTick >= SPEEDS[currentSpeed]) {
    state = advance(state);
    syncHighScore(state.score);
    if (state.ateFood) {
      playEatSound();
    }
    lastTick = now;
    render();
  }
  requestAnimationFrame(loop);
}

restartButton.addEventListener("click", restart);
pauseButton.addEventListener("click", () => {
  getAudioContext();
  state = togglePause(state);
  renderHud();
});

speedButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const nextSpeed = button.dataset.speed;
    if (!nextSpeed || !(nextSpeed in SPEEDS)) {
      return;
    }

    currentSpeed = nextSpeed;
    lastTick = performance.now();
    renderSpeedControls();
  });
});

if (mobileControls) {
  mobileControls.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }
    const direction = target.dataset.direction;
    if (direction) {
      handleDirectionInput(direction);
    }
  });
}

window.addEventListener("keydown", handleKeydown, { passive: false });

render();
renderSpeedControls();
requestAnimationFrame(loop);
