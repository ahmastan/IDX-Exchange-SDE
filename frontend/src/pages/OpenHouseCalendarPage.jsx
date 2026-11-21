import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchOpenHouseCalendar } from "../api/client";
import { formatNumber, formatPrice } from "../utils/format";
import { formatOpenHouseDate, formatTime, formatTimeRange } from "../utils/openHouses";
import {
  currentMonth,
  formatMonth,
  groupByDate,
  monthGrid,
  monthKey,
  parseMonth,
  shiftMonth,
  todayIso,
} from "../utils/calendar";
import "./OpenHouseCalendarPage.css";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// Events listed inside a day cell; the rest are behind "+N more"
const EVENTS_PER_CELL = 3;
// Busy days have thousands of open houses, so the day list grows in steps
const DAY_LIST_STEP = 50;

const propertyPath = (openHouse) => `/property/${encodeURIComponent(openHouse.L_ListingID)}`;
const shortAddress = (openHouse) => openHouse.L_Address?.trim() || "Address not available";

// Month view of every open house. The month is in the URL (?month=2026-09),
// so it survives a refresh, can be shared, and works with Back/Forward.
export default function OpenHouseCalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const month = parseMonth(searchParams.get("month")) ?? currentMonth();
  const key = monthKey(month);
  // The grid is rebuilt only when the month changes
  const days = useMemo(() => monthGrid(parseMonth(key)), [key]);

  // The result remembers which month it belongs to. While it is for another
  // month the page shows "loading", so moving between months (including with
  // the browser's Back button) never shows the old month's events.
  const [result, setResult] = useState({ key: null });
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState({ key: null, date: null });

  useEffect(() => {
    const controller = new AbortController();
    const startDate = days[0].date;
    const endDate = days[days.length - 1].date;
    fetchOpenHouseCalendar(startDate, endDate, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setResult({ key, status: "success", byDate: groupByDate(data) });
      })
      .catch((err) => {
        if (err.name === "AbortError" || controller.signal.aborted) return;
        setResult({ key, status: "error", error: err.message });
      });
    return () => controller.abort();
  }, [key, days, attempt]);

  const status = result.key === key ? result.status : "loading";
  const byDate = status === "success" ? result.byDate : null;
  // A selected day only counts for the month it was picked in
  const selectedDate = selected.key === key ? selected.date : null;

  const monthTotal = byDate
    ? days.reduce((sum, d) => sum + (d.inMonth ? (byDate.get(d.date)?.length ?? 0) : 0), 0)
    : 0;

  function goToMonth(next) {
    setSearchParams({ month: monthKey(next) });
  }

  function retry() {
    setResult({ key: null });
    setAttempt((n) => n + 1);
  }

  const today = todayIso();
  const label = formatMonth(month);

  return (
    <main className="calendar-page">
      <header className="calendar-page__header">
        <div>
          <h1>Open House Calendar</h1>
          <p className="calendar-page__summary" aria-live="polite">
            {status === "success" &&
              (monthTotal === 0
                ? `No open houses scheduled in ${label}`
                : `${formatNumber(monthTotal)} open ${monthTotal === 1 ? "house" : "houses"} in ${label}`)}
          </p>
        </div>
        <nav className="calendar-page__nav" aria-label="Change month">
          <button type="button" onClick={() => goToMonth(shiftMonth(month, -1))} aria-label="Previous month">
            ‹
          </button>
          <h2 className="calendar-page__month">{label}</h2>
          <button type="button" onClick={() => goToMonth(shiftMonth(month, 1))} aria-label="Next month">
            ›
          </button>
          <button type="button" className="calendar-page__today" onClick={() => goToMonth(currentMonth())}>
            Today
          </button>
        </nav>
      </header>

      {status === "error" && (
        <div className="calendar-page__error" role="alert">
          <p>{result.error}</p>
          <button type="button" onClick={retry}>
            Try again
          </button>
        </div>
      )}

      <div className="calendar" aria-busy={status === "loading"}>
        <div className="calendar__weekdays" aria-hidden="true">
          {WEEKDAYS.map((name) => (
            <div key={name}>{name}</div>
          ))}
        </div>
        <ol className="calendar__grid" aria-label={`${label} open houses`}>
          {days.map((d) => {
            const events = byDate?.get(d.date) ?? [];
            const hidden = events.length - EVENTS_PER_CELL;
            const classes = [
              "calendar__day",
              !d.inMonth && "calendar__day--outside",
              d.date === today && "calendar__day--today",
              d.date === selectedDate && "calendar__day--selected",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <li key={d.date} className={classes}>
                <button
                  type="button"
                  className="calendar__date"
                  onClick={() => setSelected({ key, date: d.date })}
                  aria-label={`${formatOpenHouseDate(d.date)}: ${events.length} open ${events.length === 1 ? "house" : "houses"}`}
                  aria-pressed={d.date === selectedDate}
                >
                  <span>{d.day}</span>
                  {events.length > 0 && <span className="calendar__badge">{formatNumber(events.length)}</span>}
                </button>
                {events.length > 0 && (
                  <ul className="calendar__events">
                    {events.slice(0, EVENTS_PER_CELL).map((oh) => (
                      <li key={oh.id}>
                        <Link to={propertyPath(oh)} className="calendar__event" title={shortAddress(oh)}>
                          <span className="calendar__event-time">{formatTime(oh.OH_StartTime)}</span>{" "}
                          {shortAddress(oh)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {hidden > 0 && (
                  <button type="button" className="calendar__more" onClick={() => setSelected({ key, date: d.date })}>
                    +{formatNumber(hidden)} more
                  </button>
                )}
              </li>
            );
          })}
        </ol>
        {status === "loading" && (
          <p className="calendar__loading" role="status">
            Loading open houses…
          </p>
        )}
      </div>

      {status === "success" &&
        (selectedDate ? (
          // Keyed by date so the "show more" count starts over for each day
          <DayList key={selectedDate} date={selectedDate} openHouses={byDate.get(selectedDate) ?? []} />
        ) : (
          <p className="calendar-page__hint">Select a day to see all of its open houses.</p>
        ))}
    </main>
  );
}

function DayList({ date, openHouses }) {
  const [shown, setShown] = useState(DAY_LIST_STEP);
  const count = openHouses.length;

  return (
    <section className="day-list" aria-labelledby="day-list-title">
      <h2 id="day-list-title">
        {formatOpenHouseDate(date)}
        <span className="day-list__count">
          {formatNumber(count)} open {count === 1 ? "house" : "houses"}
        </span>
      </h2>
      {count === 0 ? (
        <p className="day-list__empty">No open houses on this day.</p>
      ) : (
        <>
          <ul className="day-list__items">
            {openHouses.slice(0, shown).map((oh) => (
              <li key={oh.id}>
                <Link to={propertyPath(oh)} className="day-list__item">
                  <span className="day-list__time">{formatTimeRange(oh.OH_StartTime, oh.OH_EndTime) ?? "Time TBA"}</span>
                  <span className="day-list__main">
                    <strong>{shortAddress(oh)}</strong>
                    <span className="day-list__meta">
                      {[oh.L_City?.trim(), formatPrice(oh.L_SystemPrice), formatOpenHouseType(oh.OpenHouseType)]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    {oh.OpenHouseRemarks && <span className="day-list__remarks">{oh.OpenHouseRemarks}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {shown < count && (
            <button type="button" className="day-list__more" onClick={() => setShown((n) => n + DAY_LIST_STEP)}>
              Show {formatNumber(Math.min(DAY_LIST_STEP, count - shown))} more of {formatNumber(count - shown)}
            </button>
          )}
        </>
      )}
    </section>
  );
}

// "LivestreamPublic" -> "Livestream public open house"; "Public" is the norm,
// so it isn't labelled
function formatOpenHouseType(type) {
  if (!type || type === "Public") return null;
  const words = type.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return `${words.charAt(0).toUpperCase()}${words.slice(1)} open house`;
}
