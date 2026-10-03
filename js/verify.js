/* Date Me — "is it actually near them?"
 *
 * Any idea that needs a business (bowling alley, boba, escape room, goat yoga…)
 * is checked against Google Places through the date-me-ai worker before its card
 * can show. No match within reach -> the card never appears. A match -> the card
 * names the closest one, linked to its Google Maps page.
 *
 * Not checked: at-home ideas, events (they have their own "find the next one"
 * search), AI picks (already looked up), and things every town has (parks,
 * trails, viewpoints — those come from the map scan).
 *
 * Results live on the place for 30 days (and the worker shares them with
 * everyone in the same ~11 km area). If the worker has no Google key, is over
 * its monthly cap, or can't be reached, checking switches off and cards show
 * the way they used to.
 */
(function () {
  const DM = (window.DateMe = window.DateMe || {});
  const ENDPOINT = "https://date-me-ai.52bulls.workers.dev/places";
  const KEEP_MS = 30 * 864e5;

  const GENERIC = new Set(["park", "playground", "park with swings", "scenic viewpoint", "hiking trail", "lake", "river", "mountain hike",
    "beach", "waterfall hike", "nature preserve", "library", "grocery store", "gas station", "parking garage", "bus station",
    "tourist attractions", "city skyline view", "light rail station", "photo booth", "cheap eats", "unique restaurants", "volunteer opportunities"]);

  // Distinctive searches where Google might return look-alikes (a plain yoga studio
  // for "goat yoga"): the result's name or address must contain one of these.
  const MUST = {
    "goat yoga": /goat/i, "topgolf": /topgolf/i, "ikea": /ikea/i, "build-a-bear workshop": /build.?a.?bear/i, "target": /target/i,
    "cat cafe": /cat/i, "board game cafe": /game/i, "escape room": /escape/i, "laser tag": /laser/i, "axe throwing": /axe|hatchet/i,
    "boba": /boba|bubble|tea/i, "karaoke": /karaoke/i, "roller skating rink": /skat|roller/i, "ice skating rink": /ice|skat|arena|rink/i,
    "pickleball courts": /pickleball/i, "disc golf course": /disc|frisbee/i, "drive-in theater": /drive/i, "planetarium": /planetarium/i,
    "aquarium": /aquarium/i, "zoo": /zoo/i, "butterfly house": /butterfl/i, "comic book store": /comic/i, "record store": /record|vinyl|music/i,
    "climbing gym": /climb|boulder/i, "go karts": /kart|race|speedway/i, "mini golf": /golf|putt/i, "trampoline park": /trampoline|jump|sky zone|altitude|bounce/i,
    "bowling alley": /bowl|lanes|alley/i, "arcade": /arcade|game|round ?1|dave|main event|fun/i, "thrift store": /thrift|deseret|goodwill|savers|second|resale|vintage/i,
    "vintage store": /vintage|thrift|retro|resale/i, "hot springs": /spring/i, "ski resort": /ski|resort|mountain/i, "water park": /water|splash|aquatic/i,
    "skatepark": /skate/i, "drive thru": /./, "donut shop": /donut|doughnut|krispy/i, "public pool": /pool|aquatic|swim|rec/i,
    "horseback riding": /horse|ranch|stable|equestrian|trail ride/i, "korean bbq": /korean|bbq|k-?bbq/i, "hot pot": /hot ?pot|shabu/i,
    "ramen": /ramen|noodle/i, "sushi": /sushi|japanese/i, "food hall": /food hall|market|food court/i, "farmers market": /market/i,
    "silent disco": /silent/i, "music lessons": /music|guitar|piano|drum|lesson/i, "dance class": /danc|ballroom|salsa|studio/i,
    "improv class": /improv|comedy/i, "comedy club": /comedy|laugh|improv/i, "cars and coffee": /car|coffee/i, "car museum": /car|auto|museum/i,
    "animal shelter": /animal|shelter|humane|rescue|pet/i, "pet adoption": /animal|shelter|humane|rescue|pet|adopt/i, "dog friendly patio brunch": /./,
  };

  let status = "unknown"; // unknown -> on | off (no key, cap reached, or unreachable)
  const pending = new Set();

  const metres = (lat1, lon1, lat2, lon2) => {
    const r = Math.PI / 180, dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
    return 12742000 * Math.asin(Math.sqrt(x));
  };

  // What to look up for this idea, or null if it doesn't need checking.
  function queryFor(idea) {
    if (!idea || idea.source === "ai" || idea.tr === 0 || !DM.Shop) return null;
    const near = DM.Shop.nearby(idea, null);
    if (!near || near.event) return null;
    const q = near.label.toLowerCase();
    return GENERIC.has(q) ? null : q;
  }

  // How far it may be: by the idea's own travel and the "how far will you go" filter.
  function maxMetres(idea, filters) {
    const byIdea = [0, 25000, 50000, 80000][idea.tr] || 50000;
    const byFilter = filters && filters.dist != null ? [0, 16000, 48000, 200000][filters.dist] : 200000;
    return Math.min(byIdea, byFilter);
  }

  const entry = (q, place) => {
    const e = place && place.avail && place.avail[q];
    return e && Date.now() - e.at < KEEP_MS ? e : null;
  };

  // "yes" | "no" | "unchecked" | "skip"
  function check(idea, place, filters) {
    const q = queryFor(idea);
    if (!q || !place) return "skip";
    const e = entry(q, place);
    if (!e) return "unchecked";
    const max = maxMetres(idea, filters);
    return e.list.some((p) => p.d <= max) ? "yes" : "no";
  }

  // Up to 3 real places within reach: [{ name, dist, url }]
  function nearest(idea, place, filters) {
    const q = queryFor(idea);
    const e = q && entry(q, place);
    if (!e) return null;
    const max = maxMetres(idea, filters);
    const mi = place.cc === "US" || place.cc === "GB";
    return e.list.filter((p) => p.d <= max).slice(0, 3).map((p) => ({
      name: p.n,
      dist: mi ? (p.d / 1609.34 < 10 ? (p.d / 1609.34).toFixed(1) + " mi" : Math.round(p.d / 1609.34) + " mi") : (p.d / 1000 < 10 ? (p.d / 1000).toFixed(1) + " km" : Math.round(p.d / 1000) + " km"),
      url: p.url || `https://www.google.com/maps/search/${encodeURIComponent(p.n + " " + p.a)}`,
    }));
  }

  // Look up a batch of queries for this place; writes results onto place.avail.
  async function fill(queries, place) {
    const todo = queries.filter((q) => !pending.has(q) && !entry(q, place)).slice(0, 12);
    if (!todo.length || status === "off") return false;
    todo.forEach((q) => pending.add(q));
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 20000);
      const r = await fetch(ENDPOINT, {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: ctl.signal,
        body: JSON.stringify({ lat: place.lat, lon: place.lon, queries: todo }),
      });
      clearTimeout(t);
      const j = await r.json();
      if (!r.ok || j.status === "off" || j.status === "paused") { status = "off"; return true; }
      status = "on";
      place.avail = place.avail || {};
      for (const [q, list] of Object.entries(j.results || {})) {
        const must = MUST[q];
        place.avail[q] = {
          at: Date.now(),
          list: list
            .filter((p) => !must || must.test(p.n + " " + p.a))
            .map((p) => ({ ...p, d: Math.round(metres(place.lat, place.lon, p.lat, p.lon)) }))
            .sort((a, b) => a.d - b.d),
        };
      }
      return true;
    } catch (e) {
      if (status === "unknown") status = "off";
      return true;
    } finally {
      todo.forEach((q) => pending.delete(q));
    }
  }

  DM.Verify = {
    queryFor, check, nearest, fill,
    active: () => status !== "off",      // until we hear otherwise, assume checking works
    status: () => status,
    busy: () => pending.size > 0,
  };
})();
