import { useEffect, useMemo, useState } from "react";
/* =========================
 *   Time helpers
 *   ========================= */
function isLeap(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}
function dayOfYear(date) {
    const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const diff = date.getTime() - start.getTime();
    return Math.floor(diff / 86400000);
}
function fmtDateForInput(date) {
    const pad = (n) => String(n).padStart(2, "0");
    const y = date.getUTCFullYear();
    const M = pad(date.getUTCMonth() + 1);
    const d = pad(date.getUTCDate());
    const h = pad(date.getUTCHours());
    const m = pad(date.getUTCMinutes());
    const s = pad(date.getUTCSeconds());
    return `${y}-${M}-${d}T${h}:${m}:${s}`;
}
function parseInputToUTC(v) {
    if (!v)
        return null;
    const dt = new Date(v + "Z");
    return isNaN(dt.getTime()) ? null : dt;
}
function roundTo(value, places) {
    const p = Math.pow(10, places);
    return Math.round(value * p) / p;
}
/* Keep current month/day/time, force a target year (for “TNG Now”, etc.) */
function forceYearKeepTime(d, year) {
    return new Date(Date.UTC(year, d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()));
}
function setDateISO(setter, d) {
    setter(fmtDateForInput(d));
}
/* =========================
 *   Stardate Conversions
 *   ========================= */
// TNG/Okuda: 1000 per year, base 2323
function toTNGStardate(date) {
    const Y = date.getUTCFullYear();
    const doy = dayOfYear(date);
    const days = isLeap(Y) ? 366 : 365;
    const sec = date.getUTCHours() * 3600 +
        date.getUTCMinutes() * 60 +
        date.getUTCSeconds();
    return 1000 * (Y - 2323) + 1000 * ((doy + sec / 86400) / days);
}
function fromTNGStardate(sd) {
    const k = Math.floor(sd / 1000);
    const Y = 2323 + k;
    const days = isLeap(Y) ? 366 : 365;
    const remainder = sd - 1000 * k;
    const dayFrac = remainder / 1000;
    const totalDays = dayFrac * days;
    const doy = Math.floor(totalDays);
    const seconds = Math.round((totalDays - doy) * 86400);
    const date = new Date(Date.UTC(Y, 0, 1));
    date.setUTCDate(1 + doy);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCSeconds(seconds);
    return date;
}
// Custom linear model
function toCustomStardate(date, p) {
    const Y = date.getUTCFullYear();
    const doy = dayOfYear(date);
    const days = isLeap(Y) ? 366 : 365;
    const sec = date.getUTCHours() * 3600 +
        date.getUTCMinutes() * 60 +
        date.getUTCSeconds();
    const yearPart = p.unitsPerYear * (Y - p.baseYear);
    const fracPart = p.unitsPerYear * ((doy + sec / 86400) / days);
    return (p.offset ?? 0) + yearPart + fracPart;
}
function fromCustomStardate(sd, p) {
    const shifted = sd - (p.offset ?? 0);
    const k = Math.floor(shifted / p.unitsPerYear);
    const Y = p.baseYear + k;
    const days = isLeap(Y) ? 366 : 365;
    const remainder = shifted - p.unitsPerYear * k;
    const dayFrac = remainder / p.unitsPerYear;
    const totalDays = dayFrac * days;
    const doy = Math.floor(totalDays);
    const seconds = Math.round((totalDays - doy) * 86400);
    const date = new Date(Date.UTC(Y, 0, 1));
    date.setUTCDate(1 + doy);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCSeconds(seconds);
    return date;
}
/* =========================
 *   LCARS paint helpers (utility classes in CSS)
 *   ========================= */
const lcars = {
    bgShell: "lcars-shell",
    rail: "lcars-rail",
    pill: "lcars-pill",
    chunk: "lcars-chunk",
    corner: "lcars-corner",
    a: "lcars-a",
    b: "lcars-b",
    c: "lcars-c",
    d: "lcars-d",
    e: "lcars-e",
    card: "lcars-card",
    input: "lcars-input",
    btn: "lcars-btn",
    title: "lcars-title",
};
/* =========================
 *   Component
 *   ========================= */
