const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

function samePosition(a, b) {
  return a.x === b.x && a.y === b.y;
}

function randomInt(max, rng = Math.random) {
  return Math.floor(rng() * max);
}

function randomEmptyCell(width, height, snake, rng = Math.random) {
  const occupied = new Set(snake.map((part) => `${part.x},${part.y}`));
  const freeCells = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const key = `${x},${y}`;
      if (!occupied.has(key)) {
        freeCells.push({ x, y });
      }
    }
  }

  if (freeCells.length === 0) {
    return null;
  }

  return freeCells[randomInt(freeCells.length, rng)];
}

function createInitialState({ width, height, rng = Math.random }) {
  const head = { x: Math.floor(width / 2), y: Math.floor(height / 2) };
  const snake = [head];
  const food = randomEmptyCell(width, height, snake, rng);

  return {
    width,
    height,
    snake,
    direction: "right",
    pendingDirection: "right",
    food,
    score: 0,
    gameOver: false,
    paused: false,
  };
}

function canTurn(current, next) {
  const currentDelta = DIRECTIONS[current];
  const nextDelta = DIRECTIONS[next];
  return currentDelta.x + nextDelta.x !== 0 || currentDelta.y + nextDelta.y !== 0;
}

function setDirection(state, direction) {
  if (!DIRECTIONS[direction]) {
    return state;
  }
  if (!canTurn(state.direction, direction) && state.snake.length > 1) {
    return state;
  }
  return { ...state, pendingDirection: direction };
}

function nextHead(head, direction) {
  const delta = DIRECTIONS[direction];
  return { x: head.x + delta.x, y: head.y + delta.y };
}

function outOfBounds(position, width, height) {
  return (
    position.x < 0 ||
    position.y < 0 ||
    position.x >= width ||
    position.y >= height
  );
}

function advance(state, rng = Math.random) {
  if (state.gameOver || state.paused) {
    return state;
  }

  const direction = state.pendingDirection;
  const currentHead = state.snake[0];
  const newHead = nextHead(currentHead, direction);

  if (outOfBounds(newHead, state.width, state.height)) {
    return { ...state, direction, gameOver: true };
  }

  const grows = state.food ? samePosition(newHead, state.food) : false;
  const bodyToCheck = grows ? state.snake : state.snake.slice(0, -1);
  const hitsSelf = bodyToCheck.some((segment) => samePosition(segment, newHead));

  if (hitsSelf) {
    return { ...state, direction, gameOver: true };
  }

  const nextSnake = [newHead, ...state.snake];
  if (!grows) {
    nextSnake.pop();
  }

  const nextFood = grows
    ? randomEmptyCell(state.width, state.height, nextSnake, rng)
    : state.food;

  return {
    ...state,
    snake: nextSnake,
    direction,
    food: nextFood,
    score: grows ? state.score + 1 : state.score,
    gameOver: nextFood === null ? true : false,
  };
}

function togglePause(state) {
  if (state.gameOver) {
    return state;
  }
  return { ...state, paused: !state.paused };
}

export {
  DIRECTIONS,
  createInitialState,
  setDirection,
  advance,
  togglePause,
  randomEmptyCell,
};
