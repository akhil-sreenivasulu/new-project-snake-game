# Snake Game

A browser-based Snake game with wraparound movement, self-collision game-over rules, mobile controls, pause/restart actions, and a short hiss sound when the snake eats food.

## Play

Use the arrow keys or `W`, `A`, `S`, `D` to move the snake.

- Crossing any wall wraps the snake to the opposite side of the board.
- The game ends only when the snake runs into its own body.
- Choose `Slow`, `Medium`, or `Fast` below the board. The game starts in `Slow` mode.
- High score is stored in the browser with `localStorage`.
- Press `P` or the pause button to pause and resume.
- Press `R` or the restart button to start over.

## GitHub Pages

This repository includes a GitHub Actions workflow that verifies the static game files and then deploys the site to GitHub Pages from the repository root.

Expected Pages URL:

`https://akhil-sreenivasulu.github.io/new-project-snake-game/`
