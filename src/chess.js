const FILES = "abcdefgh";

function createPiece(color, type) {
  return { color, type };
}

function initialBoard() {
  const back = ["r", "n", "b", "q", "k", "b", "n", "r"];
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));

  for (let c = 0; c < 8; c += 1) {
    board[0][c] = createPiece("b", back[c]);
    board[1][c] = createPiece("b", "p");
    board[6][c] = createPiece("w", "p");
    board[7][c] = createPiece("w", back[c]);
  }

  return board;
}

function initialGameState() {
  return {
    board: initialBoard(),
    turn: "w",
    selected: null,
    legalMoves: [],
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,
    moveList: [],
    status: "White to move",
    over: false,
    winner: null,
  };
}

function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function cloneBoard(board) {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

function opposite(color) {
  return color === "w" ? "b" : "w";
}

function coordToAlgebraic(square) {
  return `${FILES[square.c]}${8 - square.r}`;
}

function pieceToChar(piece) {
  if (!piece) return "";
  const key = `${piece.color}${piece.type}`;
  const map = {
    wp: "P",
    wn: "N",
    wb: "B",
    wr: "R",
    wq: "Q",
    wk: "K",
    bp: "p",
    bn: "n",
    bb: "b",
    br: "r",
    bq: "q",
    bk: "k",
  };
  return map[key] ?? "";
}

function updateCastlingRights(castling, piece, from, to, capturedPiece) {
  const next = { ...castling };

  if (piece.type === "k") {
    if (piece.color === "w") {
      next.wK = false;
      next.wQ = false;
    } else {
      next.bK = false;
      next.bQ = false;
    }
  }

  if (piece.type === "r") {
    if (piece.color === "w" && from.r === 7 && from.c === 0) next.wQ = false;
    if (piece.color === "w" && from.r === 7 && from.c === 7) next.wK = false;
    if (piece.color === "b" && from.r === 0 && from.c === 0) next.bQ = false;
    if (piece.color === "b" && from.r === 0 && from.c === 7) next.bK = false;
  }

  if (capturedPiece?.type === "r") {
    if (capturedPiece.color === "w" && to.r === 7 && to.c === 0) next.wQ = false;
    if (capturedPiece.color === "w" && to.r === 7 && to.c === 7) next.wK = false;
    if (capturedPiece.color === "b" && to.r === 0 && to.c === 0) next.bQ = false;
    if (capturedPiece.color === "b" && to.r === 0 && to.c === 7) next.bK = false;
  }

  return next;
}

function findKing(board, color) {
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      const piece = board[r][c];
      if (piece && piece.color === color && piece.type === "k") {
        return { r, c };
      }
    }
  }
  return null;
}

