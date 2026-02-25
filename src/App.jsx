import { useEffect, useMemo, useRef, useState } from "react";
import { initialGameState, legalMovesFrom, makeMove, sameSquare } from "./chess.js";

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const SESSION_USER_KEY = "akhil_chess_user";
const SESSION_GAME_KEY = "akhil_chess_game";
const SESSION_TIMELINE_KEY = "akhil_chess_timeline";

const PIECE_SYMBOLS = {
  wp: "♙",
  wn: "♘",
  wb: "♗",
  wr: "♖",
  wq: "♕",
  wk: "♔",
  bp: "♟",
  bn: "♞",
  bb: "♝",
  br: "♜",
  bq: "♛",
  bk: "♚",
};

function pieceKey(piece) {
  return piece ? `${piece.color}${piece.type}` : "";
}

function clearSelectionState(game) {
  return { ...game, selected: null, legalMoves: [] };
}

function loadTimelineFromSession() {
  try {
    const rawTimeline = sessionStorage.getItem(SESSION_TIMELINE_KEY);
    if (rawTimeline) {
      const parsed = JSON.parse(rawTimeline);
      if (Array.isArray(parsed.states) && parsed.states.length > 0) {
        const states = parsed.states.map(clearSelectionState);
        const maxIndex = states.length - 1;
        const index = Math.max(0, Math.min(Number(parsed.index) || 0, maxIndex));
        return { states, index };
      }
    }

    const rawGame = sessionStorage.getItem(SESSION_GAME_KEY);
    if (rawGame) {
      const game = clearSelectionState(JSON.parse(rawGame));
      return { states: [game], index: 0 };
    }
  } catch {
    return { states: [initialGameState()], index: 0 };
  }

  return { states: [initialGameState()], index: 0 };
}

function decodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function loadUserFromSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function formatMove(move) {
  if (move.castle === "K") return "O-O";
  if (move.castle === "Q") return "O-O-O";
  const upperPiece = move.piece ? move.piece.toUpperCase() : "";
  const piece = upperPiece === "P" ? "" : upperPiece;
  const capture = move.capture ? "x" : "-";
  const promotion = move.promotion ? `=${move.promotion.toUpperCase()}` : "";
  return `${piece}${move.from}${capture}${move.to}${promotion}`;
}

