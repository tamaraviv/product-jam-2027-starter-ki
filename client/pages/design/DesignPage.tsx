import styles from "./DesignPage.module.css";

type CatKind =
  "mitzi" | "gingi" | "baxi" | "shoko" | "shoko2" | "luna" | "pita" | "mocha";
type IconName = "shelter" | "calendar" | "heart" | "water" | "food";

const cats: { name: string; kind: CatKind; color: string }[] = [
  { name: "Mitzi", kind: "mitzi", color: "mint" },
  { name: "Gingi", kind: "gingi", color: "blue" },
  { name: "Baxi", kind: "baxi", color: "peach" },
  { name: "Shoko", kind: "shoko", color: "lilac" },
  { name: "Shoko", kind: "shoko", color: "lilac" },
  { name: "Luna", kind: "luna", color: "pink" },
  { name: "Pita", kind: "pita", color: "green" },
  { name: "Mocha", kind: "mocha", color: "yellow" },
];

function CatIllustration({
  kind = "gingi",
  className,
}: {
  kind?: CatKind;
  className?: string;
}) {
  return (
    <img
      className={className}
      src={`/design/avatars/${kind}.png`}
      alt=""
      aria-hidden="true"
    />
  );
}

function NeedIcon({ name }: { name: IconName }) {
  return <img src={`/design/icons/${name}.png`} alt="" aria-hidden="true" />;
}

function SectionHeading({
  number,
  title,
  label,
}: {
  number: string;
  title: string;
  label: string;
}) {
  return (
    <>
      <div className={styles.sectionHeading}>
        <span>{number}</span>
        <span className={styles.sectionRule} />
        <strong>{label}</strong>
      </div>
      <h2 className={styles.sectionTitle} data-section={number}>
        {title}
      </h2>
    </>
  );
}

function Hero() {
  return (
    <header className={styles.hero}>
      <div className={styles.heroAvatars}>
        {[
          ["mocha", "yellow"],
          ["pita", "green"],
          ["luna", "pink"],
          ["shoko", "lilac"],
          ["baxi", "peach"],
          ["gingi", "blue"],
          ["mitzi", "mint"],
        ].map(([kind, color], index) => (
          <div
            className={`${styles.heroAvatar} ${styles.heroAvatarLevel} ${styles[color]}`}
            key={`${kind}-${index}`}
            data-index={index}
          >
            <CatIllustration kind={kind as CatKind} />
          </div>
        ))}
      </div>
      <h1 className={styles.heroLogo}>
        <img src="/design/hero-logo.png" alt="CAT-CH" />
      </h1>
      <p className={styles.heroTitle}>טינדר לחתולי רחוב</p>
      <div className={styles.heroActions}>
        <span className={styles.heroActionPass}>שמאלה · מעבירים</span>
        <span className={styles.heroActionAdopt}>ימינה · לוקחים</span>
      </div>
    </header>
  );
}

function BackgroundSection() {
  return (
    <section className={styles.section}>
      <SectionHeading number="01" label="למה צריך את זה" title="רקע ומטרות" />
      <p className={styles.lead}>
        הטיפול כיום בחתולי הרחוב לא מתואם. אין תמונה משותפת אמיתית של מה כל חתול
        צריך, ואין תיאום בין כל השכנים המסורים שרוצים לעזור לחתולי השכונה שלהם.
      </p>
      <div className={styles.stats}>
        <article className={`${styles.statCard} ${styles.statShoko}`}>
          <span>
            ארוחות ש<bdi dir="ltr">shoko</bdi> קיבל היום:
          </span>
          <div className={styles.statAvatar}>
            <CatIllustration kind="shoko" />
          </div>
          <strong dir="ltr">0</strong>
        </article>
        <article className={`${styles.statCard} ${styles.statMitzi}`}>
          <span>
            ארוחות ש<bdi dir="ltr">Mizui</bdi> קיבל היום:
          </span>
          <div className={styles.statAvatar}>
            <CatIllustration kind="mitzi" />
          </div>
          <strong dir="ltr">×3</strong>
        </article>
      </div>
      <p className={styles.statCaption}>
        חתול אחד מקבל אוכל שלוש פעמים ביום, ואחר נשאר בלי.
      </p>
      <div className={styles.goal}>
        <span className={styles.eyebrow}>המטרה</span>
        <h3>
          להפוך רצון טוב לשגרה
          <br />
          משותפת.
        </h3>
        <p>
          השגרה של כל חתול מתחלקת למשימות קטנות, שכל שכן יכול לקחת כשנוח לו.
        </p>
      </div>
    </section>
  );
}

