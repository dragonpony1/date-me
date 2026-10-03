/* Date Me — screens, quiz, swiping, spin. */
(function () {
  const { Store, Engine, Location, Spots, AI } = window.DateMe;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const S = {
    quiz: null,        // { i, answers, editId, dir }
    loc: null,         // { profileId, place, token }
    candidates: null,  // every idea from every source, normalized
    deck: [],          // ranked entries still to swipe
    history: [],       // [{ entry, dir }] for undo
    tab: "discover",
    pending: null,     // filters being edited in the sheet
    spin: null,        // { n, pos, winner }
    spotTried: new Set(), // place kinds we've already asked about this session
    ai: null,             // { ctl, timer } while the AI planner is working
  };

  // ======================================================================
  //  QUIZ
  // ======================================================================
  const SLIDER_FACES = {
    outdoorsy: ["🛋️", "🛋️", "📺", "🏡", "🙂", "🌳", "🌲", "🥾", "🏕️", "🏔️"],
    outAbout: ["🏠", "🏠", "🛋️", "📺", "🙂", "☕", "🛍️", "🎉", "🏙️", "✈️"],
    adventure: ["😴", "😌", "☕", "🙂", "😊", "😃", "🤩", "🤠", "🪂", "🚀"],
    active: ["🛌", "🛋️", "🧘", "🚶", "🙂", "🚴", "🏃", "🏀", "🧗", "⚡"],
    crowds: ["🤫", "📖", "🌙", "☕", "🙂", "🍿", "🎳", "🎤", "🎉", "🏟️"],
  };

  const QUIZ = [
    { key: "name", type: "text", emoji: "💘", q: "Who are you planning for?", sub: "Their first name or a nickname. It only lives on this phone." },
    { key: "birthdate", type: "date", emoji: "🎂", q: "When's {name}'s birthday?", sub: "We use their age to keep ideas age-appropriate." },
    { key: "outdoorsy", type: "slider", q: "How outdoorsy is {name}?", left: "Indoor kid", right: "Lives outside" },
    { key: "outAbout", type: "slider", q: "Homebody or out-and-about?", left: "Homebody", right: "Out & about" },
    { key: "adventure", type: "slider", q: "Chill or adventurous?", left: "Chill", right: "Adventurous" },
    { key: "budget", type: "choice", grid: "two", emoji: "💸", q: "What's the budget?", sub: "You can always change this later in filters.",
      options: [
        { v: 0, e: "🆓", label: "Free", sub: "$0, all creativity" },
        { v: 1, e: "💵", label: "$", sub: "Under $25" },
        { v: 2, e: "💳", label: "$$", sub: "$25 – $75" },
        { v: 3, e: "💎", label: "$$$", sub: "Treat them" },
      ] },
    { key: "foodie", type: "foodie", emoji: "🍜", q: "How much of a foodie is {name}?",
      options: [
        { v: 2, e: "🥪", label: "Eats to live", sub: "Food is fuel" },
        { v: 5, e: "🍝", label: "Likes good food", sub: "Happy to try a new spot" },
        { v: 9, e: "🤤", label: "Total foodie", sub: "Plans the day around meals" },
      ],
      dislikes: [
        ["seafood", "🦐 Seafood"], ["sushi", "🍣 Sushi"], ["spicy", "🌶️ Spicy"], ["meat", "🥩 Meat"],
        ["dairy", "🧀 Dairy"], ["gluten", "🍞 Gluten"], ["sweets", "🍰 Sweets"], ["coffee", "☕ Coffee"],
      ] },
    { key: "active", type: "slider", q: "Active or low-key?", left: "Low-key", right: "Active" },
    { key: "interests", type: "multi", emoji: "✨", q: "What is {name} into?", sub: "Pick as many as you like.",
      options: [
        { v: "artsy", e: "🎨", label: "Artsy" }, { v: "sporty", e: "🏀", label: "Sporty" },
        { v: "nerdy", e: "🤓", label: "Nerdy" }, { v: "musical", e: "🎵", label: "Musical" },
        { v: "outdoorsy", e: "🌲", label: "Outdoorsy" }, { v: "gamer", e: "🎮", label: "Gamer" },
        { v: "animals", e: "🐾", label: "Animals" }, { v: "cars", e: "🚗", label: "Cars" },
        { v: "books", e: "📚", label: "Bookworm" }, { v: "fashion", e: "👗", label: "Fashion" },
        { v: "cooking", e: "🍳", label: "Cooking" }, { v: "theater", e: "🎭", label: "Theater & dance" },
      ] },
    { key: "crowds", type: "slider", q: "Crowds or quiet?", left: "Quiet", right: "Crowds" },
    { key: "love", type: "choice", emoji: "💝", q: "What's {name}'s love language?", sub: "Not sure? Pick the one that sounds most like them.",
      options: [
        { v: "time", e: "⏳", label: "Quality time", sub: "Undivided attention" },
        { v: "words", e: "💬", label: "Words of affirmation", sub: "Compliments and kind notes" },
        { v: "gifts", e: "🎁", label: "Gifts", sub: "Thoughtful little things" },
        { v: "acts", e: "🛠️", label: "Acts of service", sub: "Doing things for them" },
        { v: "touch", e: "🤗", label: "Physical touch", sub: "Hugs, hand-holding" },
      ] },
  ];
  const QUESTION_COUNT = QUIZ.length - 1; // the name screen isn't one of the 10

  function freshAnswers() {
    return { name: "", birthdate: "", outdoorsy: 5, outAbout: 5, adventure: 5, active: 5, crowds: 5,
      budget: null, foodie: null, dislikes: [], interests: [], love: null };
  }

  function startQuiz(editId) {
    const p = editId && Store.get(editId);
    S.quiz = { i: 0, answers: p ? JSON.parse(JSON.stringify(p.answers)) : freshAnswers(), editId: p ? p.id : null, dir: 1 };
    show("quiz");
    renderQuiz();
  }

  const fill = (s) => s.replace("{name}", esc(S.quiz.answers.name || "them"));

  function stepValid(step, a) {
    switch (step.type) {
      case "text": return a.name.trim().length > 0;
      case "date": { const age = Engine.ageFrom(a.birthdate); return age != null && age >= 13 && age <= 100; }
      case "choice": return a[step.key] != null;
      case "foodie": return a.foodie != null;
      default: return true;
    }
  }

  function renderQuiz() {
    const { i, answers: a } = S.quiz;
    const step = QUIZ[i];
    $("#quiz-bar").style.width = (i / QUESTION_COUNT) * 100 + "%";
    $("#quiz-count").textContent = i === 0 ? "" : `${i}/${QUESTION_COUNT}`;
    const body = $("#quiz-body");
    body.classList.remove("anim", "anim-back");
    void body.offsetWidth;
    body.classList.add(S.quiz.dir > 0 ? "anim" : "anim-back");

    let h = "";
    if (step.emoji) h += `<div class="q-emoji">${step.emoji}</div>`;
    h += `<h2 class="q-title">${fill(step.q)}</h2>`;
    if (step.sub) h += `<p class="q-sub">${fill(step.sub)}</p>`;

    if (step.type === "text") {
      h += `<input id="q-input" class="field" type="text" maxlength="24" placeholder="Their name" value="${esc(a.name)}" autocomplete="off" enterkeyhint="next">`;
    } else if (step.type === "date") {
      const today = new Date().toISOString().slice(0, 10);
      h += `<input id="q-input" class="field" type="date" min="1925-01-01" max="${today}" value="${esc(a.birthdate)}">`;
      h += `<div class="age-note" id="age-note"></div>`;
    } else if (step.type === "slider") {
      const v = a[step.key];
      h += `<div class="slider-wrap">
        <div class="slider-face" id="s-face">${SLIDER_FACES[step.key][v - 1]}</div>
        <div class="slider-val" id="s-val">${v} / 10</div>
        <input id="q-input" class="slider" type="range" min="1" max="10" step="1" value="${v}" aria-label="${esc(step.q)}">
        <div class="slider-ends"><span>${step.left}</span><span>${step.right}</span></div>
      </div>`;
    } else if (step.type === "choice" || step.type === "foodie") {
      const cur = step.type === "foodie" ? a.foodie : a[step.key];
      h += `<div class="tiles ${step.grid || ""}">` + step.options.map((o) =>
        `<button class="tile ${cur === o.v ? "on" : ""}" data-v="${o.v}"><span class="te">${o.e}</span><span><b>${o.label}</b>${o.sub ? `<small>${o.sub}</small>` : ""}</span></button>`
      ).join("") + `</div>`;
      if (step.type === "foodie") {
        h += `<div class="sub-q">Anything they won't eat?</div><div class="chips-light">` +
          step.dislikes.map(([v, label]) => `<button class="chip-l ${a.dislikes.includes(v) ? "on" : ""}" data-d="${v}">${label}</button>`).join("") +
          `</div>`;
      }
    } else if (step.type === "multi") {
      h += `<div class="tiles three">` + step.options.map((o) =>
        `<button class="tile ${a.interests.includes(o.v) ? "on" : ""}" data-v="${o.v}"><span class="te">${o.e}</span><b>${o.label}</b></button>`
      ).join("") + `</div>`;
    }
    body.innerHTML = h;
    bindQuizStep(step);

    const last = i === QUIZ.length - 1;
    $("#quiz-next").textContent = last ? (S.quiz.editId ? "Save answers" : "Almost done →") : "Next";
    refreshNext();
  }

  function refreshNext() {
    const step = QUIZ[S.quiz.i];
    $("#quiz-next").disabled = !stepValid(step, S.quiz.answers);
  }

  function bindQuizStep(step) {
    const a = S.quiz.answers;
    const input = $("#q-input");
    if (step.type === "text") {
      input.addEventListener("input", () => { a.name = input.value; refreshNext(); });
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") quizNext(); });
      setTimeout(() => input.focus(), 350);
    } else if (step.type === "date") {
      const note = () => {
        const age = Engine.ageFrom(a.birthdate);
        const el = $("#age-note");
        if (age == null) el.innerHTML = "";
        else if (age < 13) el.innerHTML = "Date Me is for ages 13 and up.";
        else if (age > 100) el.innerHTML = "Hmm, double-check that year.";
        else if (age < 18) el.innerHTML = `That makes ${esc(a.name)} ${age} 🎂<small>We'll keep every idea teen-friendly.</small>`;
        else if (age < 21) el.innerHTML = `That makes ${esc(a.name)} ${age} 🎂<small>No bar or alcohol ideas until 21.</small>`;
        else el.innerHTML = `That makes ${esc(a.name)} ${age} 🎂`;
      };
      input.addEventListener("input", () => { a.birthdate = input.value; note(); refreshNext(); });
      input.addEventListener("change", () => { a.birthdate = input.value; note(); refreshNext(); });
      note();
    } else if (step.type === "slider") {
      input.addEventListener("input", () => {
        const v = +input.value;
        a[step.key] = v;
        $("#s-face").textContent = SLIDER_FACES[step.key][v - 1];
        $("#s-val").textContent = `${v} / 10`;
      });
    } else if (step.type === "choice") {
      $$(".tile", $("#quiz-body")).forEach((b) => b.addEventListener("click", () => {
        const v = step.key === "budget" ? +b.dataset.v : b.dataset.v;
        a[step.key] = v;
        $$(".tile", $("#quiz-body")).forEach((x) => x.classList.toggle("on", x === b));
        refreshNext();
        setTimeout(() => { if (S.quiz && QUIZ[S.quiz.i] === step) quizNext(); }, 260);
      }));
    } else if (step.type === "foodie") {
      $$(".tile", $("#quiz-body")).forEach((b) => b.addEventListener("click", () => {
        a.foodie = +b.dataset.v;
        $$(".tile", $("#quiz-body")).forEach((x) => x.classList.toggle("on", x === b));
        refreshNext();
      }));
      $$(".chip-l", $("#quiz-body")).forEach((b) => b.addEventListener("click", () => {
        const d = b.dataset.d;
        a.dislikes = a.dislikes.includes(d) ? a.dislikes.filter((x) => x !== d) : [...a.dislikes, d];
        b.classList.toggle("on");
      }));
    } else if (step.type === "multi") {
      $$(".tile", $("#quiz-body")).forEach((b) => b.addEventListener("click", () => {
        const v = b.dataset.v;
        a.interests = a.interests.includes(v) ? a.interests.filter((x) => x !== v) : [...a.interests, v];
        b.classList.toggle("on");
      }));
    }
  }

  function quizNext() {
    const q = S.quiz;
    if (!q || !stepValid(QUIZ[q.i], q.answers)) return;
    if (q.i < QUIZ.length - 1) { q.i++; q.dir = 1; renderQuiz(); return; }
    finishQuiz();
  }

  function quizBack() {
    const q = S.quiz;
    if (q.i > 0) { q.i--; q.dir = -1; renderQuiz(); return; }
    if (Store.active()) showMain(); else show("welcome");
  }

  function finishQuiz() {
    const { answers, editId } = S.quiz;
    answers.name = answers.name.trim();
    S.quiz = null;
    if (editId) {
      Store.updateAnswers(editId, answers);
      Store.setActive(editId);
      resetDeck();
      showMain("discover");
      toast("Answers saved ✓");
    } else {
      const p = Store.create(answers);
      resetDeck();
      startLocation(p.id);
    }
  }

  // ======================================================================
  //  LOCATION
  // ======================================================================
  const FEATURE_CHIPS = [
    ["city", "🏙️ City stuff"], ["lake", "🏞️ Lakes"], ["mountains", "⛰️ Mountains"], ["trails", "🥾 Trails"],
    ["coast", "🌊 Coast"], ["beach", "🏖️ Beaches"], ["river", "🛶 River"], ["hotspring", "♨️ Hot springs"],
    ["ski", "🎿 Ski hills"], ["snow", "❄️ Snow"],
  ];

  function startLocation(profileId) {
    const p = Store.get(profileId);
    S.loc = { profileId, place: p.place ? { ...p.place } : null, token: 0 };
    $("#loc-input").value = "";
    show("location");
    renderLocResult();
  }

  function renderLocResult(status) {
    const box = $("#loc-result");
    const place = S.loc.place;
    $("#loc-go").hidden = !place;
    $("#loc-skip").textContent = place ? "Cancel" : "Skip for now";
    if (status) { box.hidden = false; box.innerHTML = status; return; }
    if (!place) { box.hidden = true; return; }
    box.hidden = false;
    const f = place.features || {};
    const found = FEATURE_CHIPS.filter(([k]) => f[k] === true).map(([, label]) => `<span>${label}</span>`);
    let chips = found.join("");
    if (place.scanning) chips += `<span class="wait">Scanning the area…</span>`;
    else if (!found.length) chips += `<span class="wait" style="animation:none">We'll stick to ideas that work anywhere</span>`;
    const wx = place.weather ? `<p>${place.weather.emoji} ${place.weather.temp}${place.weather.unit} · ${esc(place.weather.text)} today</p>` : "";
    box.innerHTML = `<h4>📍 ${esc(place.label)}</h4>${wx}<div class="feat-chips">${chips}</div>`;
  }

  async function locSearch(text) {
    if (!text.trim()) return;
    renderLocResult(`<p>Looking up “${esc(text)}”…</p>`);
    try {
      const place = await Location.geocode(text);
      if (!place) { renderLocResult(`<p>Couldn't find “${esc(text)}”. Try a city name with the state, like “Provo, UT”.</p>`); return; }
      setLocPlace(place);
    } catch (e) {
      renderLocResult(`<p>Couldn't reach the map right now. Check your connection, or skip for now.</p>`);
    }
  }

  async function locGPS() {
    renderLocResult(`<p>Finding you…</p>`);
    try {
      const pos = await Location.getPosition();
      let place;
      try { place = await Location.reverse(pos.lat, pos.lon); } catch (e) { place = { label: "Your location", lat: pos.lat, lon: pos.lon, cc: "", isCity: false, features: {} }; }
      setLocPlace(place);
    } catch (e) {
      renderLocResult(`<p>Location is off or blocked. Type your city or zip instead.</p>`);
    }
  }

  function setLocPlace(place) {
    place.scanning = true;
    place.features = {};
    S.loc.place = place;
    renderLocResult();
    enrichPlace(place, S.loc.profileId);
  }

  // Weather + nearby scan. Updates the profile when done, even if the user has moved on.
  async function enrichPlace(place, profileId, skipScan) {
    const token = (place.token = Date.now() + Math.random());
    const season = Engine.seasonFor(new Date(), place.lat);
    const stillCurrent = () => place.token === token;
    const update = () => {
      place.features = Location.deriveFeatures(place, place.counts || null, place.weather, season);
      if (S.loc && S.loc.place === place) renderLocResult();
      const p = Store.get(profileId);
      if (p && p.place && p.place.lat === place.lat && p.place.lon === place.lon) {
        place.spots = { ...(p.place.spots || {}), ...(place.spots || {}) };
        place.spotsAt = { ...(p.place.spotsAt || {}), ...(place.spotsAt || {}) };
        Store.setPlace(profileId, strip(place));
        if (Store.active() && Store.active().id === profileId && !$("#screen-main").hidden) { renderStatus(); rebuildDeck(true); }
      }
    };
    const wxP = Location.weather(place.lat, place.lon, place.cc).then((wx) => { if (stillCurrent()) { place.weather = wx; update(); } }).catch(() => {});
    const scanP = skipScan ? Promise.resolve() : Location.scan(place.lat, place.lon).then((c) => { if (stillCurrent()) { place.counts = c; place.scanned = true; } }).catch(() => {});
    await Promise.all([wxP, scanP]);
    if (!stillCurrent()) return;
    place.scanning = false;
    update();
  }

  const strip = (place) => {
    const { token, scanning, ...rest } = place;
    return rest;
  };

  function locGo() {
    const { profileId, place } = S.loc;
    // If the area scan is still running it keeps going and saves itself when done.
    if (place) Store.setPlace(profileId, strip(place));
    S.loc = null;
    resetDeck();
    showMain("discover");
  }

  // Refresh stale weather (and retry a failed scan) when the app opens.
  function refreshPlaceIfStale(profile) {
    const place = profile.place;
    if (!place) return;
    const old = !place.weather || Date.now() - place.weather.at > 2 * 3600 * 1000;
    if (old || !place.scanned) enrichPlace({ ...place }, profile.id, place.scanned);
  }

  // ======================================================================
  //  MAIN: DECK
  // ======================================================================
  function resetDeck() { S.candidates = null; S.deck = []; S.history = []; S.spotTried = new Set(); }

  async function ensureCandidates(profile) {
    if (S.candidates) return;
    S.candidates = await Engine.gather(Engine.buildContext(profile));
  }

  async function rebuildDeck(keepTop) {
    const p = Store.active();
    if (!p) return;
    if (!S.candidates) {
      $("#deck").innerHTML = `<div class="empty"><div class="loading-heart">💘</div><p>Finding ideas for ${esc(p.name)}…</p></div>`;
      await ensureCandidates(p);
    }
    const ranked = Engine.rank(S.candidates, Engine.buildContext(p));
    if (keepTop && S.deck[0]) {
      const topId = S.deck[0].idea.id;
      const i = ranked.findIndex((r) => r.idea.id === topId);
      if (i > 0) ranked.unshift(ranked.splice(i, 1)[0]);
    }
    S.deck = ranked;
    renderDeck();
    renderStatus();
  }

  function cardHTML(entry) {
    const i = entry.idea;
    const badges = entry.badges.map((b) => `<span>${esc(b)}</span>`).join("");
    const why = entry.why.length ? `<div class="why">💡 ${esc(cap(entry.why.join(" · ")))}</div>` : "";
    const place = `<div class="spot-slot" data-kind="${esc(Spots.kindFor(i) || "")}">${spotLine(i)}</div>`;
    return `
      <div class="art cat-${esc(i.cat)}">
        <div class="match">🔥 ${entry.pct}% match</div>
        <div class="em">${esc(i.e)}</div>
        <div class="badges">${badges}</div>
        <div class="stamp yes">SAVE</div>
        <div class="stamp no">NOPE</div>
      </div>
      <div class="body">
        <h3>${esc(i.t)}</h3>
        <p>${esc(i.d)}</p>
        <div class="meta"><span>💲 ${Engine.fmtCost(i.c)}</span><span>⏱ ${Engine.fmtTime(i.m)}</span><span>${Engine.ioLabel(i.io)}</span></div>
        ${place}${why}
      </div>`;
  }
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // ---------- real spots near you ----------
  const spotLink = (sp) => `<a href="${esc(sp.url)}" target="_blank" rel="noopener">${esc(sp.name)}</a> · ${esc(sp.dist)}`;

  function spotLine(idea) {
    if (idea.place) return `<div class="place-line">📍 ${idea.place.url ? `<a href="${esc(idea.place.url)}" target="_blank" rel="noopener">${esc(idea.place.name)}</a>` : esc(idea.place.name)}</div>`;
    const p = Store.active();
    const kind = Spots.kindFor(idea);
    if (!kind || !p || !p.place) return "";
    const list = Spots.forIdea(idea, p.place);
    if (list && list.length) return `<div class="place-line">📍 ${spotLink(list[0])}${list.length > 1 ? ` <small>+${list.length - 1} more</small>` : ""}</div>`;
    if (list || S.spotTried.has(kind)) return "";
    return `<div class="place-line wait">📍 Finding the nearest one…</div>`;
  }

  function refreshSpotSlots(kind) {
    $$(`.spot-slot[data-kind="${kind}"]`).forEach((slot) => {
      const card = slot.closest(".card");
      const entry = card && S.deck.find((e) => e.idea.id === card.dataset.id);
      if (entry) slot.innerHTML = spotLine(entry.idea);
    });
    const box = $("#idea-box");
    if (!$("#modal-idea").hidden && box.dataset.kind === kind) openIdea(box.dataset.id);
  }

  // Look up real places for the next few cards (one kind at a time, cached for a week).
  function prefetchSpots() {
    const p = Store.active();
    if (!p || !p.place) return;
    const kinds = [...new Set(S.deck.slice(0, 4).map((e) => Spots.kindFor(e.idea)).filter(Boolean))];
    kinds.forEach((kind) => requestSpot(kind));
  }

  function requestSpot(kind) {
    const p = Store.active();
    if (!p || !p.place) return;
    const place = p.place;
    Spots.request(kind, place).then((list) => {
      S.spotTried.add(kind);
      if (list) Store.save();
      if (Store.active() && Store.active().place === place) refreshSpotSlots(kind);
    });
  }

  function renderDeck(enterId) {
    const deckEl = $("#deck");
    const show3 = S.deck.slice(0, 3);
    $$(".empty", deckEl).forEach((x) => x.remove());
    $$(".card:not(.flying)", deckEl).forEach((el) => { if (!show3.some((e) => e.idea.id === el.dataset.id)) el.remove(); });
    show3.forEach((entry, idx) => {
      let el = $$(".card:not(.flying)", deckEl).find((c) => c.dataset.id === entry.idea.id);
      if (!el) {
        el = document.createElement("div");
        el.className = "card";
        el.dataset.id = entry.idea.id;
        el.innerHTML = cardHTML(entry);
        if (idx === 1) el.classList.add("behind1");
        if (idx === 2) el.classList.add("behind2");
        if (entry.idea.id === enterId) el.classList.add("enter");
        deckEl.appendChild(el);
      }
      el.classList.toggle("behind1", idx === 1);
      el.classList.toggle("behind2", idx === 2);
      el.style.zIndex = 10 - idx;
      el.setAttribute("aria-hidden", idx === 0 ? "false" : "true");
      if (idx === 0) bindDrag(el);
    });
    if (!show3.length) deckEl.insertAdjacentHTML("beforeend", emptyHTML());
    prefetchSpots();
    $("[data-act=undo]").disabled = !S.history.length;
    $("[data-act=nope]").disabled = !show3.length;
    $("[data-act=like]").disabled = !show3.length;
  }

  function emptyHTML() {
    const p = Store.active();
    const btns = [`<button class="btn-grad" data-act="open-ai">✨ Get AI ideas for ${esc(p.name)}</button>`];
    if (!sameFilters(p.filters, Store.defaultFilters(p.answers))) btns.push(`<button class="btn-grad" data-act="open-filters">Loosen filters</button>`);
    if (p.skipped.length) btns.push(`<button class="btn-grad" data-act="unskip-all">Bring back ${p.skipped.length} skipped</button>`);
    if (!p.place) btns.push(`<button class="btn-grad" data-act="change-loc" data-id="${p.id}">Add your location</button>`);
    return `<div class="empty"><div class="big">🎉</div><h3>That's every idea that fits!</h3>
      <p>${p.saved.length ? `You've saved ${p.saved.length}. Spin one, or ` : ""}try loosening the filters.</p>${btns.join("")}</div>`;
  }

  // ---------- swiping ----------
  function bindDrag(el) {
    if (el._bound) return;
    el._bound = true;
    let sx = 0, sy = 0, dx = 0, dy = 0, t0 = 0, active = false;
    const yes = $(".stamp.yes", el), no = $(".stamp.no", el);
    el.addEventListener("pointerdown", (e) => {
      if (el !== topCard() || e.button > 0 || e.target.closest("a")) return;
      active = true; sx = e.clientX; sy = e.clientY; dx = dy = 0; t0 = performance.now();
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
      el.classList.add("dragging");
    });
    el.addEventListener("pointermove", (e) => {
      if (!active) return;
      dx = e.clientX - sx; dy = e.clientY - sy;
      el.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 16}deg)`;
      yes.style.opacity = Math.max(0, Math.min(1, dx / 90));
      no.style.opacity = Math.max(0, Math.min(1, -dx / 90));
    });
    const end = () => {
      if (!active) return;
      active = false;
      el.classList.remove("dragging");
      const fast = Math.abs(dx) / Math.max(1, performance.now() - t0) > 0.6 && Math.abs(dx) > 40;
      if (Math.abs(dx) > 100 || fast) swipe(dx > 0 ? 1 : -1, dy);
      else { el.style.transform = ""; yes.style.opacity = 0; no.style.opacity = 0; }
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  }

  const topCard = () => $$("#deck .card:not(.flying)").find((c) => S.deck[0] && c.dataset.id === S.deck[0].idea.id);

  function swipe(dir, dy = 0) {
    const entry = S.deck[0];
    const el = topCard();
    if (!entry || !el) return;
    const p = Store.active();
    el.classList.add("flying");
    el.style.transition = "transform .42s cubic-bezier(.4,0,.8,.5), opacity .42s";
    $(dir > 0 ? ".stamp.yes" : ".stamp.no", el).style.opacity = 1;
    requestAnimationFrame(() => {
      el.style.transform = `translate(${dir * window.innerWidth * 1.3}px, ${dy - 60}px) rotate(${dir * 30}deg)`;
      el.style.opacity = 0.6;
    });
    setTimeout(() => el.remove(), 450);

    S.deck.shift();
    S.history.push({ entry, dir });
    if (S.history.length > 30) S.history.shift();
    if (dir > 0) {
      Store.saveIdea(p.id, { ...entry.idea, spot: Spots.kindFor(entry.idea) });
      updateSavedCount();
      if (p.saved.length === 1) toast("Saved! Find it in the ♥ tab");
    } else {
      Store.skipIdea(p.id, entry.idea.id);
    }
    renderDeck();
    renderStatus();
  }

  function undo() {
    const h = S.history.pop();
    if (!h) return;
    const p = Store.active();
    if (h.dir > 0) Store.unsaveIdea(p.id, h.entry.idea.id);
    else Store.unskipIdea(p.id, h.entry.idea.id);
    S.deck.unshift(h.entry);
    updateSavedCount();
    renderDeck(h.entry.idea.id);
    renderStatus();
  }

  // ---------- status pills ----------
  const SEASON_PILL = { sp: "🌸 Spring ideas", su: "☀️ Summer ideas", fa: "🍂 Fall ideas", wi: "❄️ Winter ideas" };
  function renderStatus() {
    const p = Store.active();
    if (!p) return;
    const ctx = Engine.buildContext(p);
    const pills = [`<button class="pill ai" data-act="open-ai">✨ Plan with AI</button>`];
    if (p.place) {
      const wx = p.place.weather;
      pills.push(`<button class="pill" data-act="change-loc" data-id="${p.id}">${wx ? `${wx.emoji} ${wx.temp}${wx.unit} · ` : "📍 "}${esc(p.place.label)}</button>`);
    } else {
      pills.push(`<button class="pill hot" data-act="change-loc" data-id="${p.id}">📍 Add location</button>`);
    }
    pills.push(`<span class="pill">${SEASON_PILL[ctx.season]}</span>`);
    const f = p.filters, bits = [];
    bits.push(f.budget === 0 ? "Free" : "Up to " + Engine.fmtCost(f.budget));
    if (f.io !== "any") bits.push(f.io === "in" ? "Indoor" : "Outdoor");
    if (f.time !== "any") bits.push(TIME_LABEL[f.time]);
    if (f.dist < 3) bits.push(DIST_LABEL[f.dist]);
    pills.push(`<button class="pill" data-act="open-filters">⚙️ ${bits.join(" · ")}</button>`);
    pills.push(`<span class="pill">${S.deck.length} left</span>`);
    $("#status-row").innerHTML = pills.join("");
    $("#filter-dot").hidden = sameFilters(p.filters, Store.defaultFilters(p.answers));
  }

  // ======================================================================
  //  FILTERS
  // ======================================================================
  const TIME_LABEL = { m: "Morning", a: "Afternoon", e: "Evening", n: "Late night" };
  const DIST_LABEL = ["Stay home", "Close by", "Short drive", "Road trip"];
  const FILTER_OPTS = {
    budget: [[0, "🆓 Free"], [1, "$"], [2, "$$"], [3, "$$$"]],
    io: [["any", "Either"], ["in", "🏠 Indoor"], ["out", "🌲 Outdoor"]],
    time: [["any", "Any time"], ["m", "🌅 Morning"], ["a", "☀️ Afternoon"], ["e", "🌆 Evening"], ["n", "🌙 Late night"]],
    dist: [[0, "🏠 Stay home"], [1, "🚶 Close by · 10 mi"], [2, "🚗 Short drive · 30 mi"], [3, "🛣️ Road trip"]],
  };
  const sameFilters = (a, b) => a.budget === b.budget && a.io === b.io && a.time === b.time && a.dist === b.dist;

  function openFilters() {
    const p = Store.active();
    S.pending = { ...p.filters };
    renderFilters();
    $("#sheet-filters").hidden = false;
  }

  function renderFilters() {
    $$("#sheet-filters .chips").forEach((box) => {
      const key = box.dataset.filter;
      box.innerHTML = FILTER_OPTS[key].map(([v, label]) =>
        `<button class="chip ${S.pending[key] === v ? "on" : ""}" data-fv="${v}">${label}</button>`).join("");
      $$(".chip", box).forEach((b) => b.addEventListener("click", () => {
        const raw = b.dataset.fv;
        S.pending[key] = key === "budget" || key === "dist" ? +raw : raw;
        renderFilters();
      }));
    });
    const p = Store.active();
    const n = S.candidates ? Engine.rank(S.candidates, Engine.buildContext(p, { filters: S.pending })).length : null;
    const btn = $("#apply-filters");
    btn.textContent = n == null ? "Show ideas" : n === 0 ? "No ideas match" : `Show ${n} idea${n === 1 ? "" : "s"}`;
    btn.disabled = n === 0;
  }

  function applyFilters() {
    const p = Store.active();
    Store.setFilters(p.id, S.pending);
    $("#sheet-filters").hidden = true;
    S.history = [];
    rebuildDeck();
  }

  // ======================================================================
  //  SAVED + SPIN
  // ======================================================================
  function metaLine(i) { return `${Engine.fmtCost(i.c)} · ${Engine.fmtTime(i.m)} · ${Engine.ioLabel(i.io).replace(/^\S+ /, "")}`; }

  function renderSaved() {
    const p = Store.active();
    const list = $("#saved-list");
    if (!p.saved.length) {
      list.innerHTML = `<div class="empty" style="position:static;padding:50px 20px"><div class="big">💌</div><h3>Nothing saved yet</h3><p>Swipe right on ideas ${esc(p.name)} would love. They'll land here.</p><button class="btn-grad" data-act="tab" data-tab="discover">Start swiping</button></div>`;
      return;
    }
    list.innerHTML = p.saved.map((s) => `
      <div class="s-item" data-act="open-idea" data-id="${esc(s.id)}" role="button" tabindex="0">
        <div class="s-em cat-${esc(s.idea.cat)}">${esc(s.idea.e)}</div>
        <div class="s-txt"><b>${esc(s.idea.t)}</b><small>${metaLine(s.idea)}</small></div>
        <button class="s-x" data-act="unsave" data-id="${esc(s.id)}" aria-label="Remove">✕</button>
      </div>`).join("");
  }

  function updateSavedCount() {
    const p = Store.active();
    const b = $("#saved-count");
    const n = p ? p.saved.length : 0;
    b.hidden = !n;
    b.textContent = n;
  }

  function unsave(id) {
    const p = Store.active();
    const item = p.saved.find((s) => s.id === id);
    if (!item) return;
    Store.unsaveIdea(p.id, id);
    updateSavedCount();
    renderSaved();
    toast("Removed", "Undo", () => {
      p.saved.unshift(item);
      Store.save();
      updateSavedCount();
      renderSaved();
    });
  }

  function openIdea(id) {
    const p = Store.active();
    const s = p.saved.find((x) => x.id === id);
    if (!s) return;
    const i = s.idea;
    const kind = i.spot || Spots.kindFor(i);
    const list = kind && p.place ? Spots.forIdea({ ...i, spot: kind }, p.place) : null;
    let spotsHTML = "";
    if (i.place) spotsHTML = spotLine(i);
    else if (list && list.length) spotsHTML = `<div class="spot-list"><b>Near you</b>${list.map((sp) => `<div>📍 ${spotLink(sp)}</div>`).join("")}</div>`;
    else if (kind && p.place && !list && !S.spotTried.has(kind)) { spotsHTML = `<div class="place-line wait">📍 Finding the nearest one…</div>`; requestSpot(kind); }
    $("#idea-box").dataset.id = i.id;
    $("#idea-box").dataset.kind = kind || "";
    $("#idea-box").innerHTML = `
      <button class="icon-btn close" data-act="close-idea" aria-label="Close">✕</button>
      <div class="art cat-${esc(i.cat)}"><div class="em">${esc(i.e)}</div></div>
      <div class="body"><h3>${esc(i.t)}</h3><p>${esc(i.d)}</p>
        <div class="meta"><span>💲 ${Engine.fmtCost(i.c)}</span><span>⏱ ${Engine.fmtTime(i.m)}</span><span>${Engine.ioLabel(i.io)}</span></div>${spotsHTML}</div>
      <div class="idea-btns">
        <button class="btn-outline" data-act="unsave" data-id="${esc(i.id)}" data-close="1">Remove</button>
        <button class="btn-grad" data-act="share-idea" data-id="${esc(i.id)}">💌 Send to ${esc(p.name)}</button>
      </div>`;
    $("#modal-idea").hidden = false;
  }

  const ROW = 64;
  function openSpin() {
    const p = Store.active();
    const n = p.saved.length;
    $("#spin-result").hidden = true;
    $("#share-winner").hidden = true;
    const track = $("#reel-track");
    track.style.transition = "none";
    if (!n) {
      track.innerHTML = `<div class="reel-row"></div><div class="reel-row"><span>💭</span>Nothing saved yet</div>`;
      track.style.transform = "translateY(0)";
      $("#spin-sub").textContent = "Swipe right on a few ideas first, then come back and spin.";
      $("#spin-btn").disabled = true;
    } else {
      const rows = Math.max(36, n * 8);
      track.innerHTML = Array.from({ length: rows }, (_, k) => {
        const it = p.saved[k % n].idea;
        return `<div class="reel-row"><span>${esc(it.e)}</span>${esc(it.t)}</div>`;
      }).join("");
      S.spin = { n, rows, pos: 0 };
      setReel(0, false);
      $("#spin-sub").textContent = n === 1 ? "Only one saved idea. Fate's going to be predictable." : `Can't decide? Let fate pick from your ${n} saved ideas.`;
      $("#spin-btn").disabled = false;
      $("#spin-btn").textContent = "Spin!";
    }
    $("#modal-spin").hidden = false;
  }

  // Put row `k` in the highlighted middle window.
  function setReel(k, animate) {
    const track = $("#reel-track");
    track.style.transition = animate ? "transform 3.4s cubic-bezier(.12,.72,.12,1)" : "none";
    track.style.transform = `translateY(${-(k - 1) * ROW}px)`;
    S.spin.pos = k;
  }

  function doSpin() {
    const sp = S.spin;
    if (!sp || sp.spinning) return;
    const p = Store.active();
    // Jump back near the top (same idea showing) so there's room to spin.
    setReel((sp.pos % sp.n) + sp.n, false);
    void $("#reel-track").offsetWidth;
    const winner = Math.floor(Math.random() * sp.n);
    const last = sp.rows - 3;
    const target = winner + sp.n * Math.floor((last - winner) / sp.n);
    sp.spinning = true;
    sp.winner = winner;
    $("#spin-btn").disabled = true;
    $("#spin-result").hidden = true;
    $("#share-winner").hidden = true;
    setReel(target, true);
    setTimeout(() => {
      sp.spinning = false;
      const w = p.saved[winner].idea;
      $("#spin-result").innerHTML = `<h4>${esc(w.e)} ${esc(w.t)}</h4><p>${esc(w.d)}</p>`;
      $("#spin-result").hidden = false;
      $("#share-winner").hidden = false;
      $("#share-winner").dataset.id = w.id;
      $("#share-winner").textContent = `💌 Send it to ${p.name}`;
      $("#spin-btn").disabled = false;
      $("#spin-btn").textContent = "Spin again";
      confetti();
      if (navigator.vibrate) navigator.vibrate(30);
    }, 3500);
  }

  // ======================================================================
  //  AI PLANNER
  // ======================================================================
  const AI_MSGS = [
    (p) => `Reading ${p.name}'s answers…`,
    (p) => p.place ? `Checking what's near ${p.place.label.split(",")[0]}…` : "Thinking about what works anywhere…",
    () => "Looking for things happening this week…",
    (p) => p.place && p.place.weather ? `Peeking at the weather (${p.place.weather.temp}${p.place.weather.unit})…` : "Thinking about the season…",
    () => "Making sure the places are real…",
    () => "Writing your ideas…",
    () => "Almost there…",
  ];

  function openAI() {
    const p = Store.active();
    $("#ai-title").textContent = `✨ Plan something for ${p.name}`;
    $("#ai-sub").textContent = `The AI looks at ${p.name}'s answers${p.place ? ", what's around " + p.place.label.split(",")[0] : ""}, the season and the weather, then writes 5 ideas just for them.`;
    $$("#ai-chips .chip").forEach((c) => c.classList.remove("on"));
    $("#ai-text").value = "";
    $("#ai-form").hidden = false;
    $("#ai-loading").hidden = true;
    $("#sheet-ai").hidden = false;
  }

  function stopAI() {
    if (!S.ai) return;
    clearInterval(S.ai.timer);
    S.ai.ctl.abort();
    S.ai = null;
  }

  async function runAI() {
    const p = Store.active();
    const asks = $$("#ai-chips .chip.on").map((c) => c.dataset.ask);
    const extra = $("#ai-text").value.trim();
    const request = [...asks, extra].filter(Boolean).join(". ");
    $("#ai-form").hidden = true;
    $("#ai-loading").hidden = false;
    let i = 0;
    $("#ai-msg").textContent = AI_MSGS[0](p);
    const ctl = new AbortController();
    S.ai = { ctl, timer: setInterval(() => { i = Math.min(i + 1, AI_MSGS.length - 1); $("#ai-msg").textContent = AI_MSGS[i](p); }, 4500) };
    try {
      const ideas = await AI.plan(p, request, ctl.signal);
      if (!S.ai || S.ai.ctl !== ctl) return; // cancelled
      clearInterval(S.ai.timer);
      S.ai = null;
      Store.addAiIdeas(p.id, ideas);
      const ctx = Engine.buildContext(p);
      const fresh = ideas.map((raw) => Engine.normalize(raw, "ai"));
      if (S.candidates) S.candidates.unshift(...fresh);
      const entries = fresh.map((idea) => Engine.score(idea, ctx));
      S.deck = [...entries, ...S.deck.filter((e) => !fresh.some((f) => f.id === e.idea.id))];
      $("#sheet-ai").hidden = true;
      setTab("discover");
      renderDeck(entries[0] && entries[0].idea.id);
      renderStatus();
      confetti();
      toast(`✨ ${entries.length} new ideas for ${p.name}`);
    } catch (e) {
      if (!S.ai || S.ai.ctl !== ctl) return;
      stopAI();
      $("#ai-loading").hidden = true;
      $("#ai-form").hidden = false;
      toast(aiErrorText(e));
    }
  }

  function aiErrorText(e) {
    switch (e.code) {
      case "limit": return e.who === "phone" ? "That's today's AI plans for this phone. More tomorrow!" : "The AI planner is resting for today. Try tomorrow!";
      case "not_ready": case "bad_key": return "The AI planner is almost ready. Check back soon!";
      case "network": return "Couldn't reach the planner. Check your connection.";
      default: return "The planner got stuck. Try again in a minute.";
    }
  }

  // ======================================================================
  //  PEOPLE
  // ======================================================================
  function renderPeople() {
    const active = Store.active();
    $("#people-list").innerHTML = Store.all().map((p) => {
      const age = Engine.ageFrom(p.answers.birthdate);
      const where = p.place ? `📍 ${esc(p.place.label)}` : "📍 No location";
      const isOn = active && active.id === p.id;
      return `<div class="p-card ${isOn ? "active" : ""}">
        <div class="p-top">
          <div class="avatar">${esc((p.name || "?").charAt(0).toUpperCase())}</div>
          <div><b>${esc(p.name)}</b><small>${age != null ? age + " · " : ""}${where} · ♥ ${p.saved.length}</small></div>
          ${isOn ? `<span class="tag-on">Planning for</span>` : ""}
        </div>
        <div class="p-btns">
          ${isOn ? "" : `<button class="go" data-act="switch" data-id="${p.id}">Plan for ${esc(p.name)}</button>`}
          <button data-act="edit" data-id="${p.id}">✏️ Redo quiz</button>
          <button data-act="change-loc" data-id="${p.id}">📍 Location</button>
          ${p.skipped.length ? `<button data-act="unskip" data-id="${p.id}">↺ ${p.skipped.length} skipped</button>` : ""}
          <button class="danger" data-act="delete" data-id="${p.id}">🗑️ Delete</button>
        </div>
      </div>`;
    }).join("");
  }

  let armed = null;
  function armDelete(btn, id) {
    if (armed && armed.id === id) {
      clearTimeout(armed.t);
      armed = null;
      const name = Store.get(id).name;
      Store.remove(id);
      resetDeck();
      toast(`${name} deleted`);
      if (!Store.active()) { show("welcome"); return; }
      showMain("people");
      return;
    }
    if (armed) clearTimeout(armed.t);
    btn.classList.add("armed");
    btn.textContent = "Tap again to delete";
    armed = { id, t: setTimeout(() => { armed = null; renderPeople(); }, 4000) };
  }

  // ======================================================================
  //  SHARING
  // ======================================================================
  const appUrl = () => location.origin + location.pathname;

  async function shareText(text) {
    try {
      if (navigator.share) { await navigator.share({ text }); return; }
    } catch (e) {
      if (e && e.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied! Paste it in a text 💬");
    } catch (e) {
      prompt("Copy this:", text);
    }
  }

  function shareIdea(id) {
    const p = Store.active();
    const s = p.saved.find((x) => x.id === id);
    if (!s) return;
    const i = s.idea;
    const kind = i.spot || Spots.kindFor(i);
    const list = kind && p.place ? Spots.forIdea({ ...i, spot: kind }, p.place) : null;
    const where = list && list.length ? `\n📍 ${list[0].name} (${list[0].dist})\n${list[0].url}` : "";
    shareText(`${i.e} Date idea: ${i.t}\n${i.d}\n${Engine.fmtCost(i.c)} · ${Engine.fmtTime(i.m)}${where}\n\nWant to? 💘\n\n(found on Date Me: ${appUrl()})`);
  }

  function shareApp() {
    shareText(`Date Me 💘 Swipe right on date ideas, not people.\n${appUrl()}\n\nOpen it on your phone, then Share → Add to Home Screen so it opens like an app.`);
  }

  // ======================================================================
  //  SHELL
  // ======================================================================
  function show(name) {
    ["welcome", "quiz", "location", "main"].forEach((s) => { $("#screen-" + s).hidden = s !== name; });
  }

  function showMain(tab) {
    const p = Store.active();
    if (!p) { show("welcome"); return; }
    show("main");
    $("#who-name").textContent = "for " + p.name;
    updateSavedCount();
    setTab(tab || S.tab);
    rebuildDeck();
    refreshPlaceIfStale(p);
  }

  function setTab(tab) {
    S.tab = tab;
    ["discover", "saved", "people"].forEach((t) => { $("#tab-" + t).hidden = t !== tab; });
    $$(".tabbar button").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
    if (tab === "saved") renderSaved();
    if (tab === "people") renderPeople();
  }

  let toastT;
  function toast(msg, actionLabel, action) {
    const el = $("#toast");
    el.innerHTML = esc(msg) + (actionLabel ? ` <button>${esc(actionLabel)}</button>` : "");
    if (actionLabel) $("button", el).onclick = () => { el.classList.remove("show"); action(); };
    el.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove("show"), actionLabel ? 4500 : 2200);
  }

  function confetti() {
    const box = $("#confetti");
    const colors = ["#ff2e7e", "#ffa04d", "#ffd23f", "#18c98b", "#8e6cf7", "#22c1ff"];
    box.innerHTML = Array.from({ length: 60 }, () => {
      const x = (Math.random() - 0.5) * 520, y = (Math.random() - 0.3) * 640, r = Math.random() * 720 - 360;
      return `<i style="background:${colors[Math.floor(Math.random() * colors.length)]};--x:${x}px;--y:${y}px;--r:${r}deg;animation-delay:${Math.random() * 0.12}s"></i>`;
    }).join("");
    setTimeout(() => (box.innerHTML = ""), 1600);
  }

  // One click handler for every data-act button.
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const act = el.dataset.act, id = el.dataset.id;
    switch (act) {
      case "start-quiz": startQuiz(); break;
      case "quiz-next": quizNext(); break;
      case "quiz-back": quizBack(); break;
      case "use-gps": locGPS(); break;
      case "loc-go": locGo(); break;
      case "loc-skip":
      case "loc-back": S.loc = null; showMain(); break;
      case "tab": setTab(el.dataset.tab); break;
      case "like": swipe(1); break;
      case "nope": swipe(-1); break;
      case "undo": undo(); break;
      case "open-filters": openFilters(); break;
      case "apply-filters": applyFilters(); break;
      case "reset-filters": S.pending = Store.defaultFilters(Store.active().answers); renderFilters(); break;
      case "open-spin": openSpin(); break;
      case "close-spin": $("#modal-spin").hidden = true; break;
      case "spin": doSpin(); break;
      case "share-winner": shareIdea(el.dataset.id); break;
      case "open-idea": openIdea(id); break;
      case "close-idea": $("#modal-idea").hidden = true; break;
      case "unsave":
        e.stopPropagation();
        if (el.dataset.close) $("#modal-idea").hidden = true;
        unsave(id);
        break;
      case "share-idea": shareIdea(id); break;
      case "share-app": shareApp(); break;
      case "new-person": startQuiz(); break;
      case "switch": Store.setActive(id); resetDeck(); showMain("discover"); break;
      case "edit": startQuiz(id); break;
      case "change-loc": startLocation(id || Store.active().id); break;
      case "unskip": Store.clearSkipped(id); if (Store.active().id === id) { S.history = []; rebuildDeck(); } renderPeople(); toast("Skipped ideas are back in the deck"); break;
      case "unskip-all": Store.clearSkipped(Store.active().id); S.history = []; rebuildDeck(); break;
      case "delete": armDelete(el, id); break;
      case "open-ai": openAI(); break;
      case "close-ai": $("#sheet-ai").hidden = true; break;
      case "run-ai": runAI(); break;
      case "cancel-ai": stopAI(); $("#ai-loading").hidden = true; $("#ai-form").hidden = false; break;
    }
  });

  // Tap outside a sheet/modal closes it.
  $$(".overlay").forEach((ov) => ov.addEventListener("click", (e) => {
    if (e.target !== ov || (S.spin && S.spin.spinning) || (ov.id === "sheet-ai" && S.ai)) return;
    ov.hidden = true;
  }));

  $$("#ai-chips .chip").forEach((c) => c.addEventListener("click", () => c.classList.toggle("on")));

  $("#loc-form").addEventListener("submit", (e) => { e.preventDefault(); $("#loc-input").blur(); locSearch($("#loc-input").value); });

  document.addEventListener("keydown", (e) => {
    if ($("#screen-main").hidden || S.tab !== "discover" || !$$(".overlay").every((o) => o.hidden)) return;
    if (e.key === "ArrowRight") swipe(1);
    else if (e.key === "ArrowLeft") swipe(-1);
    else if (e.key === "Backspace" || (e.key === "z" && (e.ctrlKey || e.metaKey))) undo();
  });

  // ---------- boot ----------
  Store.load();
  if (Store.active()) showMain("discover"); else show("welcome");
})();
