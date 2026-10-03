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
 * BOOK : idea id -> what to search GetYourGuide for (guided experiences)
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
    "hot-air-balloon-ride": "hot air balloon", "horseback-trail-ride": "horseback riding", "ropes-course-zipline": "zipline",
    "cooking-class-together": "cooking class", "paddleboard-or-kayak": "kayak", "river-tubing": "rafting", "surf-lesson": "surf lesson",
    "indoor-skydiving": "indoor skydiving", "escape-room": "escape room", "wine-tasting": "wine tasting", "taco-truck-crawl": "food tour",
    "tourist-in-your-own-town": "city tour", "local-history-walk": "walking tour", "ski-or-snowboard-day": "ski", "salsa-or-swing-class": "dance class",
    "murder-mystery-dinner": "murder mystery", "night-photography": "photography tour", "waterfall-hunt": "hiking tour",
    "hot-springs-soak": "hot springs", "zoo-day": "zoo", "aquarium-visit": "aquarium", "lakeside-sunset-paddle": "sunset kayak",
  };

  const TICKETS = {
    "big-concert": "concerts", "comedy-show": "comedy", "big-broadway-style-musical": "broadway", "symphony-night": "symphony",
    "ballet-or-dance-show": "ballet", "monster-truck-show": "monster jam", "music-festival": "music festival", "cheer-at-a-local-game": "sports",
    "community-theater": "theater", "improv-show": "improv", "dirt-track-or-drag-race-night": "racing", "jazz-club": "jazz",
  };

  const city = (place) => (place && place.label ? place.label.split(",")[0].trim() : "");

  function amazonUrl(q) {
    const u = new URL("https://www.amazon.com/s");
    u.searchParams.set("k", q);
    if (AFFILIATE.amazon.tag) u.searchParams.set("tag", AFFILIATE.amazon.tag);
    return u.toString();
  }

  function gygUrl(q, place) {
    const u = new URL("https://www.getyourguide.com/s/");
    u.searchParams.set("q", [city(place), q].filter(Boolean).join(" "));
    if (AFFILIATE.getyourguide.partnerId) u.searchParams.set("partner_id", AFFILIATE.getyourguide.partnerId);
    return u.toString();
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
    if (BOOK[idea.id]) out.push({ icon: "🎟️", label: "Book it", url: gygUrl(BOOK[idea.id], place) });
    if (TICKETS[idea.id]) out.push({ icon: "🎫", label: "Find tickets", url: ticketsUrl(TICKETS[idea.id], place) });
    return out;
  }

  DM.Shop = { AFFILIATE, KIT, BOOK, TICKETS, linksFor };
})();
