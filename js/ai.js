/* Date Me — AI planner (talks to the date-me-ai Cloudflare Worker, which holds the Claude key).
 *
 * The app sends what the quiz learned (age, sliders, interests, love language,
 * foods to avoid — never the person's name), the area, the season, the weather
 * and the filters. The worker asks Claude for five custom ideas, using web search
 * to find real places and things happening this week, and sends them back in the
 * same shape as ideas.js.
 *
 * AI ideas are kept on the profile and registered as an idea source, so they
 * stay in the deck (ranked like everything else) after the first showing.
 */
(function () {
  const DM = (window.DateMe = window.DateMe || {});
  const ENDPOINT = "https://date-me-ai.52bulls.workers.dev/plan";
  const TIMEOUT_MS = 100000;
  const SEASON = { sp: "spring", su: "summer", fa: "fall", wi: "winter" };
  const FEATURE_WORDS = { lake: "lakes", coast: "the coast", beach: "beaches", mountains: "mountains", trails: "hiking trails",
    river: "a river", hotspring: "hot springs", ski: "ski areas", snow: "snow on the ground", city: "a city with museums and venues" };

  const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);

  function payload(profile, request) {
    const person = (a) => a && {
      age: DM.Engine.ageOf(a),
      outdoorsy: a.outdoorsy, outAbout: a.outAbout, adventure: a.adventure, active: a.active, crowds: a.crowds,
      foodie: a.foodie, dislikes: a.dislikes, interests: a.interests, love: a.love,
    };
    const me = DM.Store.me();
    const place = profile.place;
    const today = new Date();
    const body = {
      profile: person(profile.answers),   // the person being taken on the date (null if we're waiting on them)
      me: person(me),                     // the planner
      budget: profile.filters ? profile.filters.budget : me && me.budget,
      season: SEASON[DM.Engine.seasonFor(today, place ? place.lat : 40)],
      today: today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
      filters: profile.filters,
      exclude: [...profile.saved.map((s) => s.idea.t), ...(profile.aiIdeas || []).map((i) => i.t)].slice(0, 60),
      request: request || "",
    };
    if (place) {
      const [city, region] = place.label.split(",").map((s) => s.trim());
      const wx = place.weather;
      body.place = {
        label: place.label, city, region, cc: place.cc,
        features: Object.entries(place.features || {}).filter(([, v]) => v === true).map(([k]) => FEATURE_WORDS[k] || k),
        weather: wx ? `${wx.temp}${wx.unit}, ${wx.text}${wx.rainy ? ", rain likely" : ""}` : "",
      };
    }
    return body;
  }

  // Raw idea from the worker -> an idea the engine understands.
  function toIdea(raw, place) {
    const idea = { ...raw, id: `ai:${slug(raw.t)}-${Date.now().toString(36).slice(-4)}`, aiWhy: raw.why, aiAt: Date.now() };
    delete idea.why;
    if (raw.place && raw.place.name) {
      const where = [raw.place.name, raw.place.address || (place && place.label) || ""].join(" ").trim();
      idea.place = { name: raw.place.name, url: raw.place.url || `https://www.google.com/maps/search/${encodeURIComponent(where)}` };
    } else {
      idea.place = null;
    }
    return idea;
  }

  class PlanError extends Error {
    constructor(code, who) { super(code); this.code = code; this.who = who; }
  }

  async function plan(profile, request, signal) {
    if (mockOn()) return mock(profile);
    let res;
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
      if (signal) signal.addEventListener("abort", () => ctl.abort());
      res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload(profile, request)),
        signal: ctl.signal,
      });
      clearTimeout(t);
    } catch (e) {
      throw new PlanError(signal && signal.aborted ? "cancelled" : "network");
    }
    let data = {};
    try { data = await res.json(); } catch (e) { /* empty or broken body */ }
    if (!res.ok || !data.ideas) throw new PlanError(data.error || "failed", data.who);
    return data.ideas.map((r) => toIdea(r, profile.place));
  }

  // For testing the screens without spending anything: localStorage "dateme:aimock" = "1".
  function mockOn() { try { return localStorage.getItem("dateme:aimock") === "1"; } catch (e) { return false; } }
  async function mock(profile) {
    await new Promise((r) => setTimeout(r, 2500));
    const label = profile.place ? profile.place.label : "town";
    return [
      { t: "Bird show & ramen", e: "🦜", d: "Catch the indoor bird show, then warm up with big bowls of ramen.", why: "they love animals and it's chilly", c: 2, m: 180, io: "in", cat: "culture", w: "a", int: ["animals"], love: ["time"], fd: [], act: 2, adv: 3, crowd: 5, food: 5, tr: 1, age: 0, place: { name: "Tracy Aviary", address: label, url: "" } },
      { t: "Sunset canyon picnic", e: "🌄", d: "Pack sandwiches and catch golden hour from a canyon pull-off.", why: "outdoorsy and loves quality time", c: 1, m: 150, io: "out", cat: "outdoors", w: "e", int: ["outdoorsy"], love: ["time"], fd: [], act: 3, adv: 4, crowd: 1, food: 3, tr: 2, age: 0, place: null },
    ].map((r) => toIdea(r, profile.place));
  }

  DM.AI = { plan, payload, toIdea, PlanError };

  // Saved AI ideas come back into the deck like any other source.
  DM.Engine.registerSource({
    id: "ai",
    label: "AI planner",
    getIdeas: async (ctx) => {
      const p = ctx.profileId && DM.Store.get(ctx.profileId);
      return (p && p.aiIdeas) || [];
    },
  });
})();
