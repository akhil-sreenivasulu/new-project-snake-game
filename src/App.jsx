import { useEffect, useMemo, useRef, useState } from "react";
import { initialGameState, legalMovesFrom, makeMove, sameSquare } from "./chess.js";

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const SESSION_USER_KEY = "akhil_chess_user";
const SESSION_GAME_KEY = "akhil_chess_game";

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

function loadGameFromSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_GAME_KEY);
    return raw ? JSON.parse(raw) : initialGameState();
  } catch {
    return initialGameState();
  }
}

function App() {
  const [user, setUser] = useState(() => loadUserFromSession());
  const [game, setGame] = useState(() => loadGameFromSession());
  const [message, setMessage] = useState("");
  const googleBtnRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const moveCount = game.moveList.length;
  const lastMove = moveCount > 0 ? game.moveList[moveCount - 1] : null;

  useEffect(() => {
    sessionStorage.setItem(SESSION_GAME_KEY, JSON.stringify(game));
  }, [game]);

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

  function onSquareClick(r, c) {
    if (game.over) return;
    const clicked = { r, c };
    const piece = game.board[r][c];

    if (game.selected) {
      const move = game.legalMoves.find((m) => m.to.r === r && m.to.c === c);
      if (move) {
        setGame((prev) => makeMove(prev, move));
        return;
      }
      if (piece && piece.color === game.turn) {
        const legalMoves = legalMovesFrom(game, clicked);
        setGame((prev) => ({ ...prev, selected: clicked, legalMoves }));
        return;
      }
      setGame((prev) => ({ ...prev, selected: null, legalMoves: [] }));
      return;
    }

    if (piece && piece.color === game.turn) {
      const legalMoves = legalMovesFrom(game, clicked);
      setGame((prev) => ({ ...prev, selected: clicked, legalMoves }));
    }
  }

  function resetGame() {
    setGame(initialGameState());
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

        <aside className="sidebar">
          <button type="button" onClick={resetGame}>
            New game
          </button>
          <p>Turn: {game.turn === "w" ? "White" : "Black"}</p>
          <p>Total moves: {moveCount}</p>
          <p>
            Last move:{" "}
            {lastMove
              ? `${lastMove.piece}${lastMove.from}-${lastMove.to}${
                  lastMove.capture ? "x" : ""
                }${lastMove.promotion ? `=${lastMove.promotion.toUpperCase()}` : ""}`
              : "-"}
          </p>
          {game.over ? (
            <p>{game.winner ? `${game.winner === "w" ? "White" : "Black"} wins` : "Draw"}</p>
          ) : null}
        </aside>
      </section>
    </main>
  );
}

export default App;
