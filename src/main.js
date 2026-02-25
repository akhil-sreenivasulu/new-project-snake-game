import {
  createInitialState,
  setDirection,
  advance,
  togglePause,
} from "./snakeLogic.js";

const GRID_WIDTH = 16;
const GRID_HEIGHT = 16;
const TICK_MS = 140;

const board = document.getElementById("game-board");
const scoreElement = document.getElementById("score");
const statusElement = document.getElementById("status");
const restartButton = document.getElementById("restart-btn");
const pauseButton = document.getElementById("pause-btn");
const mobileControls = document.querySelector(".mobile-controls");

let state = createInitialState({ width: GRID_WIDTH, height: GRID_HEIGHT });
let lastTick = performance.now();

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

function restart() {
  state = createInitialState({ width: GRID_WIDTH, height: GRID_HEIGHT });
  lastTick = performance.now();
  render();
}

function handleDirectionInput(direction) {
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
  if (now - lastTick >= TICK_MS) {
    state = advance(state);
    lastTick = now;
    render();
  }
  requestAnimationFrame(loop);
}

restartButton.addEventListener("click", restart);
pauseButton.addEventListener("click", () => {
  state = togglePause(state);
  renderHud();
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
requestAnimationFrame(loop);