function AudienceSection() {
  return (
    <section className={`${styles.section} ${styles.audienceSection}`}>
      <SectionHeading number="02" label="קהל יעד" title="קהל יעד ושימוש" />
      <p className={styles.lead}>
        שכנים שאוהבים חתולים ורוצים לעזור, בלי לאמץ ובלי להתחייב לשגרה קבועה.
        וגם המאכילים הקבועים, שסוף סוף מקבלים עזרה.
      </p>
      <div className={styles.audienceGrid}>
        {[
          ["איפה", "בשכונה"],
          ["כמה זמן", "1–2 דקות"],
          ["כמה פעמים", "כמה פעמים ביום"],
          ["מכשיר", "טלפון"],
        ].map(([label, value]) => (
          <article className={styles.audienceCard} key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <h3 className={styles.audienceSubheading}>מה זה חייב בעיצוב</h3>
      <ul className={styles.audienceNeeds}>
        <li>ניגודיות גבוהה שנקראת בשמש</li>
        <li>מיקום והתראות כשעוברים ליד חתול</li>
        <li>שפה פשוטה לכל רמת אוריינות</li>
      </ul>
    </section>
  );
}

function CatCard() {
  return (
    <article className={styles.profileCard}>
      <div className={styles.profileTop}>
        <span className={styles.online}>דחוף</span>
        <span className={styles.profileDistance}>● במרחק 300 מ׳</span>
      </div>
      <div className={styles.profileAvatar}>
        <img src="/design/product-cat.png" alt="" aria-hidden="true" />
      </div>
      <h3>Mitzi</h3>
      <p className={styles.profileAge}>ארוחת בוקר · 08:00 · 120 מ׳</p>
      <p className={styles.profileCopy}>המשימה הבאה של Mitzi</p>
      <div className={styles.profileTags}>
        <span>חברותי</span>
        <span>אוהב ליטופים</span>
      </div>
      <div className={styles.profileActions}>
        <span className={styles.adoptAction}>
          <img src="/design/icons/action-adopt.png" alt="" aria-hidden="true" />
        </span>
        <span className={styles.urgentAction}>
          <img
            src="/design/icons/action-urgent.png"
            alt=""
            aria-hidden="true"
          />
        </span>
        <span className={styles.passAction}>
          <img src="/design/icons/action-pass.png" alt="" aria-hidden="true" />
        </span>
      </div>
      <div className={styles.profileActionLabels}>
        <span>אני על זה</span>
        <span>דחוף</span>
        <span>מעביר הלאה</span>
      </div>
    </article>
  );
}

function ProductSection() {
  return (
    <section className={`${styles.section} ${styles.productSection}`}>
      <SectionHeading number="03" label="המוצר" title="מה אנחנו בונים" />
      <p className={styles.lead}>
        אפליקציה לטלפון שמציגה רק את החתולים בשכונה שלך ואת מה שנשאר לעשות עבורם
        היום, בכרטיסים שמחליקים כמו בטינדר.
      </p>
      <div className={styles.product}>
        <CatCard />
      </div>
    </section>
  );
}

function ContentSection() {
  const steps = [
    ["1", "שכן מדווח על חתול", "כל אחד יכול להוסיף"],
    ["2", "2 שכנים מאשרים", "החתול נכנס לשכונה"],
    ["3", "פרופיל ושגרה קבועה", "כמעט לא משתנה"],
    ["4", "משימות היום", "מתאפסות כל בוקר"],
    ["5", "בוצע / הועבר / דחוף", "מתעדכן בזמן אמת"],
  ];
  return (
    <section className={`${styles.section} ${styles.contentSection}`}>
      <SectionHeading number="04" label="איך המידע זורם" title="תוכן ומידע" />
      <p className={styles.lead}>
        כל המידע נוצר על ידי השכנים עצמם. חלק ממנו כמעט לא משתנה, וחלק מתחדש כל
        יום.
      </p>
      <div className={styles.timeline}>
        {steps.map(([number, title, copy]) => (
          <article className={styles.timelineItem} key={number}>
            <span className={styles.timelineNumber}>{number}</span>
            <div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </div>
          </article>
        ))}
      </div>
      <div className={styles.mapArea}>
        <img
          className={styles.mapBackdrop}
          src="/design/map-illustration.svg"
          alt=""
          aria-hidden="true"
        />
        <div className={styles.mapCats} aria-label="מפת חתולי השכונה">
          {["shoko", "mitzi", "pita", "baxi", "gingi", "mocha", "shoko2"].map(
            (kind, index) => (
              <div className={styles.mapCat} data-index={index} key={kind}>
                <CatIllustration kind={kind as CatKind} />
                <span>{index === 2 ? "2" : "1"}</span>
              </div>
            ),
          )}
        </div>
      </div>
      <p className={styles.mapSource}>
        מקורות חיצוניים: <strong>מפה ומיקום</strong>
      </p>
    </section>
  );
}

function DailyLife() {
  const schedule = [
    ["07:00", "ארוחת בוקר", "לקחה: נועה", "בוצע"],
    ["12:00", "מים טריים", "לקח: רון", "נעול · 24:10"],
    ["18:00", "ארוחת ערב", "מחכה לשכן", "פתוח"],
    ["21:00", "בדיקת לילה", "מחכה לשכן", "פתוח"],
  ];
  return (
    <section className={styles.day}>
      <div className={styles.dayHeader}>
        <div>
          <span className={styles.eyebrow}>יום אחד של</span>
          <h2>מיצי</h2>
          <p>4 משימות קבועות · 3 שכנים שונים</p>
        </div>
        <div className={styles.dayAvatar}>
          <CatIllustration kind="mitzi" />
        </div>
      </div>
      <div className={styles.scheduleTrack}>
        <div className={styles.schedule}>
          {schedule.map(([time, title, copy, status], index) => (
            <article className={styles.scheduleItem} key={time}>
              <time>{time}</time>
              <div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
              <span
                className={`${styles.scheduleStatus} ${
                  index === 0
                    ? styles.scheduleStatusDone
                    : index === 1
                      ? styles.scheduleStatusRemaining
                      : styles.scheduleStatusOpen
                }`}
              >
                {status}
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function DesignLanguage() {
  const palette = [
    ["#18c77f", "לקחת"],
    ["#2d9cff", "להעביר"],
    ["#ff3b5c", "חירום"],
    ["#16181d", "דיו"],
    ["#f4f5f8", "משטח"],
  ];
  const icons: { icon: IconName; label: string }[] = [
    { icon: "shelter", label: "מחסה" },
    { icon: "calendar", label: "עיקור" },
    { icon: "heart", label: "וטרינר" },
    { icon: "water", label: "מים" },
    { icon: "food", label: "אוכל" },
  ];
  return (
    <section className={`${styles.section} ${styles.designLanguage}`}>
      <SectionHeading number="05" label="איך זה נראה" title="שפה עיצובית" />
      <p className={styles.lead}>
        נקייה, מודרנית וקלילה, בהשראת טינדר. לבן כבסיס, כתום-קורל למותג, וקצת
        הומור.
      </p>
      <div className={styles.brandColor}>
        <strong>מותג</strong>
        <code>#FD2F79</code>
      </div>
      <div className={styles.palette}>
        {palette.map(([color, label]) => (
          <div
            className={styles.swatch}
            key={color}
            style={{ backgroundColor: color }}
          >
            <small>{label}</small>
            <code>{color.toUpperCase()}</code>
          </div>
        ))}
      </div>
      <div className={styles.typeSamples}>
        <div>
          <strong className={styles.hebrewGlyph}>אב</strong>
          <div className={styles.typeSampleMeta}>
            <strong>NarkisBlockMF</strong>
            <span>עברית</span>
          </div>
        </div>
        <div>
          <strong className={styles.latinGlyph}>Aa</strong>
          <div className={styles.typeSampleMeta}>
            <strong>Narkiss Block</strong>
            <span>ממשק ומספרים</span>
          </div>
        </div>
      </div>
      <div className={styles.photoCards}>
        <article>
          <div className={styles.photoWrapper}>
            <img
              src="/design/cat-photo.png"
              alt="חתול ג׳ינג׳י יושב בסמטה בשכונה"
            />
            <div className={styles.photoAvatarBadge}>
              <CatIllustration kind="mitzi" />
            </div>
          </div>
          <span>בכרטיס</span>
          <strong>תמונה אמיתית של החתול</strong>
        </article>
        <article>
          <div className={styles.avatarPreview}>
            <CatIllustration kind="mitzi" />
          </div>
          <span>במפה ובפרופיל</span>
          <strong>אווטאר מאויר קטן</strong>
        </article>
      </div>
      <h3 className={`${styles.subheading} ${styles.iconHeading}`}>אייקונים</h3>
      <div className={styles.iconSpec}>
        <div className={styles.pawGrid} aria-label="אייקון כף חתול">
          <img src="/design/paw-icon.svg" alt="" aria-hidden="true" />
        </div>
        <dl>
          <div>
            <dt>רשת</dt>
            <dd>24 × 24</dd>
          </div>
          <div>
            <dt>עובי קו</dt>
            <dd>2 px</dd>
          </div>
          <div>
            <dt>קצוות</dt>
            <dd>מעוגלים</dd>
          </div>
          <div>
            <dt>מילוי</dt>
            <dd>בלי</dd>
          </div>
        </dl>
      </div>
      <div className={styles.iconRow}>
        {icons.map(({ icon, label }) => (
          <div key={label}>
            <span>
              <NeedIcon name={icon} />
            </span>
            <small>{label}</small>
          </div>
        ))}
      </div>
      <h3 className={`${styles.subheading} ${styles.catHeading}`}>
        חתולי השכונה
      </h3>
      <p className={styles.catIntro}>
        בסיס אחיד לכולם, כל אווטאר מעוצב לפי המראה האמיתי של החתול: פרווה,
        כתמים, צבע עיניים וחיתוך באוזן.
      </p>
      <div className={styles.catGrid}>
        {cats.map((cat, index) => (
          <div className={styles.catItem} key={`${cat.name}-${index}`}>
            <div className={`${styles.catPortrait} ${styles[cat.color]}`}>
              <CatIllustration kind={cat.kind} />
            </div>
            <span>{cat.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Closing() {
  return (
    <footer className={styles.closing}>
      <img
        className={styles.closingLogo}
        src="/design/closing-logo.png"
        alt="CAT-CH"
      />
      <div className={styles.closingCopy}>
        <p className={styles.closingLightLine}>השכונה בשליטה.</p>
        <p className={styles.closingDarkLine}>החתולים מרוצים.</p>
      </div>
      <img
        className={styles.closingCat}
        src="/design/closing-cat.png"
        alt="איור חתול גדול, חתוך בתחתית העמוד"
      />
    </footer>
  );
}

export default function DesignPage() {
  return (
    <main className={styles.page} dir="rtl" data-design-page>
      <div className={styles.canvas}>
        <Hero />
        <BackgroundSection />
        <AudienceSection />
        <ProductSection />
        <ContentSection />
        <DailyLife />
        <DesignLanguage />
        <Closing />
      </div>
    </main>
  );
}
