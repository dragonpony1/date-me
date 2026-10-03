/* Date Me — the idea engine.
 *
 * 1. SOURCES hand over ideas. The built-in library is one (ideas.js).
 *    To add real nearby places or AI suggestions later, register another:
 *
 *      DateMe.Engine.registerSource({
 *        id: "places",
 *        label: "Nearby spots",
 *        // ctx = { answers, age, season, place, filters }
 *        getIdeas: async (ctx) => {
 *          const res = await fetch(`https://your-api.example/near?lat=${ctx.place.lat}&lon=${ctx.place.lon}`);
 *          const spots = await res.json();
 *          // Return ideas in the same shape as ideas.js. An optional `place`
 *          // object ({ name, address, url, lat, lon }) shows on the card.
 *          return spots.map((s) => ({ id: "places:" + s.id, t: s.name, e: "📍", cat: "food", d: s.blurb,
 *                                     c: s.priceLevel, m: 90, io: "in", place: { name: s.name, url: s.url } }));
 *        },
 *      });
 *
 *    A source that throws or times out is skipped; the rest still work.
 *
 * 2. FILTER drops anything that can't happen (too young, wrong season, food
 *    they hate, over budget, no lake nearby...).
 *
 * 3. SCORE ranks what's left against the quiz answers, the season, the
 *    weather and what's near them, and explains the top reasons.
 */
