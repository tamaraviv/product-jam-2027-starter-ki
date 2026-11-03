export type Player = "X" | "O";
export type Cell = Player | null;
export type Board = Cell[];

export type GameResult = "x_won" | "o_won" | "draw";
export type GameStatus = "in_progress" | GameResult;

export type GameState = {
  board: Board;
  turn: Player;
  moves: number[];
  status: GameStatus;
  winner: Player | null;
  winningLine: [number, number, number] | null;
};

/** Center cell (index 4) is unplayable in the no-center variant. */
export const BLOCKED_CELL = 4;
export const TOTAL_PLAYABLE_CELLS = 8;

export const WINNING_LINES: [number, number, number][] = [
  // Rows
  [0, 1, 2],
  [3, 4, 5], // Contains cell 4 (blocked) - will never complete
  [6, 7, 8],
  // Columns
  [0, 3, 6],
  [1, 4, 7], // Contains cell 4 (blocked) - will never complete
  [2, 5, 8],
  // Diagonals
  [0, 4, 8], // Contains cell 4 (blocked) - will never complete
  [2, 4, 6], // Contains cell 4 (blocked) - will never complete
];

/** Creates an initial empty game state for no-center variant. */
export function createInitialState(): GameState {
  return {
    board: Array(9).fill(null),
    turn: "X",
    moves: [],
    status: "in_progress",
    winner: null,
    winningLine: null,
  };
}

/** Checks whether a 3-in-a-row line is achieved. */
export function checkWinner(
  board: Board,
): { winner: Player; line: [number, number, number] } | null {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    const first = board[a];
    if (first && first === board[b] && first === board[c]) {
      return { winner: first, line };
    }
  }
  return null;
}

/** Pure function: takes the current state and a cell index, returning the next state or an error message. */
export function applyMove(
  state: GameState,
  cellIndex: number,
): { ok: true; state: GameState } | { ok: false; error: string } {
  if (state.status !== "in_progress") {
    return { ok: false, error: "Game is already finished" };
  }

  if (cellIndex === BLOCKED_CELL) {
    return {
      ok: false,
      error: "The middle cell (4) cannot be played in the no-center variant",
    };
  }

  if (cellIndex < 0 || cellIndex > 8 || !Number.isInteger(cellIndex)) {
    return { ok: false, error: "Cell index is out of bounds (must be 0-8)" };
  }

  if (state.board[cellIndex] !== null) {
    return { ok: false, error: "Cell is already occupied" };
  }

  const newBoard: Board = [...state.board];
  newBoard[cellIndex] = state.turn;
  const newMoves = [...state.moves, cellIndex];

  const win = checkWinner(newBoard);
  if (win) {
    return {
      ok: true,
      state: {
        board: newBoard,
        turn: state.turn,
        moves: newMoves,
        status: win.winner === "X" ? "x_won" : "o_won",
        winner: win.winner,
        winningLine: win.line,
      },
    };
  }

  if (newMoves.length === TOTAL_PLAYABLE_CELLS) {
    return {
      ok: true,
      state: {
        board: newBoard,
        turn: state.turn === "X" ? "O" : "X",
        moves: newMoves,
        status: "draw",
        winner: null,
        winningLine: null,
      },
    };
  }

  return {
    ok: true,
    state: {
      board: newBoard,
      turn: state.turn === "X" ? "O" : "X",
      moves: newMoves,
      status: "in_progress",
      winner: null,
      winningLine: null,
    },
  };
}

/**
 * Pure function: replays a sequence of moves from move 0.
 * Confirms that all moves were legal and that the game reached a completed state.
 */
export function replayMoves(
  moves: number[],
):
  | { ok: true; state: GameState; result: GameResult }
  | { ok: false; error: string } {
  if (!Array.isArray(moves) || moves.length === 0) {
    return { ok: false, error: "Moves list cannot be empty" };
  }

  let current = createInitialState();

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const res = applyMove(current, move);
    if (!res.ok) {
      return {
        ok: false,
        error: `Move ${i + 1} (cell ${move}) is invalid: ${res.error}`,
      };
    }
    current = res.state;

    // If game ended, no more moves should follow
    if (current.status !== "in_progress" && i < moves.length - 1) {
      return {
        ok: false,
        error: `Move ${i + 2} was played after the game already finished`,
      };
    }
  }

  if (current.status === "in_progress") {
    return { ok: false, error: "Game is not completed yet" };
  }

  return { ok: true, state: current, result: current.status };
}