function isSquareAttacked(board, square, byColor) {
  const pawnDir = byColor === "w" ? -1 : 1;
  const pawnRow = square.r - pawnDir;
  for (const dc of [-1, 1]) {
    const c = square.c + dc;
    if (inBounds(pawnRow, c)) {
      const p = board[pawnRow][c];
      if (p && p.color === byColor && p.type === "p") return true;
    }
  }

  const knightSteps = [
    [-2, -1],
    [-2, 1],
    [-1, -2],
    [-1, 2],
    [1, -2],
    [1, 2],
    [2, -1],
    [2, 1],
  ];
  for (const [dr, dc] of knightSteps) {
    const r = square.r + dr;
    const c = square.c + dc;
    if (!inBounds(r, c)) continue;
    const p = board[r][c];
    if (p && p.color === byColor && p.type === "n") return true;
  }

  const lineDirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (const [dr, dc] of lineDirs) {
    let r = square.r + dr;
    let c = square.c + dc;
    while (inBounds(r, c)) {
      const p = board[r][c];
      if (p) {
        if (p.color === byColor && (p.type === "r" || p.type === "q")) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }

  const diagDirs = [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ];
  for (const [dr, dc] of diagDirs) {
    let r = square.r + dr;
    let c = square.c + dc;
    while (inBounds(r, c)) {
      const p = board[r][c];
      if (p) {
        if (p.color === byColor && (p.type === "b" || p.type === "q")) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }

  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const r = square.r + dr;
      const c = square.c + dc;
      if (!inBounds(r, c)) continue;
      const p = board[r][c];
      if (p && p.color === byColor && p.type === "k") return true;
    }
  }

  return false;
}

function isInCheck(board, color) {
  const king = findKing(board, color);
  if (!king) return false;
  return isSquareAttacked(board, king, opposite(color));
}

function rawMovesForPiece(state, from) {
  const board = state.board;
  const piece = board[from.r][from.c];
  if (!piece) return [];
  const moves = [];

  if (piece.type === "p") {
    const dir = piece.color === "w" ? -1 : 1;
    const startRow = piece.color === "w" ? 6 : 1;
    const promotionRow = piece.color === "w" ? 0 : 7;

    const one = { r: from.r + dir, c: from.c };
    if (inBounds(one.r, one.c) && !board[one.r][one.c]) {
      moves.push({
        from,
        to: one,
        promotion: one.r === promotionRow ? "q" : null,
      });
      const two = { r: from.r + dir * 2, c: from.c };
      if (from.r === startRow && !board[two.r][two.c]) {
        moves.push({ from, to: two, promotion: null });
      }
    }

    for (const dc of [-1, 1]) {
      const tr = from.r + dir;
      const tc = from.c + dc;
      if (!inBounds(tr, tc)) continue;
      const target = board[tr][tc];
      if (target && target.color !== piece.color) {
        moves.push({
          from,
          to: { r: tr, c: tc },
          promotion: tr === promotionRow ? "q" : null,
        });
      }
      if (
        state.enPassant &&
        state.enPassant.r === tr &&
        state.enPassant.c === tc &&
        state.enPassant.pawnColor !== piece.color
      ) {
        moves.push({
          from,
          to: { r: tr, c: tc },
          enPassant: true,
          promotion: null,
        });
      }
    }
  }

  if (piece.type === "n") {
    const steps = [
      [-2, -1],
      [-2, 1],
      [-1, -2],
      [-1, 2],
      [1, -2],
      [1, 2],
      [2, -1],
      [2, 1],
    ];
    for (const [dr, dc] of steps) {
      const tr = from.r + dr;
      const tc = from.c + dc;
      if (!inBounds(tr, tc)) continue;
      const target = board[tr][tc];
      if (!target || target.color !== piece.color) {
        moves.push({ from, to: { r: tr, c: tc }, promotion: null });
      }
    }
  }

  if (piece.type === "b" || piece.type === "r" || piece.type === "q") {
    const dirs = [];
    if (piece.type === "b" || piece.type === "q") {
      dirs.push(
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1]
      );
    }
    if (piece.type === "r" || piece.type === "q") {
      dirs.push(
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1]
      );
    }
    for (const [dr, dc] of dirs) {
      let tr = from.r + dr;
      let tc = from.c + dc;
      while (inBounds(tr, tc)) {
        const target = board[tr][tc];
        if (!target) {
          moves.push({ from, to: { r: tr, c: tc }, promotion: null });
        } else {
          if (target.color !== piece.color) {
            moves.push({ from, to: { r: tr, c: tc }, promotion: null });
          }
          break;
        }
        tr += dr;
        tc += dc;
      }
    }
  }

  if (piece.type === "k") {
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (dr === 0 && dc === 0) continue;
        const tr = from.r + dr;
        const tc = from.c + dc;
        if (!inBounds(tr, tc)) continue;
        const target = board[tr][tc];
        if (!target || target.color !== piece.color) {
          moves.push({ from, to: { r: tr, c: tc }, promotion: null });
        }
      }
    }

    const homeRow = piece.color === "w" ? 7 : 0;
    const enemy = opposite(piece.color);
    if (from.r === homeRow && from.c === 4 && !isInCheck(board, piece.color)) {
      if (
        (piece.color === "w" ? state.castling.wK : state.castling.bK) &&
        !board[homeRow][5] &&
        !board[homeRow][6] &&
        !isSquareAttacked(board, { r: homeRow, c: 5 }, enemy) &&
        !isSquareAttacked(board, { r: homeRow, c: 6 }, enemy)
      ) {
        moves.push({
          from,
          to: { r: homeRow, c: 6 },
          castle: "K",
          promotion: null,
        });
      }
      if (
        (piece.color === "w" ? state.castling.wQ : state.castling.bQ) &&
        !board[homeRow][3] &&
        !board[homeRow][2] &&
        !board[homeRow][1] &&
        !isSquareAttacked(board, { r: homeRow, c: 3 }, enemy) &&
        !isSquareAttacked(board, { r: homeRow, c: 2 }, enemy)
      ) {
        moves.push({
          from,
          to: { r: homeRow, c: 2 },
          castle: "Q",
          promotion: null,
        });
      }
    }
  }

  return moves;
}