(function () {
  const DM = (window.DateMe = window.DateMe || {});
  const sources = [];

  function registerSource(src) {
    const i = sources.findIndex((s) => s.id === src.id);
    if (i >= 0) sources[i] = src; else sources.push(src);
  }

  const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const SOC_BY_TRAVEL = [1, 6, 7, 8];
  const OD_BY_IO = { out: 9, mix: 5, in: 1 };

  // Fill in defaults so the scorer never has to guess.
  function normalize(raw, sourceId) {
    const io = raw.io || "mix";
    const tr = raw.tr != null ? raw.tr : 1;
    return {
      ...raw,
      id: raw.id || (sourceId === "library" ? "" : sourceId + ":") + slug(raw.t),
      source: sourceId,
      cat: raw.cat || "adventure",
      c: raw.c != null ? raw.c : 1,
      m: raw.m || 90,
      io,
      tr,
      act: raw.act != null ? raw.act : 3,
      adv: raw.adv != null ? raw.adv : 3,
      crowd: raw.crowd != null ? raw.crowd : 4,
      food: raw.food || 0,
      soc: raw.soc != null ? raw.soc : SOC_BY_TRAVEL[tr],
      od: raw.od != null ? raw.od : OD_BY_IO[io],
      w: raw.w || "aen",
      int: raw.int || [],
      love: raw.love || [],
      s: raw.s || null,
      need: raw.need || [],
      fd: raw.fd || [],
      age: raw.age || 0,
      y: !!raw.y, grown: !!raw.grown, car: !!raw.car, screen: !!raw.screen,
    };
  }

  async function gather(ctx) {
    const lists = await Promise.all(
      sources.map(async (src) => {
        try {
          if (src.enabled && !src.enabled(ctx)) return [];
          const ideas = await Promise.race([
            src.getIdeas(ctx),
            new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000)),
          ]);
          return (ideas || []).map((r) => normalize(r, src.id));
        } catch (e) {
          console.warn("Date Me: source failed", src.id, e);
          return [];
        }
      })
    );
    const seen = new Set();
    return lists.flat().filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
  }

  // ---------- context helpers ----------
  // Age from a birthday, or from an age someone shared at a known time (quiz links carry age, not birthday).
  function ageOf(a, now = new Date()) {
    if (!a) return null;
    if (a.birthdate) return ageFrom(a.birthdate, now);
    if (a.age != null) return a.age + Math.floor((now - (a.ageAt || now)) / (365.25 * 864e5));
    return null;
  }

  function ageFrom(birthdate, now = new Date()) {
    if (!birthdate) return null;
    const b = new Date(birthdate + "T12:00:00");
    if (isNaN(b)) return null;
    let a = now.getFullYear() - b.getFullYear();
    const m = now.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--;
    return a;
  }

  function seasonFor(date = new Date(), lat = 40) {
    const north = ["wi", "wi", "sp", "sp", "sp", "su", "su", "su", "fa", "fa", "fa", "wi"][date.getMonth()];
    if (lat >= 0) return north;
    return { wi: "su", su: "wi", sp: "fa", fa: "sp" }[north];
  }

  const SEASON_NAME = { sp: "spring", su: "summer", fa: "fall", wi: "winter" };

  // Features we'll still allow when we couldn't check (they're nearly everywhere).
  const COMMON_FEATURES = new Set(["lake", "trails", "river", "city"]);

  function hash01(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ((h >>> 0) % 100000) / 100000;
  }

  // ---------- filtering ----------
  // Returns null if the idea can happen, or a short reason it can't.
  function blocked(idea, ctx) {
    const { answers, age, season, place, filters } = ctx;
    if (age != null && idea.age > age) return "age";
    // Under 18: nothing that only happens late at night away from home.
    if (age != null && age < 18 && idea.w === "n" && idea.tr >= 1) return "curfew";
    // Nobody can drive: no road trips.
    if (ctx.noCar && idea.tr >= 3) return "car";
    if (idea.s && !idea.s.includes(season)) return "season";
    const dislikes = ctx.dislikes || answers.dislikes || [];
    if (idea.fd.some((f) => dislikes.includes(f))) return "food";

    const feats = (place && place.features) || {};
    for (const need of idea.need) {
      const has = feats[need];
      if (has === false) return "place";
      if (has == null && !COMMON_FEATURES.has(need)) return "place";
    }

    if (filters) {
      if (idea.c > filters.budget) return "budget";
      if (filters.io === "in" && idea.io === "out") return "io";
      if (filters.io === "out" && idea.io === "in") return "io";
      if (filters.time && filters.time !== "any" && !idea.w.includes(filters.time)) return "time";
      if (filters.dist != null && idea.tr > filters.dist) return "distance";
    }
    return null;
  }

  // ---------- scoring ----------
  const INTEREST_WHY = {
    artsy: "they're artsy", sporty: "they're sporty", nerdy: "nerd-approved",
    musical: "for their music side", outdoorsy: "for their outdoorsy side", gamer: "gamer-approved",
    animals: "an animal lover's pick", cars: "for the car lover", books: "bookworm-approved",
    fashion: "for their sense of style", cooking: "they love to cook", theater: "for their dramatic side",
  };
  const BOTH_WHY = {
    artsy: "you're both artsy", sporty: "you're both sporty", nerdy: "two nerds, perfect", musical: "you both love music",
    outdoorsy: "you both love the outdoors", gamer: "you're both gamers", animals: "you both love animals", cars: "you're both car people",
    books: "two bookworms", fashion: "you both love style", cooking: "you both love to cook", theater: "you're both theater kids",
  };
  const LOVE_WHY = {
    time: "real quality time", words: "room for sweet words", gifts: "a little gift in it",
    acts: "a thoughtful act of service", touch: "lots of closeness",
  };
  const FEATURE_WHY = {
    lake: "there's a lake nearby", coast: "you're near the coast", beach: "there's a beach nearby",
    mountains: "mountains nearby", trails: "trails nearby", river: "a river nearby",
    hotspring: "hot springs within reach", ski: "ski hills within reach", snow: "there's snow",
    city: "your city has this",
  };

  const sim = (p, v) => 1 - Math.abs(p - v) / 10; // 0..1

  function score(idea, ctx) {
    const a = ctx.answers;                                  // the person being taken on the date
    const me = ctx.me && ctx.me !== ctx.answers ? ctx.me : null; // the planner, when we know them
    const reasons = []; // [weight, text]
    let s = 0;

    // Personality sliders: closer = better. Each worth up to ±weight. With both of you known,
    // their fit counts a little more than yours (it's their date), but yours matters too.
    const dims = [
      ["outdoorsy", "od", 1.4],
      ["active", "act", 1.2],
      ["adventure", "adv", 1.1],
      ["outAbout", "soc", 1.0],
      ["crowds", "crowd", 0.9],
    ];
    for (const [key, field, w] of dims) {
      let fit = sim(a[key] != null ? a[key] : 5, idea[field]);
      if (me) fit = 0.55 * fit + 0.45 * sim(me[key] != null ? me[key] : 5, idea[field]);
      s += w * (fit - 0.5) * 2;
    }
    const both = (key, test) => test(a[key]) && me && test(me[key]);
    if (both("adventure", (v) => v >= 7) && idea.adv >= 7) reasons.push([1.3, "you're both up for adventure"]);
    else if (a.adventure >= 7 && idea.adv >= 7) reasons.push([1.1, "fits their adventurous side"]);
    if (a.adventure <= 3 && idea.adv <= 2) reasons.push([0.8, me && me.adventure <= 3 ? "nice and chill, like you two" : "nice and chill, like them"]);
    if (a.outAbout <= 3 && idea.tr === 0) reasons.push([1.0, "cozy at home"]);
    if (both("outdoorsy", (v) => v >= 7) && idea.od >= 8) reasons.push([1.1, "you're both outdoorsy"]);
    else if (a.outdoorsy >= 7 && idea.od >= 8) reasons.push([0.9, "gets them outside"]);
    if (a.active >= 7 && idea.act >= 7) reasons.push([0.9, "keeps them moving"]);
    if (a.crowds <= 3 && idea.crowd <= 1) reasons.push([0.7, "quiet, just you two"]);

    // Food: foodies love food dates; "eats to live" types less so.
    if (idea.food >= 6) {
      const foodie = me ? ((a.foodie != null ? a.foodie : 5) + (me.foodie != null ? me.foodie : 5)) / 2 : a.foodie != null ? a.foodie : 5;
      const f = (foodie - 5) / 5; // -0.6 .. +0.8
      s += f * 1.3;
      if (f > 0.5) reasons.push([1.0, me ? "made for two foodies" : "made for a foodie"]);
    }

    // Interests: the strongest signal. Shared ones count most.
    const theirs = idea.int.filter((i) => (a.interests || []).includes(i));
    const mine = me ? idea.int.filter((i) => (me.interests || []).includes(i)) : [];
    const shared = theirs.filter((i) => mine.includes(i));
    const onlyTheirs = theirs.filter((i) => !shared.includes(i));
    const onlyMine = mine.filter((i) => !shared.includes(i));
    s += Math.min(shared.length, 2) * 1.8 + Math.min(onlyTheirs.length, 2) * 1.2 + Math.min(onlyMine.length, 1) * 0.5;
    shared.forEach((i) => reasons.push([1.8, BOTH_WHY[i]]));
    onlyTheirs.forEach((i) => reasons.push([1.5, INTEREST_WHY[i]]));

    // Love language: theirs matters most; yours a little.
    if (a.love && idea.love.includes(a.love)) {
      s += 1.0;
      reasons.push([1.2, LOVE_WHY[a.love]]);
    }
    if (me && me.love && me.love !== a.love && idea.love.includes(me.love)) s += 0.4;

    // Season: time-limited ideas get a push while they're possible.
    if (idea.s && idea.s.length <= 2) {
      s += 0.9;
      reasons.push([1.3, `perfect for ${SEASON_NAME[ctx.season]}`]);
    }

    // Place: ideas that use something real nearby.
    const feats = (ctx.place && ctx.place.features) || {};
    const nearHit = idea.need.find((n) => feats[n] === true && n !== "city");
    if (nearHit) { s += 1.0; reasons.push([1.4, FEATURE_WHY[nearHit]]); }

    // We looked it up and there's no bowling alley (or whatever) anywhere near.
    if (DM.Spots && ctx.place && DM.Spots.noneNearby(idea, ctx.place)) s -= 0.8;

    // Weather.
    const wx = ctx.place && ctx.place.weather;
    if (wx) {
      const rough = wx.rainy || wx.hot || wx.cold;
      if (rough && idea.io === "out") s -= 1.6;
      else if (rough && idea.io === "in") { s += 0.6; reasons.push([0.9, wx.rainy ? "a good rainy-day pick" : wx.hot ? "beats the heat" : "warm and indoors"]); }
      else if (wx.nice && idea.io === "out") { s += 0.4; reasons.push([0.6, "great weather for it"]); }
    }

    // Younger users: lean into cheap, close, made-for-them ideas, away from grown-up dates and couch screens.
    const age = ctx.age;
    if (age != null && age <= 25) {
      if (idea.y) s += age <= 20 ? 1.0 : 0.6;
      if (idea.grown) s -= age <= 20 ? 2.2 : 0.9;
      if (idea.c <= 1 && idea.tr <= 1) s += 0.3;
      if (age <= 19 && idea.screen) s -= 1.0;
      if (age <= 19 && idea.tr >= 1 && idea.c <= 1 && (idea.act >= 4 || idea.adv >= 5) && (a.outAbout || 5) <= 6) {
        reasons.push([1.05, "beats another movie night 🍿"]);
      }
    }
    // No car between you: rides and drives step aside.
    if (ctx.noCar) {
      if (idea.car) s -= 2.5;
      else if (idea.tr === 2) s -= 1.0;
    }

    // AI picks were written for this person; trust them a little extra and lead with their reason.
    if (idea.aiWhy) { s += 1.5; reasons.push([3, idea.aiWhy]); }

    // A pinch of randomness so the deck feels fresh each day.
    s += (hash01(idea.id + ctx.seed) - 0.5) * 1.2;

    const pct = Math.max(41, Math.min(99, Math.round(100 / (1 + Math.exp(-(s - 2) / 2.2)))));
    reasons.sort((x, y) => y[0] - x[0]);
    const why = [...new Set(reasons.map((r) => r[1]))].slice(0, 2);
    const badges = [];
    if (idea.source === "ai") badges.push("✨ AI pick");
    if (idea.s && idea.s.length <= 2) badges.push(`${SEASON_EMOJI[ctx.season]} In season`);
    if (nearHit) badges.push("📍 Near you");
    if (idea.place) badges.push("📍 Real spot");
    return { idea, score: s, pct, why, badges };
  }

  const SEASON_EMOJI = { sp: "🌸", su: "☀️", fa: "🍂", wi: "❄️" };

  function rank(ideas, ctx) {
    const exclude = ctx.exclude || new Set();
    const ranked = ideas
      .filter((i) => !exclude.has(i.id) && !blocked(i, ctx))
      .map((i) => score(i, ctx))
      .sort((x, y) => y.score - x.score);
    return ctx.age != null && ctx.age <= 19 ? spreadHome(ranked) : ranked;
  }

  // Keep at-home ideas to at most one in every three cards near the top of the deck.
  function spreadHome(ranked) {
    const out = [], home = [], away = ranked.filter((e) => e.idea.tr !== 0);
    ranked.forEach((e) => { if (e.idea.tr === 0) home.push(e); });
    let sinceHome = 2;
    while (away.length || home.length) {
      if (home.length && (sinceHome >= 2 || !away.length)) { out.push(home.shift()); sinceHome = 0; }
      else { out.push(away.shift()); sinceHome++; }
    }
    return out;
  }

  // Both people's answers feed the deck. If we're still waiting on theirs, we go on yours alone.
  function buildContext(profile, extra = {}) {
    const me = extra.me !== undefined ? extra.me : DM.Store && DM.Store.me ? DM.Store.me() : null;
    const a = profile.answers || me || {};
    const place = profile.place;
    const now = new Date();
    const ages = [ageOf(profile.answers, now), ageOf(me, now)].filter((x) => x != null);
    return {
      answers: a,
      me,
      dislikes: [...new Set([...(a.dislikes || []), ...((me && me.dislikes) || [])])],
      // Only "no car" if someone told us and neither of you drives.
      noCar: (() => {
        const known = [profile.answers, me].filter((x) => x && x.getAround);
        return known.length > 0 && !known.some((x) => x.getAround === "drive");
      })(),
      age: ages.length ? Math.min(...ages) : null,
      season: seasonFor(now, place ? place.lat : 40),
      place,
      filters: profile.filters,
      seed: profile.id + now.toDateString(),
      profileId: profile.id,
      exclude: new Set([...profile.saved.map((x) => x.id), ...profile.skipped]),
      ...extra,
    };
  }

  // ---------- display helpers ----------
  const fmtCost = (c) => ["Free", "$", "$$", "$$$"][c] || "$";
  function fmtTime(m) {
    if (m >= 600) return "Overnight";
    if (m >= 420) return "All day";
    if (m >= 300) return "Half day";
    if (m < 60) return `${m} min`;
    const h = Math.round((m / 60) * 2) / 2;
    return `${h} hr${h === 1 ? "" : "s"}`;
  }
  const ioLabel = (io) => ({ in: "🏠 Indoor", out: "🌲 Outdoor", mix: "🌗 In or out" }[io] || "");

  DM.Engine = {
    registerSource, sources, normalize, gather, blocked, score, rank, buildContext,
    ageFrom, ageOf, seasonFor, SEASON_NAME, fmtCost, fmtTime, ioLabel,
  };
})();
