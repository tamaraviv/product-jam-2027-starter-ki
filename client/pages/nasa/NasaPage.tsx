import type { ApodCard } from "@shared/schemas/nasa";
import { useState } from "react";
import { Button, Card, Spinner } from "../../components";
import { useExplainPicture, useNasaPictures } from "../../features/nasa/hooks";
import styles from "./NasaPage.module.css";

const COUNT = 20;

function ApodItemCard({
  item,
  onExplain,
  isExplaining,
  explainError,
}: {
  item: ApodCard;
  onExplain: (date: string) => void;
  isExplaining: boolean;
  explainError: string | null;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card variant="raised" padding="none" className={styles.card}>
      <div className={styles.mediaWrapper}>
        {item.hdurl ? (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className={styles.imageLink}
          >
            <img
              src={item.hdurl}
              alt={item.title}
              className={styles.image}
              loading="lazy"
            />
          </a>
        ) : (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className={styles.articleLink}
          >
            View NASA article
          </a>
        )}
      </div>

      <div className={styles.content}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>{item.title}</h2>
          <span className={styles.dateBadge}>{item.date}</span>
        </div>

        <p
          className={`${styles.explanation} ${!expanded ? styles.explanationTruncated : ""}`}
        >
          {item.explanation}
        </p>

        {item.explanation.length > 200 && (
          <button
            type="button"
            className={styles.toggleMore}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}

        <div className={styles.hebrewSection}>
          {item.hebrew ? (
            <div className={styles.hebrewBox}>
              <h3 className={styles.hebrewTitle}>{item.hebrew.title}</h3>
              <p className={styles.hebrewSummary}>{item.hebrew.summary}</p>
              <div className={styles.tagList}>
                {item.hebrew.tags.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.buttonContainer}>
              <Button
                variant="primary"
                size="sm"
                loading={isExplaining}
                disabled={isExplaining}
                onClick={() => onExplain(item.date)}
              >
                Explain in Hebrew
              </Button>

              {isExplaining && (
                <span className={styles.thinkingNotice}>
                  <Spinner /> Gemini is thinking...
                </span>
              )}

              {explainError && (
                <span className={styles.cardError}>{explainError}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function NasaPage() {
  const {
    data: pageData,
    isLoading,
    error,
    isFetching,
    page,
    setPage,
    refetch,
  } = useNasaPictures(COUNT);
  const pictures = pageData?.pictures;

  const explain = useExplainPicture(COUNT, page);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});

  function handleExplain(date: string) {
    setActiveDate(date);
    setCardErrors((prev) => ({ ...prev, [date]: "" }));

    explain.mutate(
      { date },
      {
        onError: (err) => {
          setCardErrors((prev) => ({
            ...prev,
            [date]: err instanceof Error ? err.message : "Failed to explain.",
          }));
        },
        onSettled: () => {
          setActiveDate(null);
        },
      },
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.intro}>
          <h1 className={styles.title}>NASA Space Pictures</h1>
          <p className={styles.subtitle}>
            Explore Astronomy Pictures of the Day with AI-powered Hebrew
            explanations
          </p>
        </div>
      </header>

      {isLoading ? (
        <div className={styles.centerState}>
          <Spinner />
          <p className={styles.subtitle}>
            Fetching space pictures from NASA...
          </p>
        </div>
      ) : error ? (
        <Card padding="lg" className={styles.centerState}>
          <h2 className={styles.errorTitle}>Could not load NASA pictures</h2>
          <p className={styles.errorMessage}>
            {error instanceof Error
              ? error.message
              : "NASA service could not be reached."}
          </p>
          <Button variant="primary" onClick={() => refetch()}>
            Try Again
          </Button>
        </Card>
      ) : !pictures || pictures.length === 0 ? (
        <div className={styles.centerState}>
          <p className={styles.subtitle}>No pictures found.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {pictures.map((item) => (
            <ApodItemCard
              key={item.date}
              item={item}
              onExplain={handleExplain}
              isExplaining={explain.isPending && activeDate === item.date}
              explainError={cardErrors[item.date] ?? null}
            />
          ))}
          <nav className={styles.pagination} aria-label="Picture pages">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1 || isFetching}
              onClick={() => setPage((current) => current - 1)}
            >
              Newer pictures
            </Button>
            <span className={styles.pageNumber}>
              Page {page} of {pageData?.total_pages ?? 1}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={isFetching || page >= (pageData?.total_pages ?? 1)}
              onClick={() => setPage((current) => current + 1)}
            >
              Older pictures
            </Button>
          </nav>
        </div>
      )}
    </main>
  );
}