function applyMove(state, move) {
  const board = cloneBoard(state.board);
  const piece = board[move.from.r][move.from.c];
  let capturedPiece = board[move.to.r][move.to.c];

  board[move.from.r][move.from.c] = null;

  if (move.enPassant && state.enPassant) {
    capturedPiece = board[state.enPassant.pawnR][state.enPassant.pawnC];
    board[state.enPassant.pawnR][state.enPassant.pawnC] = null;
  }

  const placedPiece = move.promotion
    ? createPiece(piece.color, move.promotion)
    : { ...piece };
  board[move.to.r][move.to.c] = placedPiece;

  if (move.castle === "K") {
    const row = piece.color === "w" ? 7 : 0;
    board[row][5] = board[row][7];
    board[row][7] = null;
  }
  if (move.castle === "Q") {
    const row = piece.color === "w" ? 7 : 0;
    board[row][3] = board[row][0];
    board[row][0] = null;
  }

  let enPassant = null;
  if (piece.type === "p" && Math.abs(move.to.r - move.from.r) === 2) {
    enPassant = {
      r: (move.from.r + move.to.r) / 2,
      c: move.from.c,
      pawnR: move.to.r,
      pawnC: move.to.c,
      pawnColor: piece.color,
    };
  }

  const castling = updateCastlingRights(
    state.castling,
    piece,
    move.from,
    move.to,
    capturedPiece
  );

  const nextTurn = opposite(state.turn);
  const moveRecord = {
    piece: pieceToChar(piece),
    from: coordToAlgebraic(move.from),
    to: coordToAlgebraic(move.to),
    capture: Boolean(capturedPiece),
    promotion: move.promotion || null,
    castle: move.castle || null,
  };

  return {
    ...state,
    board,
    castling,
    enPassant,
    turn: nextTurn,
    moveList: [...state.moveList, moveRecord],
    selected: null,
    legalMoves: [],
  };
}

function legalMovesFrom(state, from) {
  const piece = state.board[from.r][from.c];
  if (!piece || piece.color !== state.turn) return [];

  const raw = rawMovesForPiece(state, from);
  return raw.filter((move) => {
    const simulated = applyMove(state, move);
    return !isInCheck(simulated.board, piece.color);
  });
}

function allLegalMoves(state, color) {
  const originalTurn = state.turn;
  const probeState = { ...state, turn: color };
  const result = [];
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      const piece = probeState.board[r][c];
      if (!piece || piece.color !== color) continue;
      const moves = legalMovesFrom(probeState, { r, c });
      result.push(...moves);
    }
  }
  probeState.turn = originalTurn;
  return result;
}

function evaluateGameState(state) {
  const checked = isInCheck(state.board, state.turn);
  const moves = allLegalMoves(state, state.turn);
  const side = state.turn === "w" ? "White" : "Black";
  if (moves.length === 0) {
    if (checked) {
      return {
        ...state,
        over: true,
        winner: opposite(state.turn),
        status: `Checkmate. ${side} is checkmated.`,
      };
    }
    return {
      ...state,
      over: true,
      winner: null,
      status: "Stalemate.",
    };
  }
  if (checked) {
    return { ...state, status: `${side} to move (in check)` };
  }
  return { ...state, status: `${side} to move` };
}

function makeMove(state, move) {
  const legal = legalMovesFrom(state, move.from).find(
    (candidate) => candidate.to.r === move.to.r && candidate.to.c === move.to.c
  );
  if (!legal) return state;
  return evaluateGameState(applyMove(state, legal));
}

function sameSquare(a, b) {
  return a && b && a.r === b.r && a.c === b.c;
}

export {
  initialGameState,
  legalMovesFrom,
  makeMove,
  sameSquare,
};
