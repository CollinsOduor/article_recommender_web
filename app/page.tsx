"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type HistoryEvent = {
  article_id: string;
  page_section: string;
};

type Recommendation = {
  article_id: string;
  title: string | null;
  score: number;
};

type RecommendationResponse = {
  recommendations: Recommendation[];
  history_used: number;
  candidate_count: number;
};

type HealthResponse = {
  status: "ready";
  candidate_articles: number;
  look_back: number;
};

const emptyHistory = (): HistoryEvent[] =>
  Array.from({ length: 5 }, () => ({ article_id: "", page_section: "" }));

function localDateTimeValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function localDateTimeWithOffset(value: string): string {
  const date = new Date(value);
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absoluteOffset / 60)).padStart(2, "0");
  const minutes = String(absoluteOffset % 60).padStart(2, "0");
  return `${value}:00${sign}${hours}:${minutes}`;
}

async function responseMessage(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  if (body && typeof body === "object" && "detail" in body) {
    const detail = body.detail;
    if (typeof detail === "string") return detail;
    if (detail && typeof detail === "object" && "reason" in detail) {
      const reason = detail.reason;
      if (typeof reason === "string") return reason;
    }
    if (Array.isArray(detail)) {
      return detail
        .map((item) =>
          item && typeof item === "object" && "msg" in item
            ? String(item.msg)
            : String(item),
        )
        .join(" ");
    }
  }
  return `Request failed (${response.status}). Please try again.`;
}