export default function StardateWidget({ theme = "LCARS", }) {
    const url = new URL(typeof window !== "undefined" ? window.location.href : "http://localhost");
    const [model, setModel] = useState(() => url.searchParams.get("model") || "TNG");
    const [customParams, setCustomParams] = useState(() => ({
        baseYear: Number(url.searchParams.get("baseYear") || 2323),
        unitsPerYear: Number(url.searchParams.get("unitsPerYear") || 1000),
        offset: url.searchParams.get("offset")
            ? Number(url.searchParams.get("offset"))
            : 0,
    }));
    const [dateInput, setDateInput] = useState(() => {
        const q = url.searchParams.get("date");
        if (q) {
            const d = parseInputToUTC(q);
            if (d)
                return fmtDateForInput(d);
        }
        return fmtDateForInput(new Date());
    });
    const [sdInput, setSdInput] = useState(() => url.searchParams.get("sd") || "");
    const dateObj = useMemo(() => parseInputToUTC(dateInput) ?? new Date(), [dateInput]);
    const computedSd = useMemo(() => {
        const sd = model === "TNG"
            ? toTNGStardate(dateObj)
            : toCustomStardate(dateObj, customParams);
        return String(roundTo(sd, 1));
    }, [dateObj, model, customParams]);
    const computedDate = useMemo(() => {
        const n = Number(sdInput);
        if (!isFinite(n))
            return null;
        return model === "TNG"
            ? fromTNGStardate(n)
            : fromCustomStardate(n, customParams);
    }, [sdInput, model, customParams]);
    // Deep-link sync
    useEffect(() => {
        if (typeof window === "undefined")
            return;
        const params = new URLSearchParams();
        params.set("model", model);
        params.set("date", dateInput);
        params.set("sd", computedSd);
        if (model === "CUSTOM") {
            params.set("baseYear", String(customParams.baseYear));
            params.set("unitsPerYear", String(customParams.unitsPerYear));
            params.set("offset", String(customParams.offset ?? 0));
        }
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState(null, "", newUrl);
    }, [model, dateInput, computedSd, customParams]);
    const copy = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            alert("Copied");
        }
        catch { }
    };
    const shell = theme === "LCARS";
    /* ===== Anchor Now → 50000.0 (Custom auto-config) ===== */
    function anchorNowTo50k() {
        const now = new Date();
        const y = now.getUTCFullYear();
        const days = isLeap(y) ? 366 : 365;
        const doy = Math.floor((now.getTime() - Date.UTC(y, 0, 1)) / 86400000);
        const sec = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();
        const frac = (doy + sec / 86400) / days;
        const unitsPerYear = 1000;
        const offset = 50000 - (unitsPerYear * 0 + unitsPerYear * frac);
        setModel("CUSTOM");
        setCustomParams({ baseYear: y, unitsPerYear, offset });
        setDateISO(setDateInput, now);
    }
    /* =========================
     *     RENDER
     *     ========================= */
    return (<div className={`min-h-screen w-full ${shell ? lcars.bgShell : "bg-black"} text-gray-100 p-4 md:p-6`}>
      <div className="max-w-5xl mx-auto grid grid-cols-[18px_1fr] gap-4">

    {/* LEFT LCARS RAIL */}
        <div className={`${lcars.rail} flex flex-col gap-3 pt-8`}>
          <div className={`${lcars.chunk} ${lcars.a}`}/>
          <div className={`${lcars.chunk} ${lcars.b}`}/>
          <div className={`${lcars.chunk} ${lcars.c}`}/>
          <div className={`${lcars.chunk} ${lcars.d}`}/>
          <div className={`${lcars.chunk} ${lcars.e}`}/>
          <div className="flex-1"/>
          <div className={`${lcars.corner} ${lcars.b}`}/>
        </div>

    {/* MAIN CONSOLE */}
        <div className="space-y-6">
    {/* LCARS HEADER */}
          <div className="flex items-center gap-3 select-none">
            <div className={`h-8 w-40 ${lcars.pill} ${lcars.a}`}/>
            <div className={`h-6 w-28 ${lcars.pill} ${lcars.b}`}/>
            <div className={`h-4 w-20 ${lcars.pill} ${lcars.c}`}/>
            <h1 className={`ml-auto text-2xl ${lcars.title} opacity-90`}>Stardate Console</h1>
          </div>

    {/* PRESETS */}
          <div className="flex flex-wrap items-center gap-2">
            <button className={`${lcars.btn} ${lcars.a}`} onClick={() => setDateISO(setDateInput, forceYearKeepTime(new Date(), 2364))}>
              TNG Now (2364)
            </button>
          <button className={`${lcars.btn} ${lcars.b}`} onClick={() => setDateISO(setDateInput, forceYearKeepTime(new Date(), 2369))}>
              DS9 S1 (2369)
            </button>
            <button className={`${lcars.btn} ${lcars.c}`} onClick={() => setDateISO(setDateInput, forceYearKeepTime(new Date(), 2371))}>
              VOY S1 (2371)
            </button>
            <button className={`${lcars.btn} ${lcars.d}`} onClick={anchorNowTo50k}>
              Anchor Now → 50000.0
            </button>
          </div>

    {/* ROW: Date -> Stardate | Stardate -> Date */}
          <section className="grid md:grid-cols-2 gap-6">
            <div className={`${lcars.card} p-5 space-y-3`}>
              <h2 className="font-semibold tracking-wide">Earth Date → Stardate</h2>
              <label className="text-sm opacity-80">UTC Date &amp; Time</label>
              <input type="datetime-local" className={`w-full ${lcars.input}`} value={dateInput} onChange={(e) => setDateInput(e.target.value)} step={1}/>
              <div className="flex items-center gap-2">
                <output className="text-3xl md:text-4xl font-semibold tabular-nums">
                  {computedSd || "—"}
                </output>
                <button className={`ml-auto ${lcars.btn} ${lcars.a}`} onClick={() => copy(computedSd)}>
                  Copy
                </button>
              </div>
            </div>

            <div className={`${lcars.card} p-5 space-y-3`}>
              <h2 className="font-semibold tracking-wide">Stardate → Earth Date</h2>
              <label className="text-sm opacity-80">Stardate</label>
              <input type="text" inputMode="decimal" placeholder="e.g. 47634.4" className={`w-full ${lcars.input}`} value={sdInput} onChange={(e) => setSdInput(e.target.value)}/>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <output className="text-lg tabular-nums">
                    {computedDate ? fmtDateForInput(computedDate) : "—"}
                  </output>
                  <button className={`ml-auto ${lcars.btn} ${lcars.b}`} onClick={() => computedDate && copy(fmtDateForInput(computedDate))}>
                    Copy
                  </button>
                </div>
                <p className="text-xs opacity-70">(UTC)</p>
              </div>
            </div>
          </section>

    {/* MODEL / SETTINGS */}
          <section className={`${lcars.card} p-5 space-y-3`}>
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm">Model</label>
              <select className={`${lcars.input}`} value={model} onChange={(e) => setModel(e.target.value)}>
                <option value="TNG">TNG / DS9 / VOY (Okuda)</option>
                <option value="CUSTOM">Custom Linear</option>
              </select>
            </div>

    {model === "CUSTOM" && (<div className="grid md:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm opacity-80">Base Year</label>
                  <input type="number" className={`w-full ${lcars.input}`} value={customParams.baseYear} onChange={(e) => setCustomParams((p) => ({ ...p, baseYear: Number(e.target.value) }))}/>
                </div>
                <div>
                  <label className="text-sm opacity-80">Units / Year</label>
                  <input type="number" className={`w-full ${lcars.input}`} value={customParams.unitsPerYear} onChange={(e) => setCustomParams((p) => ({ ...p, unitsPerYear: Number(e.target.value) }))}/>
                </div>
                <div>
                  <label className="text-sm opacity-80">Offset</label>
                  <input type="number" className={`w-full ${lcars.input}`} value={customParams.offset ?? 0} onChange={(e) => setCustomParams((p) => ({ ...p, offset: Number(e.target.value) }))}/>
                </div>
              </div>)}

            <p className="text-xs opacity-70">
              Deep links supported: model, date, sd, baseYear, unitsPerYear, offset.
            </p>
          </section>

          <footer className="text-xs opacity-60">
            <p>
              Validation checks: 2364-01-01 → ~41000.0 • 2364-12-31 23:59:59 → ~41999.9
            </p>
          </footer>
        </div>
      </div>
    </div>);
}
