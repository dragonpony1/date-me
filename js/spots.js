/* Date Me — real named places near you (free, from OpenStreetMap).
 *
 * KINDS     : a kind of place -> how far to look (metres) + the map tags that find it
 * IDEA_KIND : which kind of place each idea needs ("glow-bowling" -> "bowling")
 *             An idea from any source can instead carry `spot: "bowling"` itself.
 *
 * One lookup per location (split into a few small requests), cached on the
 * profile for a week. Cards then show the nearest real spot: "📍 Fat Cats · 2.1 mi".
 */
(function () {
  const DM = (window.DateMe = window.DateMe || {});

  const KINDS = {
    // fun & games
    bowling: [25000, '["leisure"="bowling_alley"]'],
    minigolf: [25000, '["leisure"="miniature_golf"]'],
    climbing: [25000, '["sport"="climbing"]["leisure"~"sports_centre|sports_hall|fitness_centre"]'],
    trampoline: [25000, '["leisure"="trampoline_park"]'],
    skating: [25000, '["sport"="roller_skating"]'],
    icerink: [30000, '["leisure"="ice_rink"]'],
    karting: [40000, '["sport"="karting"]'],
    lasertag: [25000, '["sport"="laser_tag"]'],
    axe: [25000, '["sport"="axe_throwing"]'],
    escape: [25000, '["leisure"="escape_game"]'],
    arcade: [25000, '["leisure"="amusement_arcade"]'],
    billiards: [20000, '["sport"="billiards"]'],
    pool: [15000, '["leisure"="water_park"]', '["leisure"="sports_centre"]["sport"="swimming"]'],
    stadium: [40000, '["leisure"="stadium"]'],
    racetrack: [60000, '["highway"="raceway"]', '["leisure"="track"]["sport"~"motor|motocross|karting"]'],
    discgolf: [25000, '["leisure"="disc_golf_course"]', '["sport"="disc_golf"]'],
    pickleball: [10000, '["leisure"="pitch"]["sport"~"pickleball|tennis"]'],
    basketball: [6000, '["leisure"="pitch"]["sport"="basketball"]'],
    horse: [50000, '["leisure"="horse_riding"]'],
    // culture
    museum: [25000, '["tourism"="museum"]'],
    artmuseum: [25000, '["tourism"="gallery"]', '["tourism"="museum"]["museum"="art"]'],
    planetarium: [50000, '["amenity"="planetarium"]'],
    zoo: [50000, '["tourism"="zoo"]'],
    aquarium: [60000, '["tourism"="aquarium"]'],
    garden: [30000, '["leisure"="garden"]["garden:type"="botanical"]'],
    cinema: [20000, '["amenity"="cinema"]'],
    drivein: [80000, '["amenity"="cinema"]["drive_in"="yes"]'],
    theatre: [25000, '["amenity"="theatre"]'],
    musicvenue: [25000, '["amenity"="music_venue"]'],
    karaoke: [25000, '["amenity"="karaoke_box"]'],
    attraction: [15000, '["tourism"="attraction"]'],
    library: [10000, '["amenity"="library"]'],
    // shops
    books: [15000, '["shop"="books"]'],
    records: [20000, '["shop"="music"]'],
    thrift: [15000, '["shop"~"^(second_hand|charity)$"]'],
    craft: [15000, '["shop"~"^(craft|art|fabric)$"]'],
    toys: [15000, '["shop"~"^(toys|games)$"]'],
    mall: [25000, '["shop"="mall"]'],
    instruments: [20000, '["shop"="musical_instrument"]'],
    gardencentre: [15000, '["shop"="garden_centre"]'],
    carwash: [8000, '["amenity"="car_wash"]'],
    bikerental: [15000, '["amenity"="bicycle_rental"]'],
    surf: [30000, '["shop"="surf"]'],
    // food & drink
    cafe: [6000, '["amenity"="cafe"]'],
    icecream: [8000, '["amenity"="ice_cream"]', '["shop"="ice_cream"]'],
    bakery: [8000, '["shop"~"^(bakery|pastry)$"]'],
    donut: [12000, '["cuisine"~"donut"]'],
    dessert: [10000, '["shop"~"^(confectionery|chocolate)$"]', '["cuisine"~"dessert"]'],
    sushi: [12000, '["amenity"="restaurant"]["cuisine"~"sushi"]'],
    ramen: [15000, '["cuisine"~"ramen"]'],
    korean: [15000, '["amenity"="restaurant"]["cuisine"~"korean"]'],
    hotpot: [20000, '["cuisine"~"hot_pot|hotpot"]'],
    mexican: [8000, '["amenity"~"^(restaurant|fast_food)$"]["cuisine"~"mexican|taco"]'],
    diner: [15000, '["cuisine"~"diner"]'],
    foodcourt: [20000, '["amenity"="food_court"]'],
    fancy: [15000, '["amenity"="restaurant"]["cuisine"~"french|steak_house|fine_dining"]'],
    market: [20000, '["amenity"="marketplace"]'],
    brewery: [20000, '["craft"="brewery"]', '["microbrewery"="yes"]'],
    winery: [60000, '["craft"="winery"]'],
    bar: [8000, '["amenity"="bar"]'],
    // nature
    park: [5000, '["leisure"="park"]'],
    dogpark: [10000, '["leisure"="dog_park"]'],
    viewpoint: [25000, '["tourism"="viewpoint"]'],
    trailhead: [30000, '["highway"="trailhead"]'],
    peak: [50000, '["natural"="peak"]'],
    waterfall: [60000, '["waterway"="waterfall"]'],
    lake: [30000, '["natural"="water"]["water"~"^(lake|reservoir|pond)$"]'],
    beach: [40000, '["natural"="beach"]'],
    river: [25000, '["waterway"="river"]'],
    hotspring: [80000, '["natural"="hot_spring"]'],
    ski: [100000, '["landuse"="winter_sports"]'],
    reserve: [40000, '["leisure"="nature_reserve"]'],
    shelter: [25000, '["amenity"="animal_shelter"]'],
    farm: [40000, '["shop"="farm"]'],
  };

  const IDEA_KIND = {
    "taco-truck-crawl": "mexican", "sushi-night": "sushi", "bakery-crawl": "bakery", "food-hall-feast": "foodcourt",
    "korean-bbq": "korean", "hot-pot-dinner": "hotpot", "dress-up-fancy-dinner": "fancy", "ice-cream-shop-tour": "icecream",
    "dessert-only-dinner": "dessert", "farmers-market-breakfast": "market", "ramen-date": "ramen", "late-night-diner-run": "diner",
    "coffee-shop-hop": "cafe", "wine-tasting": "winery", "brewery-board-games": "brewery", "cocktails-with-a-view": "bar",
    "chocolate-tasting-flight": "dessert", "donuts-at-the-lookout": "donut", "picnic-in-the-park": "park",
    "sunrise-hike": "trailhead", "sunset-picnic-on-a-hill": "viewpoint", "paddleboard-or-kayak": "lake", "lake-day": "lake",
    "beach-day": "beach", "beach-bonfire": "beach", "tide-pooling": "beach", "waterfall-hunt": "waterfall",
    "botanical-garden-stroll": "garden", "bike-to-a-cafe": "cafe", "fishing-morning": "lake", "walk-shelter-dogs": "shelter",
    "summit-a-mountain": "peak", "hammock-books": "park", "fly-a-kite": "park", "disc-golf": "discgolf",
    "bird-watching-walk": "reserve", "river-tubing": "river", "hot-springs-soak": "hotspring", "creek-walk-rock-skipping": "river",
    "find-the-best-sunset-spot": "viewpoint", "zoo-day": "zoo", "aquarium-visit": "aquarium", "paddle-boat-on-the-pond": "lake",
    "farm-visit": "farm", "chess-in-the-park": "park", "launch-a-model-rocket": "park", "tandem-bike-ride": "bikerental",
    "climbing-gym": "climbing", "trampoline-park": "trampoline", "roller-skating": "skating", "ice-skating": "icerink",
    "outdoor-ice-rink-under-lights": "icerink", "glow-bowling": "bowling", "mini-golf": "minigolf", "go-karts": "karting",
    "pickleball-match": "pickleball", "yoga-in-the-park": "park", "mountain-biking": "trailhead", "horseback-trail-ride": "horse",
    "axe-throwing": "axe", "laser-tag": "lasertag", "swim-at-the-rec-center": "pool", "one-on-one-hoops": "basketball",
    "ski-or-snowboard-day": "ski", "snowshoe-walk": "trailhead", "sledding": "park",
    "art-museum-favorites": "artmuseum", "science-museum": "museum", "planetarium-show": "planetarium",
    "open-mic-night": "musicvenue", "live-local-band": "musicvenue", "comedy-show": "theatre", "community-theater": "theatre",
    "pick-a-book-for-each-other": "books", "thrift-store-outfit-challenge": "thrift", "first-friday-art-walk": "artmuseum",
    "big-concert": "musicvenue", "drive-in-movie": "drivein", "movie-rate-it-after": "cinema", "escape-room": "escape",
    "arcade-battle": "arcade", "barcade-night": "arcade", "private-karaoke-room": "karaoke", "record-store-dig": "records",
    "jazz-club": "musicvenue", "pool-hall": "billiards", "cheer-at-a-local-game": "stadium", "vr-arcade": "arcade",
    "comic-shop-swap-picks": "books", "plant-a-mini-garden": "gardencentre", "tie-dye-shirts": "craft", "make-candles": "craft",
    "build-a-lego-set": "toys", "tourist-in-your-own-town": "attraction", "pumpkin-patch": "farm", "apple-picking": "farm",
    "berry-picking": "farm", "lakeside-sunset-paddle": "lake", "surf-lesson": "surf", "reservoir-swim-spot": "lake",
    "canyon-drive-picnic": "viewpoint", "sunrise-photo-shoot": "viewpoint",
    "hike-with-your-dogs": "trailhead", "feed-the-ducks": "lake", "wildlife-refuge-drive": "reserve",
    "owl-prowl-night-walk": "reserve", "dog-friendly-patio-brunch": "cafe", "pet-adoption-event-visit": "shelter",
    "car-wash-detail-date": "carwash", "dirt-track-or-drag-race-night": "racetrack", "auto-museum": "museum",
    "library-date": "library", "silent-book-club": "cafe", "blind-date-with-a-book": "books",
    "author-reading-or-signing": "books", "used-bookstore-treasure-hunt": "books", "dress-each-other-at-the-mall": "mall",
    "vintage-shopping-crawl": "thrift", "make-friendship-bracelets": "craft", "patch-upcycle-a-jacket": "craft",
    "window-shopping-coffee": "mall", "farmers-market-cook-off": "market", "improv-show": "theatre",
    "beginner-improv-class": "theatre", "big-broadway-style-musical": "theatre", "shakespeare-in-the-park": "park",
    "ballet-or-dance-show": "theatre", "local-school-play": "theatre", "silent-disco": "musicvenue",
    "piano-bar-sing-along": "bar", "try-a-music-lesson": "instruments", "symphony-night": "theatre",
  };

  function metres(lat1, lon1, lat2, lon2) {
    const r = Math.PI / 180, dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
    return 12742000 * Math.asin(Math.sqrt(a));
  }

  // A map rectangle is much faster for the server than "within X metres";
  // we trim to the true distance afterwards.
  function box(lat, lon, radius) {
    const dLat = radius / 111320, dLon = radius / (111320 * Math.cos((lat * Math.PI) / 180));
    return [lat - dLat, lon - dLon, lat + dLat, lon + dLon].map((v) => v.toFixed(4)).join(",");
  }

  // Each kind becomes: a marker element, then its places.
  function buildQuery(kinds, lat, lon) {
    return "[out:json][timeout:40];\n" + kinds.map((k) => {
      const [radius, ...filters] = KINDS[k];
      const b = box(lat, lon, radius);
      const parts = filters.map((f) => `nwr${f}["name"](${b});`).join("");
      return `make k n="${k}";out;\n(${parts});out tags center qt 400;`;
    }).join("\n");
  }

  function parse(data, lat, lon, into) {
    let kind = null;
    for (const el of data.elements || []) {
      if (el.type === "k") { kind = el.tags.n; into[kind] = into[kind] || []; continue; }
      if (!kind || !el.tags || !el.tags.name) continue;
      const pLat = el.lat != null ? el.lat : el.center && el.center.lat;
      const pLon = el.lon != null ? el.lon : el.center && el.center.lon;
      if (pLat == null) continue;
      const d = Math.round(metres(lat, lon, pLat, pLon));
      if (d > KINDS[kind][0]) continue;
      into[kind].push({ n: el.tags.name, lat: +pLat.toFixed(5), lon: +pLon.toFixed(5), d });
    }
  }

  // Nearest 5 per kind, one entry per name (rivers and race tracks come in pieces).
  function tidy(all) {
    const out = {};
    for (const [k, list] of Object.entries(all)) {
      const seen = new Set();
      out[k] = list.sort((a, b) => a.d - b.d).filter((p) => (seen.has(p.n) ? false : (seen.add(p.n), true))).slice(0, 5);
    }
    return out;
  }

  // ---------- lookups: one kind at a time, cached on the place for a week ----------
  const WEEK = 7 * 24 * 3600 * 1000;
  const RETRY_AFTER = 10 * 60 * 1000;
  const queue = [];
  const inflight = new Map(); // key -> promise
  const failedAt = new Map(); // key -> time (memory only, so a busy server gets a rest)
  let busy = false;

  const keyOf = (kind, place) => `${kind}@${place.lat.toFixed(3)},${place.lon.toFixed(3)}`;

  function cached(kind, place) {
    const at = place.spotsAt && place.spotsAt[kind];
    return place.spots && place.spots[kind] && at && Date.now() - at < WEEK ? place.spots[kind] : null;
  }

  // Resolves with the nearest places (possibly []) and writes them onto `place`.
  // Resolves null if the lookup failed; we'll try again later.
  function request(kind, place) {
    if (!KINDS[kind] || !place) return Promise.resolve(null);
    const hit = cached(kind, place);
    if (hit) return Promise.resolve(hit);
    const key = keyOf(kind, place);
    if (inflight.has(key)) return inflight.get(key);
    if (Date.now() - (failedAt.get(key) || 0) < RETRY_AFTER) return Promise.resolve(null);
    const p = new Promise((resolve) => queue.push({ kind, place, key, resolve }));
    inflight.set(key, p);
    pump();
    return p;
  }

  async function pump() {
    if (busy) return;
    busy = true;
    while (queue.length) {
      const job = queue.shift();
      let list = null;
      try {
        const data = await DM.Location.overpass(buildQuery([job.kind], job.place.lat, job.place.lon), 30000);
        if (data.remark && /error/i.test(data.remark)) throw new Error(data.remark);
        const all = {};
        parse(data, job.place.lat, job.place.lon, all);
        list = tidy(all)[job.kind] || [];
        job.place.spots = job.place.spots || {};
        job.place.spotsAt = job.place.spotsAt || {};
        job.place.spots[job.kind] = list;
        job.place.spotsAt[job.kind] = Date.now();
      } catch (e) {
        failedAt.set(job.key, Date.now());
      }
      inflight.delete(job.key);
      job.resolve(list);
    }
    busy = false;
  }

  const kindFor = (idea) => idea.spot || IDEA_KIND[idea.id] || null;

  function distLabel(m, cc) {
    if (cc === "US" || cc === "GB" || cc === "LR" || cc === "MM") {
      const mi = m / 1609.34;
      return mi < 0.2 ? "nearby" : mi < 10 ? `${mi.toFixed(1)} mi` : `${Math.round(mi)} mi`;
    }
    const km = m / 1000;
    return km < 0.3 ? "nearby" : km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
  }

  const mapUrl = (p) => `https://www.google.com/maps/search/${encodeURIComponent(p.n)}/@${p.lat},${p.lon},15z`;

  // Up to 3 nearest real spots for an idea (from cache), or null if we don't know yet.
  function forIdea(idea, place) {
    const k = kindFor(idea);
    if (!k || !place) return null;
    const list = cached(k, place);
    if (!list) return null;
    return list.slice(0, 3).map((p) => ({ name: p.n, dist: distLabel(p.d, place.cc), url: mapUrl(p) }));
  }

  // We looked and found none of this kind of place nearby.
  function noneNearby(idea, place) {
    const k = kindFor(idea);
    const list = k && place && cached(k, place);
    return !!(list && list.length === 0);
  }

  DM.Spots = { KINDS, IDEA_KIND, kindFor, request, forIdea, noneNearby, buildQuery, parse, tidy };
})();