export default function Home() {
  const [history, setHistory] = useState<HistoryEvent[]>(emptyHistory);
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [jobtitle, setJobtitle] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState("");
  const [allowMarketing, setAllowMarketing] = useState("");
  const [recommendationTime, setRecommendationTime] = useState("");
  const [topK, setTopK] = useState(5);
  const [excludeSeen, setExcludeSeen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RecommendationResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthMessage, setHealthMessage] = useState("Checking recommender…");

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch("/recommender/health", { cache: "no-store" });
      if (!response.ok) {
        setHealth(null);
        setHealthMessage(
          response.status >= 500 && response.status !== 503
            ? "Cannot reach the recommender API"
            : await responseMessage(response),
        );
        return;
      }
      const data = (await response.json()) as HealthResponse;
      setHealth(data);
      setHealthMessage("Recommender online");
    } catch {
      setHealth(null);
      setHealthMessage("Cannot reach the recommender API");
    }
  }, []);

  useEffect(() => {
    setRecommendationTime(localDateTimeValue(new Date()));
    void checkHealth();
    const timer = window.setInterval(() => void checkHealth(), 15_000);
    return () => window.clearInterval(timer);
  }, [checkHealth]);

  function updateHistory(
    index: number,
    key: keyof HistoryEvent,
    value: string,
  ) {
    setHistory((current) =>
      current.map((event, eventIndex) =>
        eventIndex === index ? { ...event, [key]: value } : event,
      ),
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);

    if (history.some((item) => !item.article_id.trim())) {
      setError("Enter an article ID for each of the five recent reads.");
      return;
    }
    if (!recommendationTime || Number.isNaN(new Date(recommendationTime).getTime())) {
      setError("Choose a valid recommendation date and time.");
      return;
    }

    const numericAge = age === "" ? null : Number(age);
    if (numericAge !== null && (!Number.isFinite(numericAge) || numericAge < 0)) {
      setError("Age must be a non-negative number.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/recommender/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: history.map((item) => ({
            article_id: item.article_id.trim(),
            page_section: item.page_section.trim() || null,
          })),
          profile: {
            age: numericAge,
            gender: gender.trim() || null,
            jobtitle: jobtitle.trim() || null,
            subscription_status: subscriptionStatus || null,
            allow_marketing:
              allowMarketing === "" ? null : allowMarketing === "true",
          },
          recommendation_time: localDateTimeWithOffset(recommendationTime),
          top_k: topK,
          exclude_seen: excludeSeen,
        }),
      });

      if (!response.ok) {
        setError(await responseMessage(response));
        return;
      }
      setResult((await response.json()) as RecommendationResponse);
    } catch {
      setError("Could not connect to the recommender API. Check that it is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Next Article home">
          <span className="brand-mark">N</span>
          <span>next<span className="brand-light">article</span></span>
        </a>
        <div className={`service-status ${health ? "is-ready" : ""}`}>
          <span className="status-dot" />
          <span>{healthMessage}</span>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span /> YOUR NEXT GOOD READ</div>
          <h1>Stories that<br /><em>find you.</em></h1>
          <p>
            Tell us what you’ve been reading. We’ll find the next articles worth
            your time.
          </p>
          {health && (
            <div className="model-note">
              <span className="note-icon">✳</span>
              <span>
                Personalizing from <strong>{health.candidate_articles.toLocaleString()}</strong>
                {" "}articles
              </span>
            </div>
          )}
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          <div className="art-card art-card-back">
            <span className="art-lines" />
            <span className="art-lines short" />
          </div>
          <div className="art-card art-card-front">
            <span className="art-kicker">THE DAILY EDIT</span>
            <span className="art-headline">A new<br />perspective.</span>
            <span className="art-rule" />
            <span className="art-lines" />
            <span className="art-lines short" />
          </div>
          <div className="spark spark-one">✳</div>
          <div className="spark spark-two">✦</div>
          <div className="art-caption">CURATED FOR YOU <span>↗</span></div>
        </div>
      </section>

      <div className="content-grid">
        <section className="form-panel">
          <div className="section-heading">
            <div>
              <span className="step-label">01 / YOUR READING TRAIL</span>
              <h2>What have you read lately?</h2>
            </div>
            <span className="required-pill">5 reads</span>
          </div>
          <p className="section-intro">
            Add your five most recent article IDs, from oldest to newest.
            Sections are optional.
          </p>

          <form onSubmit={submit}>
            <div className="history-list">
              {history.map((item, index) => (
                <div className="history-row" key={index}>
                  <span className="history-index">{String(index + 1).padStart(2, "0")}</span>
                  <label className="field article-field">
                    <span className="sr-only">Article ID for read {index + 1}</span>
                    <input
                      value={item.article_id}
                      onChange={(event) =>
                        updateHistory(index, "article_id", event.target.value)
                      }
                      placeholder="Article ID"
                      maxLength={256}
                      required
                    />
                  </label>
                  <label className="field section-field">
                    <span className="sr-only">Section for read {index + 1}</span>
                    <input
                      value={item.page_section}
                      onChange={(event) =>
                        updateHistory(index, "page_section", event.target.value)
                      }
                      placeholder="Section (optional)"
                      maxLength={128}
                    />
                  </label>
                </div>
              ))}
            </div>
            <p className="helper-text">
              Article IDs should come from the model’s training catalog. Unknown
              IDs can be entered, but may be less informative.
            </p>

            <div className="form-divider" />

            <div className="section-heading profile-heading">
              <div>
                <span className="step-label">02 / A LITTLE ABOUT YOU</span>
                <h2>Make it personal</h2>
              </div>
              <span className="optional-pill">optional</span>
            </div>
            <p className="section-intro">
              These details help tailor recommendations. Leave anything blank
              you’d rather not share.
            </p>

            <div className="profile-grid">
              <label className="field">
                <span>Age</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={age}
                  onChange={(event) => setAge(event.target.value)}
                  placeholder="Not specified"
                />
              </label>
              <label className="field">
                <span>Gender</span>
                <input
                  value={gender}
                  onChange={(event) => setGender(event.target.value)}
                  placeholder="Not specified"
                />
              </label>
              <label className="field">
                <span>Job title</span>
                <input
                  value={jobtitle}
                  onChange={(event) => setJobtitle(event.target.value)}
                  placeholder="Not specified"
                />
              </label>
              <label className="field">
                <span>Subscription</span>
                <input
                  value={subscriptionStatus}
                  onChange={(event) => setSubscriptionStatus(event.target.value)}
                  placeholder="e.g. registered"
                />
              </label>
              <label className="field marketing-field">
                <span>Marketing preferences</span>
                <select
                  value={allowMarketing}
                  onChange={(event) => setAllowMarketing(event.target.value)}
                >
                  <option value="">Not specified</option>
                  <option value="true">Opted in</option>
                  <option value="false">Opted out</option>
                </select>
              </label>
              <label className="field">
                <span>Recommendation time</span>
                <input
                  type="datetime-local"
                  value={recommendationTime}
                  onChange={(event) => setRecommendationTime(event.target.value)}
                  required
                />
              </label>
            </div>

            <div className="preferences-row">
              <label className="field count-field">
                <span>Recommendations</span>
                <select
                  value={topK}
                  onChange={(event) => setTopK(Number(event.target.value))}
                >
                  {[3, 5, 10, 15, 20].map((count) => (
                    <option key={count} value={count}>{count} articles</option>
                  ))}
                </select>
              </label>
              <label className="toggle-option">
                <input
                  type="checkbox"
                  checked={excludeSeen}
                  onChange={(event) => setExcludeSeen(event.target.checked)}
                />
                <span className="toggle-track"><span /></span>
                <span className="toggle-copy">
                  <strong>Hide articles I’ve read</strong>
                  <small>Keep recent reads out of your results</small>
                </span>
              </label>
            </div>

            {error && (
              <div className="error-message" role="alert">
                <span>!</span>{error}
              </div>
            )}

            <button className="submit-button" type="submit" disabled={loading}>
              {loading ? (
                <><span className="spinner" /> Finding your next reads…</>
              ) : (
                <>Find my next reads <span>↗</span></>
              )}
            </button>
            <p className="privacy-note">
              <span>◇</span> Your details are only used to generate this recommendation.
            </p>
          </form>
        </section>

        <aside className="results-panel" aria-live="polite">
          <div className="results-topline">
            <span className="step-label">YOUR PERSONAL EDITION</span>
            <span className="results-star">✳</span>
          </div>
          <h2>{result ? "Picked for you." : "Your next read is waiting."}</h2>
          <p className="results-description">
            {result
              ? `${result.recommendations.length} recommendations, based on your recent reading.`
              : "Your recommendations will appear here once we know what you’ve been reading."}
          </p>

          {!result && (
            <div className="empty-state">
              <div className="empty-stack">
                <div className="stack-sheet sheet-back" />
                <div className="stack-sheet sheet-mid" />
                <div className="stack-sheet sheet-front">
                  <span>✦</span>
                  <i /><i /><i />
                </div>
              </div>
              <span className="empty-label">A little inspiration, coming up</span>
              <span className="empty-arrow">↓</span>
            </div>
          )}

          {result && (
            <div className="recommendation-list">
              {result.recommendations.length === 0 ? (
                <div className="no-results">
                  <span>✳</span>
                  <strong>No new articles left to recommend.</strong>
                  <p>Try turning off “Hide articles I’ve read” or changing your reading history.</p>
                </div>
              ) : (
                result.recommendations.map((recommendation, index) => (
                  <article className="recommendation-card" key={recommendation.article_id}>
                    <div className={`cover cover-${index % 5}`}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <i>{["✳", "◒", "✦", "◈", "✺"][index % 5]}</i>
                    </div>
                    <div className="recommendation-copy">
                      <span className="recommendation-kicker">RECOMMENDED FOR YOU</span>
                      <h3>{recommendation.title || "Untitled article"}</h3>
                      <span className="article-id">{recommendation.article_id}</span>
                    </div>
                    <div className="score">
                      {new Intl.NumberFormat(undefined, {
                        style: "percent",
                        maximumFractionDigits: 2,
                      }).format(recommendation.score)}
                    </div>
                  </article>
                ))
              )}
              <div className="result-footnote">
                Based on {result.history_used} recent reads
                <span>·</span>
                {result.candidate_count.toLocaleString()} eligible articles
              </div>
            </div>
          )}

          <div className="results-footer">
            <span>READ CURIOUSLY</span><span>✳</span><span>STAY OPEN</span>
          </div>
        </aside>
      </div>
      <footer className="page-footer">
        <span>&; NEXTARTICLE</span>
        <span>GOOD STORIES, ONE READ AT A TIME.</span>
      </footer>
    </main>
  );
}
