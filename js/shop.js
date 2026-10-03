/* Date Me — "Get the kit" / "Book it" / "Find tickets" links.
 *
 * Fill in the IDs below once the affiliate accounts are approved; until then
 * the buttons still work as plain helpful links (no commission).
 *
 *   AFFILIATE.amazon.tag             Amazon Associates tracking ID, e.g. "dateme-20"
 *   AFFILIATE.getyourguide.partnerId GetYourGuide partner ID
 *   AFFILIATE.ticketmaster.wrap      Impact deep-link template, e.g.
 *                                    "https://ticketmaster.evyy.net/c/123/456/789?u={url}"
 *
 * KIT  : idea id -> what to search Amazon for (at-home ideas that need gear)
 * BOOK : idea id -> what kind of place to find nearby. Opens a Google Maps search
 *        near them. (GetYourGuide's search ignores the city when nothing local
 *        matches, so "hot springs" in Salt Lake showed Costa Rica. Its partner
 *        links can come back once we can test location-specific ones.)
 * TICKETS : idea id -> what to search Ticketmaster for (shows, games, concerts)
 * AI ideas can bring their own `kit` search phrase.
 */
(function () {
  const DM = (window.DateMe = window.DateMe || {});

  const AFFILIATE = {
    amazon: { tag: "" },
    getyourguide: { partnerId: "" },
    ticketmaster: { wrap: "" },
  };

  const KIT = {
    "homemade-pizza-night": "pizza stone and peel set", "roll-your-own-sushi": "sushi making kit", "fondue-night": "fondue pot set",
    "chocolate-tasting-flight": "chocolate tasting gift set", "pancake-art-contest": "pancake batter dispenser", "breakfast-in-bed": "breakfast in bed tray",
    "picnic-in-the-park": "waterproof picnic blanket", "sunset-picnic-on-a-hill": "picnic backpack for 2", "living-room-picnic": "picnic basket set for 2",
    "stargazing": "planisphere star chart", "backyard-campout": "2 person tent", "hammock-books": "double camping hammock",
    "fly-a-kite": "kite for adults", "disc-golf": "disc golf starter set", "bird-watching-walk": "compact binoculars",
    "launch-a-model-rocket": "model rocket starter set", "sidewalk-chalk-mural": "jumbo sidewalk chalk", "chess-in-the-park": "travel chess set",
    "pickleball-match": "pickleball paddle set", "yoga-in-the-park": "yoga mat", "one-on-one-hoops": "outdoor basketball",
    "water-balloon-fight": "self sealing water balloons", "blanket-fort-movie-marathon": "fort building kit",
    "two-player-board-games": "2 player board games", "puzzle-playlist": "1000 piece jigsaw puzzle", "at-home-spa-night": "spa night gift set",
    "write-letters-to-open-in-a-year": "letter writing stationery set", "paint-each-other-s-portraits": "canvas painting kit for adults",
    "plant-a-mini-garden": "succulent planter kit", "make-a-time-capsule": "time capsule", "tie-dye-shirts": "tie dye kit",
    "bake-off-challenge": "cupcake decorating kit", "36-questions-night": "conversation cards for couples", "build-a-lego-set": "lego set for adults",
    "living-room-karaoke": "karaoke microphone", "scrapbook-your-dates": "scrapbook kit", "make-candles": "candle making kit",
    "learn-a-song-on-ukulele": "beginner ukulele kit", "double-date-game-night": "codenames board game", "phone-free-film-short": "phone tripod with remote",
    "fire-pit-s-mores": "smores roasting sticks", "compliment-jar": "mason jars with lids", "carve-pumpkins": "pumpkin carving kit",
    "gingerbread-house-build": "gingerbread house kit", "make-friendship-bracelets": "friendship bracelet kit", "patch-upcycle-a-jacket": "iron on patches",
    "car-wash-detail-date": "car detailing kit", "learn-car-basics-together": "car emergency kit", "fresh-pasta-from-scratch": "pasta maker machine",
    "dumpling-night": "dumpling maker", "cookie-decorating": "cookie decorating kit", "homemade-ice-cream": "ice cream maker",
    "bread-baking-day": "bread baking kit", "living-room-dance-off": "disco ball party light", "blind-date-with-a-book": "kraft wrapping paper",
    "snowman-snow-fort": "snow brick maker", "sledding": "snow sled", "bake-deliver-cookies": "cookie gift boxes",
  };

  const BOOK = {
    "hot-air-balloon-ride": "hot air balloon rides", "horseback-trail-ride": "horseback riding", "ropes-course-zipline": "zipline",
    "cooking-class-together": "cooking class", "paddleboard-or-kayak": "kayak rental", "river-tubing": "river tubing", "surf-lesson": "surf lesson",
    "indoor-skydiving": "indoor skydiving", "escape-room": "escape room", "wine-tasting": "wine tasting", "taco-truck-crawl": "taco trucks",
    "tourist-in-your-own-town": "tourist attractions", "local-history-walk": "historic sites", "ski-or-snowboard-day": "ski resort", "salsa-or-swing-class": "dance class",
    "murder-mystery-dinner": "murder mystery", "night-photography": "city viewpoint", "waterfall-hunt": "waterfall hike",
    "hot-springs-soak": "hot springs", "zoo-day": "zoo", "aquarium-visit": "aquarium", "lakeside-sunset-paddle": "canoe rental",
  };

  const TICKETS = {
    "big-concert": "concerts", "comedy-show": "comedy", "big-broadway-style-musical": "broadway", "symphony-night": "symphony",
    "ballet-or-dance-show": "ballet", "monster-truck-show": "monster jam", "music-festival": "music festival", "cheer-at-a-local-game": "sports",
    "community-theater": "theater", "improv-show": "improv", "dirt-track-or-drag-race-night": "racing", "jazz-club": "jazz",
  };

  // What to search Google Maps for, so every outing card can say where to go.
  const KIND_Q = {
    bowling: "bowling alley", minigolf: "mini golf", climbing: "climbing gym", trampoline: "trampoline park", skating: "roller skating rink",
    icerink: "ice skating rink", karting: "go karts", lasertag: "laser tag", axe: "axe throwing", escape: "escape room", arcade: "arcade",
    billiards: "pool hall", pool: "public pool", stadium: "stadium", racetrack: "race track", discgolf: "disc golf course",
    pickleball: "pickleball courts", basketball: "basketball court", horse: "horseback riding", museum: "museum", artmuseum: "art museum",
    planetarium: "planetarium", zoo: "zoo", aquarium: "aquarium", garden: "botanical garden", cinema: "movie theater", drivein: "drive-in theater",
    theatre: "theater", musicvenue: "live music venue", karaoke: "karaoke", attraction: "tourist attractions", library: "library",
    books: "bookstore", records: "record store", thrift: "thrift store", craft: "craft store", toys: "toy store", mall: "mall",
    instruments: "music store", gardencentre: "garden center", carwash: "self serve car wash", bikerental: "bike rental", surf: "surf lessons",
    cafe: "coffee shop", icecream: "ice cream", bakery: "bakery", donut: "donuts", dessert: "dessert", sushi: "sushi", ramen: "ramen",
    korean: "korean bbq", hotpot: "hot pot", mexican: "taco truck", diner: "24 hour diner", foodcourt: "food hall", fancy: "fine dining",
    market: "farmers market", brewery: "brewery", winery: "winery", bar: "rooftop bar", park: "park", dogpark: "dog park",
    viewpoint: "scenic viewpoint", trailhead: "hiking trail", peak: "mountain hike", waterfall: "waterfall hike", lake: "lake",
    beach: "beach", river: "river", hotspring: "hot springs", ski: "ski resort", reserve: "nature preserve", shelter: "animal shelter", farm: "farm",
  };
  const MAP_Q = {
    "goat-yoga": "goat yoga", "cooking-class-together": "cooking class", "paint-pottery": "paint your own pottery", "paint-night": "painting class",
    "trivia-night": "trivia night", "cat-cafe": "cat cafe", "board-game-cafe": "board game cafe", "haunted-house": "haunted house",
    "corn-maze": "corn maze", "pumpkin-patch": "pumpkin patch", "apple-picking": "apple orchard u-pick", "berry-picking": "u-pick berries",
    "flower-fields": "flower farm", "holiday-market": "holiday market", "outdoor-movie-in-the-park": "outdoor movie", "fireworks-show": "fireworks show",
    "county-fair": "fair", "holiday-lights-drive": "christmas lights display", "ice-castles-or-ice-festival": "ice castles", "hot-cocoa-crawl": "hot chocolate",
    "run-a-5k-together": "5k race", "volunteer-together": "volunteer opportunities", "midnight-milkshake-drive": "milkshakes",
    "nature-scavenger-hunt": "park", "10-cheap-eats-challenge": "cheap eats", "order-the-weirdest-thing": "unique restaurants",
    "comedy-show": "comedy club", "train-ride-somewhere": "light rail station", "night-photography": "city skyline view",
    "car-show-or-cars-coffee": "cars and coffee", "silent-disco": "silent disco", "beginner-improv-class": "improv class",
    "try-a-music-lesson": "music lessons", "salsa-or-swing-class": "dance class", "dress-each-other-at-the-mall": "mall",
    "vintage-shopping-crawl": "vintage store", "symphony-night": "symphony", "ballet-or-dance-show": "ballet", "music-festival": "music festival",
    "monster-truck-show": "monster truck show", "big-concert": "concert venue", "piano-bar-sing-along": "piano bar",
    "jazz-club": "jazz club", "boardwalk-arcade": "boardwalk", "author-reading-or-signing": "bookstore events", "butterfly-house": "butterfly house",
    "owl-prowl-night-walk": "nature center", "dog-friendly-patio-brunch": "dog friendly patio brunch", "pet-adoption-event-visit": "pet adoption",
    "food-truck-crawl-showdown": "food trucks", "auto-museum": "car museum", "dirt-track-or-drag-race-night": "race track",
  };
  // Outings with no single place to go.
  const NO_MAP = new Set(["yes-day", "random-acts-of-kindness", "random-direction-drive", "scenic-drive-with-a-playlist", "day-trip-to-a-nearby-town",
    "gas-station-snack-road-trip", "audiobook-drive", "matching-outfits-day", "photo-walk", "geocaching-treasure-hunt", "ar-game-walk"]);

  // { label, url } to find this kind of place near them, or null for at-home / anywhere ideas.
  function nearby(idea, place) {
    const kind = DM.Spots ? DM.Spots.kindFor(idea) : null;
    let q = MAP_Q[idea.id] || BOOK[idea.id] || (kind && KIND_Q[kind]);
    if (!q && idea.tr >= 1 && !NO_MAP.has(idea.id) && idea.source !== "ai") q = idea.t.toLowerCase();
    if (!q || idea.tr === 0) return null;
    return { label: q, url: nearbyUrl(q, place) };
  }

  const city = (place) => (place && place.label ? place.label.split(",")[0].trim() : "");

  function amazonUrl(q) {
    const u = new URL("https://www.amazon.com/s");
    u.searchParams.set("k", q);
    if (AFFILIATE.amazon.tag) u.searchParams.set("tag", AFFILIATE.amazon.tag);
    return u.toString();
  }

  function nearbyUrl(q, place) {
    const where = place && place.label ? `${q} near ${place.label}` : `${q} near me`;
    return `https://www.google.com/maps/search/${encodeURIComponent(where)}`;
  }

  function ticketsUrl(q, place) {
    const u = new URL("https://www.ticketmaster.com/search");
    u.searchParams.set("q", [q, city(place)].filter(Boolean).join(" "));
    const plain = u.toString();
    return AFFILIATE.ticketmaster.wrap ? AFFILIATE.ticketmaster.wrap.replace("{url}", encodeURIComponent(plain)) : plain;
  }

  // Buttons to show for an idea: [{ icon, label, url }]
  function linksFor(idea, place) {
    const out = [];
    const kit = idea.kit || KIT[idea.id];
    if (kit) out.push({ icon: "🛒", label: "Get the kit", url: amazonUrl(kit) });
    if (TICKETS[idea.id]) out.push({ icon: "🎫", label: "Find tickets", url: ticketsUrl(TICKETS[idea.id], place) });
    return out;
  }

  DM.Shop = { AFFILIATE, KIT, BOOK, TICKETS, linksFor, nearby };
})();
