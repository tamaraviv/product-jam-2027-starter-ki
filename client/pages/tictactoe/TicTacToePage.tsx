import {
  applyMove,
  BLOCKED_CELL,
  createInitialState,
  type GameState,
} from "@shared/game";
import type { Game } from "@shared/schemas/games";
import { useEffect, useRef, useState } from "react";
import { Button, Card, Spinner } from "../../components";
import { useGames, useSaveGame } from "../../features/games/hooks";
import styles from "./TicTacToePage.module.css";

export default function TicTacToePage() {
  const [game, setGame] = useState<GameState>(createInitialState);
  const savedMovesRef = useRef<string | null>(null);

  const { data: pastGames, isLoading, error } = useGames();
  const saveGame = useSaveGame();

  // Save the finished game automatically when reached a conclusion
  useEffect(() => {
    if (game.status === "in_progress") return;

    const movesKey = game.moves.join(",");
    if (savedMovesRef.current === movesKey) return;
    savedMovesRef.current = movesKey;

    saveGame.mutate({ moves: game.moves });
  }, [game.status, game.moves, saveGame]);

  function handleCellClick(index: number) {
    if (game.status !== "in_progress" || index === BLOCKED_CELL) return;

    const res = applyMove(game, index);
    if (res.ok) {
      setGame(res.state);
    }
  }

  function handleNewGame() {
    setGame(createInitialState());
  }

  return (
    <main className={styles.page}>
      <header className={styles.intro}>
        <h1 className={styles.title}>Tic-Tac-Toe</h1>
        <p className={styles.variantNotice}>
          Variant: <strong>no-center</strong> (3×3 board, center cell is
          blocked, 3 in a row wins)
        </p>
      </header>

      <Card variant="raised" padding="lg" className={styles.gameCard}>
        <div className={styles.statusBar}>
          {game.status === "in_progress" && (
            <span
              className={game.turn === "X" ? styles.statusX : styles.statusO}
            >
              Turn: Player {game.turn}
            </span>
          )}
          {game.status === "x_won" && (
            <span className={styles.statusWin}>🎉 Player X Wins!</span>
          )}
          {game.status === "o_won" && (
            <span className={styles.statusWin}>🎉 Player O Wins!</span>
          )}
          {game.status === "draw" && (
            <span className={styles.statusDraw}>🤝 It&apos;s a Draw!</span>
          )}
        </div>

        <div
          className={styles.board}
          role="grid"
          aria-label="Tic-tac-toe board"
        >
          {game.board.map((cellValue, idx) => {
            const isBlocked = idx === BLOCKED_CELL;
            const isWinningCell = game.winningLine?.includes(idx);

            if (isBlocked) {
              return (
                <button
                  key={idx}
                  type="button"
                  disabled
                  className={`${styles.cell} ${styles.cellBlocked}`}
                  aria-label="Cell 5: blocked center cell"
                >
                  <span className={styles.blockedLabel}>Center Blocked</span>
                </button>
              );
            }

            const cellClass = [
              styles.cell,
              cellValue === "X" ? styles.cellX : "",
              cellValue === "O" ? styles.cellO : "",
              isWinningCell ? styles.cellWinning : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <button
                key={idx}
                type="button"
                className={cellClass}
                disabled={game.status !== "in_progress" || cellValue !== null}
                onClick={() => handleCellClick(idx)}
                aria-label={`Cell ${idx + 1}: ${cellValue ?? "empty"}`}
              >
                {cellValue}
              </button>
            );
          })}
        </div>

        <div className={styles.controls}>
          <Button
            variant={game.status === "in_progress" ? "secondary" : "primary"}
            onClick={handleNewGame}
          >
            New Game
          </Button>

          {saveGame.isPending && (
            <span className={styles.saveNotice}>Saving game to server...</span>
          )}
          {saveGame.isError && (
            <span className={styles.errorState}>
              Failed to save game: {saveGame.error?.message}
            </span>
          )}
        </div>
      </Card>

      <section className={styles.historySection}>
        <h2 className={styles.historyTitle}>Your Saved Games</h2>

        {isLoading ? (
          <div className={styles.emptyState}>
            <Spinner />
          </div>
        ) : error ? (
          <div className={styles.errorState}>Could not load past games.</div>
        ) : !pastGames || pastGames.length === 0 ? (
          <div className={styles.emptyState}>
            No games played yet. Play a match above to save your first game!
          </div>
        ) : (
          <div className={styles.historyList}>
            {pastGames.map((item: Game) => (
              <div key={item.id} className={styles.gameItem}>
                <div className={styles.gameInfo}>
                  <span className={styles.gameDate}>
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                  <span className={styles.gameMoves}>
                    {item.moves.length} moves played ({item.variant})
                  </span>
                </div>
                <div>
                  {item.result === "x_won" && (
                    <span className={`${styles.badge} ${styles.badgeX}`}>
                      X Won
                    </span>
                  )}
                  {item.result === "o_won" && (
                    <span className={`${styles.badge} ${styles.badgeO}`}>
                      O Won
                    </span>
                  )}
                  {item.result === "draw" && (
                    <span className={`${styles.badge} ${styles.badgeDraw}`}>
                      Draw
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
