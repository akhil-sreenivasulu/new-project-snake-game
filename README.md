# Akhil Chess

A classic-themed chess game built with **React + Vite**, featuring:

- Full legal chess rules (check/checkmate, castling, en passant, promotion)
- Local two-player gameplay on one device
- Google login integration
- Session-based persistence for user and current game state

## Live Game

Play here: **[Akhil Chess](https://akhil-sreenivasulu.github.io/akhil-chess/)**

> If the link shows 404 right after deployment, wait 1-2 minutes for GitHub Pages to finish building.

## How To Play

1. Open the live link or run locally.
2. Sign in with Google (optional but recommended).
3. Click one of your pieces to see legal moves.
4. Click a highlighted target square to move.
5. Use **New game** to reset the board anytime.

### Controls

- Mouse/touch: click pieces and destination squares
- Turn order alternates automatically: White then Black
- Illegal moves are blocked

### Rule Coverage

- Piece movement rules for all 6 piece types
- Check detection and checkmate handling
- Stalemate detection
- Castling (king-side and queen-side)
- En passant
- Pawn promotion (auto-promotes to queen)

## Session Storage

The app stores session data in browser `sessionStorage`:

- `akhil_chess_user`: Google profile payload
- `akhil_chess_game`: current chess game state

Data lasts for the current browser session/tab lifecycle.

## Local Development

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite (typically `http://localhost:5173`).

## Google Login Setup

Create a Google OAuth Web Client and set:

```bash
VITE_GOOGLE_CLIENT_ID=your_google_web_client_id
```

Add your local origin (for example `http://localhost:5173`) and your Pages origin to Authorized JavaScript origins.
