import { describe, expect, it } from "vitest";
import { applyMove, createInitialState, replayMoves } from "./index";

describe("no-center tic-tac-toe rules", () => {
  it("initializes an empty 3x3 board with X to move", () => {
    const game = createInitialState();
    expect(game.board).toHaveLength(9);
    expect(game.board.every((cell) => cell === null)).toBe(true);
    expect(game.turn).toBe("X");
    expect(game.status).toBe("in_progress");
  });

  it("prevents playing the center cell (cell 4)", () => {
    const game = createInitialState();
    const move = applyMove(game, 4);
    expect(move.ok).toBe(false);
    if (!move.ok) {
      expect(move.error).toMatch(/middle cell/i);
    }
  });

  it("prevents playing out of bounds or occupied cells", () => {
    const game = createInitialState();
    expect(applyMove(game, -1).ok).toBe(false);
    expect(applyMove(game, 9).ok).toBe(false);

    const first = applyMove(game, 0);
    expect(first.ok).toBe(true);
    if (first.ok) {
      const second = applyMove(first.state, 0);
      expect(second.ok).toBe(false);
      if (!second.ok) {
        expect(second.error).toMatch(/already occupied/i);
      }
    }
  });

  it("alternates turns between X and O", () => {
    const game = createInitialState();
    const m1 = applyMove(game, 0);
    expect(m1.ok).toBe(true);
    if (m1.ok) {
      expect(m1.state.turn).toBe("O");
      const m2 = applyMove(m1.state, 1);
      expect(m2.ok).toBe(true);
      if (m2.ok) {
        expect(m2.state.turn).toBe("X");
      }
    }
  });

  it("detects X winning on row 0 (0, 1, 2)", () => {
    // X: 0, O: 3, X: 1, O: 5, X: 2
    const moves = [0, 3, 1, 5, 2];
    const replay = replayMoves(moves);
    expect(replay.ok).toBe(true);
    if (replay.ok) {
      expect(replay.result).toBe("x_won");
      expect(replay.state.winner).toBe("X");
      expect(replay.state.winningLine).toEqual([0, 1, 2]);
    }
  });

  it("detects O winning on col 0 (0, 3, 6)", () => {
    // X: 1, O: 0, X: 2, O: 3, X: 7, O: 6
    const moves = [1, 0, 2, 3, 7, 6];
    const replay = replayMoves(moves);
    expect(replay.ok).toBe(true);
    if (replay.ok) {
      expect(replay.result).toBe("o_won");
      expect(replay.state.winner).toBe("O");
      expect(replay.state.winningLine).toEqual([0, 3, 6]);
    }
  });

  it("detects a draw when all 8 valid cells are filled without a line", () => {
    // Board layout:
    // 0 1 2
    // 3   5
    // 6 7 8
    // X plays: 0, 2, 3, 7
    // O plays: 1, 5, 6, 8
    // Check lines:
    // Row 0: X (0), O (1), X (2) -> no
    // Row 2: O (6), X (7), O (8) -> no
    // Col 0: X (0), X (3), O (6) -> no
    // Col 2: X (2), O (5), O (8) -> no
    // Moves: 0, 1, 2, 5, 3, 6, 7, 8
    const moves = [0, 1, 2, 5, 3, 6, 7, 8];
    const replay = replayMoves(moves);
    expect(replay.ok).toBe(true);
    if (replay.ok) {
      expect(replay.result).toBe("draw");
      expect(replay.state.winner).toBe(null);
    }
  });

  it("rejects incomplete games", () => {
    const replay = replayMoves([0, 1]);
    expect(replay.ok).toBe(false);
    if (!replay.ok) {
      expect(replay.error).toMatch(/not completed/i);
    }
  });

  it("rejects moves submitted after game over", () => {
    // X wins at move 5 (index 4), move 6 is illegal
    const moves = [0, 3, 1, 5, 2, 6];
    const replay = replayMoves(moves);
    expect(replay.ok).toBe(false);
    if (!replay.ok) {
      expect(replay.error).toMatch(/after the game already finished/i);
    }
  });
});