function App() {
  const [user, setUser] = useState(() => loadUserFromSession());
  const [timeline, setTimeline] = useState(() => loadTimelineFromSession());
  const [message, setMessage] = useState("");
  const googleBtnRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const game = timeline.states[timeline.index] || initialGameState();
  const currentPly = game.moveList.length;
  const allMoves = timeline.states[timeline.states.length - 1]?.moveList || [];

  useEffect(() => {
    sessionStorage.setItem(SESSION_TIMELINE_KEY, JSON.stringify(timeline));
    sessionStorage.setItem(SESSION_GAME_KEY, JSON.stringify(game));
  }, [timeline, game]);

  useEffect(() => {
    if (user) {
      sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(SESSION_USER_KEY);
    }
  }, [user]);

  useEffect(() => {
    if (!googleClientId) {
      setMessage("Set VITE_GOOGLE_CLIENT_ID to enable Google login.");
      return;
    }

    let script = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
    let created = false;
    if (!script) {
      script = document.createElement("script");
      script.src = GOOGLE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
      created = true;
    }

    const initializeGoogle = () => {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => {
          const payload = decodeJwtPayload(response.credential);
          if (!payload) {
            setMessage("Google login failed: invalid credential.");
            return;
          }
          setUser({
            name: payload.name,
            email: payload.email,
            picture: payload.picture,
          });
          setMessage("");
        },
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        text: "signin_with",
      });
    };

    if (script.getAttribute("data-ready") === "true") {
      initializeGoogle();
    } else {
      script.addEventListener(
        "load",
        () => {
          script.setAttribute("data-ready", "true");
          initializeGoogle();
        },
        { once: true }
      );
    }

    return () => {
      if (created && script?.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [googleClientId]);

  const legalTargets = useMemo(
    () => new Set(game.legalMoves.map((m) => `${m.to.r},${m.to.c}`)),
    [game.legalMoves]
  );

  function updateCurrentGame(mutator) {
    setTimeline((prev) => {
      const states = [...prev.states];
      states[prev.index] = mutator(states[prev.index]);
      return { ...prev, states };
    });
  }

  function pushNextMove(move) {
    setTimeline((prev) => {
      const current = clearSelectionState(prev.states[prev.index]);
      const next = makeMove(current, move);
      if (next === current) return prev;
      const states = prev.states.slice(0, prev.index + 1);
      states.push(clearSelectionState(next));
      return { states, index: states.length - 1 };
    });
  }

  function onSquareClick(r, c) {
    if (game.over || timeline.index !== timeline.states.length - 1) return;

    const clicked = { r, c };
    const piece = game.board[r][c];

    if (game.selected) {
      const move = game.legalMoves.find((m) => m.to.r === r && m.to.c === c);
      if (move) {
        pushNextMove(move);
        return;
      }
      if (piece && piece.color === game.turn) {
        const legalMoves = legalMovesFrom(game, clicked);
        updateCurrentGame((current) => ({ ...current, selected: clicked, legalMoves }));
        return;
      }
      updateCurrentGame((current) => ({ ...current, selected: null, legalMoves: [] }));
      return;
    }

    if (piece && piece.color === game.turn) {
      const legalMoves = legalMovesFrom(game, clicked);
      updateCurrentGame((current) => ({ ...current, selected: clicked, legalMoves }));
    }
  }

  function resetGame() {
    const next = initialGameState();
    setTimeline({ states: [next], index: 0 });
  }

  function undoMove() {
    setTimeline((prev) => {
      if (prev.index === 0) return prev;
      const nextIndex = prev.index - 1;
      return { ...prev, index: nextIndex };
    });
  }

  function redoMove() {
    setTimeline((prev) => {
      if (prev.index >= prev.states.length - 1) return prev;
      const nextIndex = prev.index + 1;
      return { ...prev, index: nextIndex };
    });
  }

  function jumpToPly(ply) {
    setTimeline((prev) => {
      const bounded = Math.max(0, Math.min(ply, prev.states.length - 1));
      return { ...prev, index: bounded };
    });
  }

  function logout() {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
    }
    setUser(null);
  }

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <h1>Akhil Chess</h1>
          <p className="status">{game.status}</p>
        </div>
        <div className="user-panel">
          {user ? (
            <div className="user-card">
              {user.picture ? <img src={user.picture} alt={user.name} /> : null}
              <div>
                <p>{user.name}</p>
                <p>{user.email}</p>
              </div>
              <button type="button" onClick={logout}>
                Logout
              </button>
            </div>
          ) : (
            <div ref={googleBtnRef} />
          )}
          {message ? <p className="hint">{message}</p> : null}
        </div>
      </header>

      <section className="content">
        <div className="board-wrap">
          <div className="board" aria-label="Chess board">
            {game.board.map((row, r) =>
              row.map((piece, c) => {
                const dark = (r + c) % 2 === 1;
                const selected = sameSquare(game.selected, { r, c });
                const isTarget = legalTargets.has(`${r},${c}`);
                const className = [
                  "square",
                  dark ? "dark" : "light",
                  selected ? "selected" : "",
                  isTarget ? "target" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    className={className}
                    onClick={() => onSquareClick(r, c)}
                  >
                    <span className="piece">{PIECE_SYMBOLS[pieceKey(piece)] || ""}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <aside className="sidebar">
          <div className="panel-actions">
            <button type="button" onClick={resetGame}>
              New game
            </button>
            <button type="button" onClick={undoMove} disabled={timeline.index === 0}>
              Undo
            </button>
            <button
              type="button"
              onClick={redoMove}
              disabled={timeline.index >= timeline.states.length - 1}
            >
              Redo
            </button>
          </div>

          <p>Turn: {game.turn === "w" ? "White" : "Black"}</p>
          <p>Total moves: {allMoves.length}</p>
          <p>Current replay position: {currentPly}</p>
          {game.over ? (
            <p>{game.winner ? `${game.winner === "w" ? "White" : "Black"} wins` : "Draw"}</p>
          ) : null}

          <div className="move-list-wrap">
            <p className="move-list-title">Move list</p>
            <button
              type="button"
              className={`move-item ${currentPly === 0 ? "active" : ""}`}
              onClick={() => jumpToPly(0)}
            >
              0. Start position
            </button>
            {allMoves.map((move, index) => {
              const ply = index + 1;
              const moveNo = Math.ceil(ply / 2);
              const prefix = ply % 2 === 1 ? `${moveNo}.` : `${moveNo}...`;
              const isActive = currentPly === ply;
              const isPlayed = currentPly >= ply;
              return (
                <button
                  key={`${move.from}-${move.to}-${index}`}
                  type="button"
                  className={`move-item ${isActive ? "active" : ""} ${isPlayed ? "played" : ""}`}
                  onClick={() => jumpToPly(ply)}
                >
                  {prefix} {formatMove(move)}
                </button>
              );
            })}
          </div>
        </aside>
      </section>
    </main>
  );
}

export default App;
