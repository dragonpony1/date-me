/* Date Me — screens, quiz, swiping, spin. */
(function () {
  const { Store, Engine, Location, Spots, AI, Shop, Invite } = window.DateMe;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const S = {
    quiz: null,        // { mode, steps, i, answers, editId, pendingId, dir, ... }
    invite: null,      // { pid, from, to } when someone sent us their quiz
    selfAnswers: null, // what we answered about ourselves for that invite
    importing: null,   // { pid, answers } from a link they sent back
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
  //  QUIZ — one quiz, three voices:
  //    "me"   the planner, about themselves (asked once; includes their date budget)
  //    "them" the planner, answering for the person they're dating
  //    "self" the date, answering about themselves from an invite link
  // ======================================================================
  const SLIDER_FACES = {
    outdoorsy: ["🛋️", "🛋️", "📺", "🏡", "🙂", "🌳", "🌲", "🥾", "🏕️", "🏔️"],
    outAbout: ["🏠", "🏠", "🛋️", "📺", "🙂", "☕", "🛍️", "🎉", "🏙️", "✈️"],
    adventure: ["😴", "😌", "☕", "🙂", "😊", "😃", "🤩", "🤠", "🪂", "🚀"],
    active: ["🛌", "🛋️", "🧘", "🚶", "🙂", "🚴", "🏃", "🏀", "🧗", "⚡"],
    crowds: ["🤫", "📖", "🌙", "☕", "🙂", "🍿", "🎳", "🎤", "🎉", "🏟️"],
  };

  // q / sub: { you, them } — "you" wording is used for both "me" and "self".
  const QUIZ = [
    { key: "name", type: "text", emoji: "💘",
      q: { me: "First, what's your name?", them: "Who are you planning for?", self: "What's your name?" },
      sub: { me: "Just your first name. It shows on quizzes you send.", them: "Their first name or a nickname. It only lives on this phone.", self: "So {from} knows it's you." } },
    { key: "age", type: "age", emoji: "🎂",
      q: { you: "How old are you?", them: "How old is {name}?" },
      sub: { me: "We keep ideas right for both your ages.", them: "We use their age to keep ideas age-appropriate.", self: "So ideas fit your age." } },
    { key: "getAround", type: "choice", emoji: "🛵",
      q: { you: "How do you get around?", them: "How does {name} get around?" },
      sub: { all: "So we don't suggest trips you can't get to." },
      options: [
        { v: "drive", e: "🚗", label: "I drive", sub: "Have a car (or can borrow one)" },
        { v: "transit", e: "🚌", label: "Bus, bike or walk", sub: "No car, but I get places" },
        { v: "ride", e: "🙋", label: "I get dropped off", sub: "Parents, friends, rideshare" },
      ] },
    { key: "outdoorsy", type: "slider", q: { you: "How outdoorsy are you?", them: "How outdoorsy is {name}?" }, left: "Indoor kid", right: "Lives outside" },
    { key: "outAbout", type: "slider", q: { you: "Are you a homebody or out-and-about?", them: "Is {name} a homebody or out-and-about?" }, left: "Homebody", right: "Out & about" },
    { key: "adventure", type: "slider", q: { you: "Are you chill or adventurous?", them: "Is {name} chill or adventurous?" }, left: "Chill", right: "Adventurous" },
    { key: "budget", type: "choice", grid: "two", emoji: "💸", only: ["me"],
      q: { me: "What's your budget for dates?" }, sub: { me: "You can always change it later in filters." },
      options: [
        { v: 0, e: "🆓", label: "Free", sub: "$0, all creativity" },
        { v: 1, e: "💵", label: "$", sub: "Under $25" },
        { v: 2, e: "💳", label: "$$", sub: "$25 – $75" },
        { v: 3, e: "💎", label: "$$$", sub: "Treat them" },
      ] },
    { key: "foodie", type: "foodie", emoji: "🍜",
      q: { you: "How much of a foodie are you?", them: "How much of a foodie is {name}?" },
      subq: { you: "Anything you won't eat?", them: "Anything they won't eat?" },
      options: [
        { v: 2, e: "🥪", label: "Eats to live", sub: "Food is fuel" },
        { v: 5, e: "🍝", label: "Likes good food", sub: "Happy to try a new spot" },
        { v: 9, e: "🤤", label: "Total foodie", sub: "Plans the day around meals" },
      ],
      dislikes: [
        ["seafood", "🦐 Seafood"], ["sushi", "🍣 Sushi"], ["spicy", "🌶️ Spicy"], ["meat", "🥩 Meat"],
        ["dairy", "🧀 Dairy"], ["gluten", "🍞 Gluten"], ["sweets", "🍰 Sweets"], ["coffee", "☕ Coffee"],
      ] },
    { key: "active", type: "slider", q: { you: "Are you active or low-key?", them: "Is {name} active or low-key?" }, left: "Low-key", right: "Active" },
    { key: "interests", type: "multi", emoji: "✨", q: { you: "What are you into?", them: "What is {name} into?" }, sub: { all: "Pick as many as you like." },
      options: [
        { v: "artsy", e: "🎨", label: "Artsy" }, { v: "sporty", e: "🏀", label: "Sporty" },
        { v: "nerdy", e: "🤓", label: "Nerdy" }, { v: "musical", e: "🎵", label: "Musical" },
        { v: "outdoorsy", e: "🌲", label: "Outdoorsy" }, { v: "gamer", e: "🎮", label: "Gamer" },
        { v: "animals", e: "🐾", label: "Animals" }, { v: "cars", e: "🚗", label: "Cars" },
        { v: "books", e: "📚", label: "Bookworm" }, { v: "fashion", e: "👗", label: "Fashion" },
        { v: "cooking", e: "🍳", label: "Cooking" }, { v: "theater", e: "🎭", label: "Theater & dance" },
      ] },
    { key: "crowds", type: "slider", q: { you: "Do you like crowds or quiet?", them: "Does {name} like crowds or quiet?" }, left: "Quiet", right: "Crowds" },
    { key: "love", type: "choice", emoji: "💝",
      q: { you: "What's your love language?", them: "What's {name}'s love language?" },
      sub: { you: "Not sure? Pick the one that sounds most like you.", them: "Not sure? Pick the one that sounds most like them." },
      options: [
        { v: "time", e: "⏳", label: "Quality time", sub: "Undivided attention" },
        { v: "words", e: "💬", label: "Words of affirmation", sub: "Compliments and kind notes" },
        { v: "gifts", e: "🎁", label: "Gifts", sub: "Thoughtful little things" },
        { v: "acts", e: "🛠️", label: "Acts of service", sub: "Doing things for each other" },
        { v: "touch", e: "🤗", label: "Physical touch", sub: "Hugs, hand-holding" },
      ] },
  ];

  // Pick the right wording for this quiz's voice.
  function say(map, mode) {
    if (!map) return "";
    return map[mode] || (mode !== "them" ? map.you : null) || map.all || "";
  }

  function freshAnswers(name = "") {
    return { name, age: null, ageAt: null, getAround: null, outdoorsy: 5, outAbout: 5, adventure: 5, active: 5, crowds: 5,
      budget: null, foodie: null, dislikes: [], interests: [], love: null };
  }

  // opts: { mode, editId, pendingId, from, to, pid, after }
  function startQuiz(opts = {}) {
    const mode = opts.mode || "them";
    let answers;
    if (mode === "me") answers = Store.me() ? JSON.parse(JSON.stringify(Store.me())) : freshAnswers();
    else if (opts.editId && Store.get(opts.editId) && Store.get(opts.editId).answers) answers = JSON.parse(JSON.stringify(Store.get(opts.editId).answers));
    else answers = freshAnswers(opts.to || (opts.pendingId && Store.get(opts.pendingId) ? Store.get(opts.pendingId).name : ""));
    if (mode === "me" && answers.budget == null && Store.active() && Store.active().answers) answers.budget = Store.active().answers.budget ?? null;
    const steps = QUIZ.filter((s) => !s.only || s.only.includes(mode));
    if (answers.getAround === undefined) answers.getAround = null; // older answers didn't have it
    if (answers.birthdate) { answers.age = Engine.ageOf(answers); answers.ageAt = Date.now(); delete answers.birthdate; } // older answers had a birthday
    S.quiz = { ...opts, mode, steps, i: 0, answers, dir: 1 };
    show("quiz");
    renderQuiz();
  }

  const fill = (s) => s.replace("{name}", esc(S.quiz.answers.name || "them")).replace("{from}", esc(S.quiz.from || "them"));

  function stepValid(step, a) {
    switch (step.type) {
      case "text": return a.name.trim().length > 0;
      case "age": { const age = Engine.ageOf(a); return age != null && age >= 13 && age <= 100; }
      case "choice": return a[step.key] != null;
      case "foodie": return a.foodie != null;
      default: return true;
    }
  }

  function renderQuiz() {
    const { i, answers: a, steps, mode } = S.quiz;
    const step = steps[i];
    const total = steps.length - 1; // the name screen isn't counted
    $("#quiz-bar").style.width = (i / total) * 100 + "%";
    $("#quiz-count").textContent = i === 0 ? "" : `${i}/${total}`;
    const body = $("#quiz-body");
    body.classList.remove("anim", "anim-back");
    void body.offsetWidth;
    body.classList.add(S.quiz.dir > 0 ? "anim" : "anim-back");

    let h = "";
    if (step.emoji) h += `<div class="q-emoji">${step.emoji}</div>`;
    h += `<h2 class="q-title">${fill(say(step.q, mode))}</h2>`;
    const sub = say(step.sub, mode);
    if (sub) h += `<p class="q-sub">${fill(sub)}</p>`;

    if (step.type === "text") {
      h += `<input id="q-input" class="field" type="text" maxlength="24" placeholder="${mode === "them" ? "Their name" : "Your name"}" value="${esc(a.name)}" autocomplete="off" enterkeyhint="next">`;
    } else if (step.type === "age") {
      const cur = Engine.ageOf(a);
      h += `<div class="age-picker">
        <button class="age-step" data-step="-1" aria-label="Younger">−</button>
        <input id="q-input" class="field age-field" type="number" inputmode="numeric" pattern="[0-9]*" min="13" max="99" placeholder="—" value="${cur != null ? cur : ""}" aria-label="Age">
        <button class="age-step" data-step="1" aria-label="Older">+</button>
      </div>`;
      h += `<div class="age-note" id="age-note"></div>`;
    } else if (step.type === "slider") {
      const v = a[step.key];
      h += `<div class="slider-wrap">
        <div class="slider-face" id="s-face">${SLIDER_FACES[step.key][v - 1]}</div>
        <div class="slider-val" id="s-val">${v} / 10</div>
        <input id="q-input" class="slider" type="range" min="1" max="10" step="1" value="${v}" aria-label="${esc(fill(say(step.q, mode)))}">
        <div class="slider-ends"><span>${step.left}</span><span>${step.right}</span></div>
      </div>`;
    } else if (step.type === "choice" || step.type === "foodie") {
      const cur = step.type === "foodie" ? a.foodie : a[step.key];
      h += `<div class="tiles ${step.grid || ""}">` + step.options.map((o) =>
        `<button class="tile ${cur === o.v ? "on" : ""}" data-v="${o.v}"><span class="te">${o.e}</span><span><b>${o.label}</b>${o.sub ? `<small>${o.sub}</small>` : ""}</span></button>`
      ).join("") + `</div>`;
      if (step.type === "foodie") {
        h += `<div class="sub-q">${say(step.subq, mode)}</div><div class="chips-light">` +
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

    const last = i === steps.length - 1;
    const doneLabel = mode === "self" ? "Done ✓" : S.quiz.editId || S.quiz.after === "main" ? "Save answers" : "Almost done →";
    $("#quiz-next").textContent = last ? doneLabel : "Next";
    refreshNext();
  }

  function refreshNext() {
    const step = S.quiz.steps[S.quiz.i];
    $("#quiz-next").disabled = !stepValid(step, S.quiz.answers);
  }

  function bindQuizStep(step) {
    const a = S.quiz.answers;
    const mode = S.quiz.mode;
    const input = $("#q-input");
    if (step.type === "text") {
      input.addEventListener("input", () => { a.name = input.value; refreshNext(); });
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") quizNext(); });
      setTimeout(() => input.focus(), 350);
    } else if (step.type === "age") {
      const note = () => {
        const age = Engine.ageOf(a);
        const el = $("#age-note");
        const who = mode === "them" ? `${esc(a.name)} is ${age}` : `You're ${age}`;
        if (age == null) el.innerHTML = "";
        else if (age < 13) el.innerHTML = "Date Me is for ages 13 and up.";
        else if (age > 100) el.innerHTML = "Hmm, double-check that.";
        else if (age < 18) el.innerHTML = `${who} 🎂<small>We'll keep every idea teen-friendly.</small>`;
        else if (age < 21) el.innerHTML = `${who} 🎂<small>No bar or alcohol ideas until 21.</small>`;
        else el.innerHTML = `${who} 🎂`;
      };
      const set = (n) => {
        a.age = Number.isFinite(n) && n > 0 ? Math.min(99, Math.round(n)) : null;
        a.ageAt = a.age != null ? Date.now() : null;
        delete a.birthdate;
        note();
        refreshNext();
      };
      input.addEventListener("input", () => set(parseInt(input.value, 10)));
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") quizNext(); });
      $$(".age-step", $("#quiz-body")).forEach((b) => b.addEventListener("click", () => {
        const now = Engine.ageOf(a);
        const n = now == null ? 16 : Math.max(13, Math.min(99, now + +b.dataset.step));
        input.value = n;
        set(n);
      }));
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
        if (step.key === "getAround") a.getAround = v;
        a[step.key] = v;
        $$(".tile", $("#quiz-body")).forEach((x) => x.classList.toggle("on", x === b));
        refreshNext();
        setTimeout(() => { if (S.quiz && S.quiz.steps[S.quiz.i] === step) quizNext(); }, 260);
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
    if (!q || !stepValid(q.steps[q.i], q.answers)) return;
    if (q.i < q.steps.length - 1) { q.i++; q.dir = 1; renderQuiz(); return; }
    finishQuiz();
  }

  function quizBack() {
    const q = S.quiz;
    if (q.i > 0) { q.i--; q.dir = -1; renderQuiz(); return; }
    const mode = q.mode;
    S.quiz = null;
    if (mode === "self") showInvite(S.invite);
    else if (mode === "them" && !q.editId && Store.me()) showWho();
    else if (Store.active()) showMain();
    else show("welcome");
  }

  function finishQuiz() {
    const q = S.quiz;
    const answers = q.answers;
    answers.name = answers.name.trim();
    S.quiz = null;
    if (q.mode === "me") {
      Store.setMe(answers);
      resetDeck();
      if (q.after === "main" && Store.active()) { showMain("discover"); toast("Saved ✓ Ideas now fit you both"); }
      else if (Store.active()) showMain("discover");
      else showWho();
    } else if (q.mode === "self") {
      showSent(answers);
    } else if (q.editId || q.pendingId) {
      const id = q.editId || q.pendingId;
      Store.updateAnswers(id, answers, "me");
      Store.setActive(id);
      resetDeck();
      showMain("discover");
      toast("Answers saved ✓");
    } else {
      const p = Store.create(answers, { by: "me" });
      resetDeck();
      startLocation(p.id);
    }
  }

  // ======================================================================
  //  WHO ARE YOU DATING? — answer for them, or send them the quiz
  // ======================================================================
  function showWho() {
    $("#who-send").hidden = true;
    $("#who-choices").hidden = false;
    $("#who-name-input").value = "";
    $("#who-back").style.visibility = Store.active() ? "visible" : "hidden";
    show("who");
  }

  async function sendQuiz(pid, toName) {
    const me = Store.me();
    const p = Store.get(pid);
    const tok = (p && p.inviteToken) || Invite.newToken(); // resending reuses the code, so older links still work
    const url = Invite.inviteUrl(pid, me ? me.name : "", toName, tok);
    const from = me && me.name ? `${me.name} here! ` : "";
    await shareText(`Hey ${toName}! ${from}💘 I want to plan dates you'll actually love. Can you answer 10 quick questions about yourself? Takes a minute:\n${url}`);
    Store.markInvited(pid, tok);
  }

  async function whoSend() {
    const name = $("#who-name-input").value.trim();
    if (!name) { $("#who-name-input").focus(); return; }
    const p = Store.create(null, { name, invited: true });
    resetDeck();
    await sendQuiz(p.id, name);
    toast(`Quiz sent to ${name} 💌`);
    startLocation(p.id);
  }

  // ======================================================================
  //  INVITES & ANSWER LINKS
  // ======================================================================
  // Their side: someone sent them the quiz.
  function showInvite(inv) {
    S.invite = inv;
    $("#invite-title").textContent = `${inv.from} wants to plan dates you'll love`;
    $("#invite-sub").textContent = `Answer 10 quick questions about yourself. It takes about a minute, and your answers only go to ${inv.from}.`;
    show("invite");
  }

  // Their side, done answering: drop the answers in the mailbox; the reply link is the backup.
  async function showSent(answers) {
    S.selfAnswers = answers;
    const inv = S.invite || { from: "them" };
    const manual = () => {
      $("#sent-title").textContent = `All done, ${answers.name}! 🎉`;
      $("#sent-sub").textContent = `Now send your answers back to ${inv.from} so they can start planning.`;
      $("#sent-send").textContent = `💌 Send to ${inv.from}`;
      $("#sent-send").hidden = false;
      $("#sent-copy").textContent = "Copy the link instead";
    };
    $("#sent-own").hidden = false;
    if (!inv.token) { manual(); show("sent"); return; }
    $("#sent-title").textContent = `Sending to ${inv.from}…`;
    $("#sent-sub").textContent = "One sec.";
    $("#sent-send").hidden = true;
    $("#sent-copy").hidden = true;
    show("sent");
    const ok = await Invite.mailbox.drop(inv.token, answers, inv.pid);
    $("#sent-copy").hidden = false;
    if (ok) {
      $("#sent-title").textContent = `Sent to ${inv.from}! 🎉`;
      $("#sent-sub").textContent = `${inv.from} will see your answers the next time they open Date Me. You're all set.`;
      $("#sent-copy").textContent = `Text ${inv.from} a link too (optional)`;
    } else {
      manual();
    }
  }

  function sentUrl() {
    return Invite.answersUrl(S.selfAnswers, S.invite ? S.invite.pid : "", S.invite ? S.invite.token : "");
  }

  async function sentSend() {
    await shareText(`${S.selfAnswers.name}'s Date Me answers 💘 Tap to add them:\n${sentUrl()}`);
  }

  async function sentCopy() {
    try { await navigator.clipboard.writeText(sentUrl()); toast("Link copied 💬"); }
    catch (e) { prompt("Copy this link:", sentUrl()); }
  }

  // They liked it and want their own Date Me: their answers become "me".
  function sentOwn() {
    if (!Store.me()) Store.setMe({ ...S.selfAnswers, budget: null });
    S.invite = null;
    showWho();
  }

  // Your side: their answers came back.
  function showImport(data) {
    S.importing = data;
    const a = data.answers;
    const existing = data.pid && Store.get(data.pid);
    const bits = [a.age ? `${a.age}` : null, a.interests.length ? `into ${a.interests.slice(0, 3).join(", ")}` : null,
      a.love ? `love language: ${{ time: "quality time", words: "words", gifts: "gifts", acts: "acts of service", touch: "touch" }[a.love]}` : null].filter(Boolean);
    $("#import-title").textContent = `✨ ${a.name} answered!`;
    $("#import-sub").textContent = bits.join(" · ");
    $("#import-note").textContent = existing ? `This updates ${existing.name}'s profile with their own answers.` : "This adds them to your Date Me.";
    show("import");
  }

  function importGo() {
    const { pid, answers, token } = S.importing;
    S.importing = null;
    Invite.mailbox.clear(token);
    let p = pid && Store.get(pid);
    if (p) {
      Store.updateAnswers(p.id, answers, "them");
      Store.setActive(p.id);
    } else {
      p = Store.create(answers, { by: "them", id: pid || undefined });
    }
    resetDeck();
    toast(`${answers.name}'s answers are in ✨`);
    if (!Store.me()) startQuiz({ mode: "me", after: "main" });
    else if (!p.place) startLocation(p.id);
    else showMain("discover");
  }

  // Your side: collect answers from anyone we sent the quiz to. Runs on open, when the
  // app comes back to the front, and every 20 seconds while someone is still pending.
  let checking = false;
  async function checkMailbox() {
    if (checking || document.visibilityState === "hidden") return;
    const waiting = Store.awaiting();
    if (!waiting.length) return;
    checking = true;
    try {
      for (const p of waiting) {
        const got = await Invite.mailbox.collect(p.inviteToken);
        if (!got) continue;
        Store.updateAnswers(p.id, got.answers, "them");
        Invite.mailbox.clear(p.inviteToken);
        toast(`✨ ${got.answers.name} answered! Ideas now fit you both`);
        if (Store.active() && Store.active().id === p.id) {
          resetDeck();
          if (!$("#screen-main").hidden) { rebuildDeck(); renderStatus(); }
        }
        if (!$("#screen-main").hidden && S.tab === "people") renderPeople();
      }
    } finally { checking = false; }
  }
  document.addEventListener("visibilitychange", checkMailbox);
  setInterval(checkMailbox, 20000);

  function pasteAnswers() {
    const text = prompt("Paste the link they sent you:");
    if (!text) return;
    const got = Invite.parse(text);
    if (!got) { toast("That doesn't look like a Date Me link"); return; }
    if (got.type === "answers") showImport(got);
    else showInvite(got);
  }

  // Links open the app with #invite=... or #answers=...; handle once, then tidy the address bar.
  function handleHash() {
    const got = Invite.parse(location.hash);
    if (!got) return false;
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* ignore */ }
    if (got.type === "invite") showInvite(got);
    else showImport(got);
    return true;
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

  // "Get the kit" / "Book it" / "Find tickets" buttons (see shop.js).
  function shopHTML(idea) {
    const p = Store.active();
    const links = Shop.linksFor(idea, p && p.place);
    if (!links.length) return "";
    return `<div class="shop">${links.map((l) => `<a class="shop-btn" href="${esc(l.url)}" target="_blank" rel="noopener sponsored">${l.icon} ${esc(l.label)}</a>`).join("")}</div>`;
  }

  // ---------- real spots near you ----------
  const spotLink = (sp) => `<a href="${esc(sp.url)}" target="_blank" rel="noopener">${esc(sp.name)}</a> · ${esc(sp.dist)}`;

  function spotLine(idea) {
    if (idea.place) return `<div class="place-line">📍 ${idea.place.url ? `<a href="${esc(idea.place.url)}" target="_blank" rel="noopener">${esc(idea.place.name)}</a>` : esc(idea.place.name)}</div>`;
    const p = Store.active();
    const kind = Spots.kindFor(idea);
    if (!p) return "";
    if (Shop.EVENTS[idea.id]) return findLine(idea); // the event's page, not the building it's held in
    const list = kind && p.place ? Spots.forIdea(idea, p.place) : null;
    if (list && list.length) return `<div class="place-line">📍 ${spotLink(list[0])}${list.length > 1 ? ` <small>+${list.length - 1} more</small>` : ""}</div>`;
    return findLine(idea);
  }

  // "📍 Find goat yoga near you" -> Google Maps around their location.
  function findLine(idea) {
    const p = Store.active();
    const near = Shop.nearby(idea, p && p.place);
    if (!near) return "";
    const text = near.event ? `📅 <a href="${esc(near.url)}" target="_blank" rel="noopener">Find the next ${esc(near.label)} near you</a>` : `📍 <a href="${esc(near.url)}" target="_blank" rel="noopener">Find ${esc(near.label)} near you</a>`;
    return `<div class="place-line">${text}</div>`;
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
    swipeHint();
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
    } else {
      Store.skipIdea(p.id, entry.idea.id);
    }
    renderDeck();
    renderStatus();
    hintsAfterSwipe(dir);
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
    if (!p.answers) pills.push(`<button class="pill hot" data-act="tab" data-tab="people">⏳ Waiting on ${esc(p.name)}</button>`);
    pills.push(`<span class="pill">${SEASON_PILL[ctx.season]}</span>`);
    const f = p.filters, bits = [];
    bits.push(f.budget === 0 ? "Free" : "Up to " + Engine.fmtCost(f.budget));
    if (f.io !== "any") bits.push(f.io === "in" ? "Indoor" : "Outdoor");
    if (f.time !== "any") bits.push(TIME_LABEL[f.time]);
    if (f.dist < 3) bits.push(DIST_LABEL[f.dist]);
    pills.push(`<button class="pill" data-act="open-filters">⚙️ ${bits.join(" · ")}</button>`);
    pills.push(`<span class="pill">${S.deck.length} left</span>`);
    pills.push(`<button class="pill" data-act="how-it-works">❓ How it works</button>`);
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
    else if (Shop.EVENTS[i.id]) spotsHTML = findLine(i);
    else if (list && list.length) spotsHTML = `<div class="spot-list"><b>Near you</b>${list.map((sp) => `<div>📍 ${spotLink(sp)}</div>`).join("")}</div>${findLine(i).replace("Find ", "Find more ")}`;
    else {
      spotsHTML = findLine(i);
      if (kind && p.place && !list && !S.spotTried.has(kind)) requestSpot(kind);
    }
    $("#idea-box").dataset.id = i.id;
    $("#idea-box").dataset.kind = kind || "";
    $("#idea-box").innerHTML = `
      <button class="icon-btn close" data-act="close-idea" aria-label="Close">✕</button>
      <div class="art cat-${esc(i.cat)}"><div class="em">${esc(i.e)}</div></div>
      <div class="body"><h3>${esc(i.t)}</h3><p>${esc(i.d)}</p>
        <div class="meta"><span>💲 ${Engine.fmtCost(i.c)}</span><span>⏱ ${Engine.fmtTime(i.m)}</span><span>${Engine.ioLabel(i.io)}</span></div>${spotsHTML}${shopHTML(i)}</div>
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
      $("#spin-result").innerHTML = `<h4>${esc(w.e)} ${esc(w.t)}</h4><p>${esc(w.d)}</p>${shopHTML(w)}`;
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
  const QUIZ_COUNT_NOTE = null; // (quiz length is computed per voice)
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
    const both = Store.me() && p.answers;
    $("#ai-sub").textContent = `The AI looks at ${both ? "both your answers" : p.answers ? p.name + "'s answers" : "your answers"}${p.place ? ", what's around " + p.place.label.split(",")[0] : ""}, the season and the weather, then writes 5 ideas ${both ? "you'll both love" : "just for " + (p.answers ? "them" : "you two")}.`;
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
    const me = Store.me();
    const meAge = Engine.ageOf(me);
    const meCard = me
      ? `<div class="p-card me">
          <div class="p-top">
            <div class="avatar me">${esc((me.name || "Y").charAt(0).toUpperCase())}</div>
            <div><b>${esc(me.name || "You")} <span class="you-tag">You</span></b><small>${meAge != null ? meAge + " · " : ""}${me.interests.length ? "into " + esc(me.interests.slice(0, 3).join(", ")) : "your answers"}</small></div>
          </div>
          <div class="p-btns"><button data-act="edit-me">✏️ Redo my quiz</button></div>
        </div>`
      : `<div class="p-card me"><div class="p-top"><div class="avatar me">?</div><div><b>You</b><small>Answer a few questions so ideas fit you both</small></div></div>
          <div class="p-btns"><button class="go" data-act="edit-me">✨ Tell us about you</button></div></div>`;
    const status = (p) => !p.answers ? "⏳ Waiting on their answers" : p.answeredBy === "them" ? `✓ Answered by ${esc(p.name)}` : "✍️ You answered for them";
    $("#people-list").innerHTML = meCard + Store.all().map((p) => {
      const age = Engine.ageOf(p.answers);
      const where = p.place ? `📍 ${esc(p.place.label)}` : "📍 No location";
      const isOn = active && active.id === p.id;
      return `<div class="p-card ${isOn ? "active" : ""}">
        <div class="p-top">
          <div class="avatar">${esc((p.name || "?").charAt(0).toUpperCase())}</div>
          <div><b>${esc(p.name)}</b><small>${age != null ? age + " · " : ""}${where} · ♥ ${p.saved.length}</small><small class="p-status">${status(p)}</small></div>
          ${isOn ? `<span class="tag-on">Planning for</span>` : ""}
        </div>
        <div class="p-btns">
          ${isOn ? "" : `<button class="go" data-act="switch" data-id="${p.id}">Plan for ${esc(p.name)}</button>`}
          ${p.answeredBy === "them" ? "" : `<button data-act="resend" data-id="${p.id}">💌 ${p.invitedAt ? "Resend" : "Send them"} the quiz</button>`}
          <button data-act="${p.answers ? "edit" : "answer-for"}" data-id="${p.id}">✍️ ${p.answers ? "Edit answers" : "Answer for them"}</button>
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
      if (!Store.active()) { if (Store.me()) showWho(); else show("welcome"); return; }
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
    const near = Shop.nearby(i, p.place);
    const where = list && list.length && !Shop.EVENTS[i.id] ? `\n📍 ${list[0].name} (${list[0].dist})\n${list[0].url}` : near && near.event ? `\n📅 ${near.url}` : "";
    shareText(`${i.e} Date idea: ${i.t}\n${i.d}\n${Engine.fmtCost(i.c)} · ${Engine.fmtTime(i.m)}${where}\n\nWant to? 💘\n\n(found on Date Me: ${appUrl()})`);
  }

  function shareApp() {
    shareText(`Date Me 💘 Swipe right on date ideas, not people. It plans dates you'll both love.\n${appUrl()}\n\nOpen it on your phone, then Share → Add to Home Screen so it opens like an app.`);
  }

  // ---------- share screen: QR, link, send to a friend, add to home screen ----------
  let installPrompt = null; // Android's one-tap install, if the browser offers it
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installPrompt = e; });
  const isInstalled = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  function openShare() {
    $("#share-url").textContent = appUrl().replace(/^https?:\/\//, "");
    const box = $("#install-box");
    if (isInstalled()) box.innerHTML = `<p class="install-ok">✓ You're using the home-screen app</p>`;
    else if (installPrompt) box.innerHTML = `<button class="btn-outline" data-act="install">📲 Add to my home screen</button>`;
    else if (isIOS()) box.innerHTML = `<p class="install-how"><b>📲 Put it on your home screen:</b> tap <b>Share</b> <span class="ios-share">⬆︎</span> at the bottom of Safari, then <b>Add to Home Screen</b>.</p>`;
    else box.innerHTML = `<p class="install-how"><b>📲 Put it on your home screen:</b> open your browser's menu <b>⋮</b>, then <b>Add to Home screen</b>.</p>`;
    $("#modal-share").hidden = false;
  }

  async function installApp() {
    if (!installPrompt) return;
    installPrompt.prompt();
    try { await installPrompt.userChoice; } catch (e) { /* closed */ }
    installPrompt = null;
    openShare();
  }

  // A button that says "Copied!" for a moment. Remembers its real label once,
  // so a second tap during the flash doesn't make "Copied!" stick.
  const flashTimers = new WeakMap();
  function flash(btn, text) {
    if (!btn.dataset.label) btn.dataset.label = btn.textContent;
    btn.textContent = text;
    clearTimeout(flashTimers.get(btn));
    flashTimers.set(btn, setTimeout(() => { btn.textContent = btn.dataset.label; }, 1600));
  }

  async function copyLink(btn) {
    try { await navigator.clipboard.writeText(appUrl()); flash(btn, "Copied!"); }
    catch (e) { prompt("Copy this link:", appUrl()); }
  }

  // ======================================================================
  //  UPDATES — compare our version with the live js/version.js
  // ======================================================================
  const VERSION = window.DateMe.VERSION || "?";
  let newVersion = null, ribbonDismissed = false, lastCheck = 0;

  const newer = (a, b) => {
    const x = String(a).split(".").map(Number), y = String(b).split(".").map(Number);
    for (let i = 0; i < Math.max(x.length, y.length); i++) {
      if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
    }
    return false;
  };

  async function liveVersion() {
    try {
      const r = await fetch(`js/version.js?ts=${Date.now()}`, { cache: "no-store" });
      const m = (await r.text()).match(/VERSION\s*=\s*"([^"]+)"/);
      return m ? m[1] : null;
    } catch (e) { return null; }
  }

  async function checkUpdate(manual) {
    if (!manual && (document.visibilityState === "hidden" || Date.now() - lastCheck < 60000)) return;
    lastCheck = Date.now();
    const v = await liveVersion();
    if (v && newer(v, VERSION)) {
      newVersion = v;
      if (manual || !ribbonDismissed) $("#update-ribbon").hidden = false;
      if (manual) toast(`Version ${v} is ready. Tap Update at the top`);
    } else if (manual) {
      toast(v ? `You're up to date (v${VERSION}) ✓` : "Couldn't check right now. Try again in a bit");
    }
  }

  // Refresh every file in the browser's cache, then reload, so the new version loads in one tap.
  async function doUpdate(btn) {
    if (btn) btn.textContent = "Updating…";
    const files = [...new Set(["./", "index.html", "css/style.css", "manifest.json", "qr.png",
      ...$$("script[src]").map((s) => s.getAttribute("src")).filter((src) => !/^https?:/.test(src))])];
    await Promise.all(files.map((f) => fetch(f, { cache: "reload" }).catch(() => {})));
    try { localStorage.setItem("dateme:updatedFrom", VERSION); } catch (e) { /* fine */ }
    location.reload();
  }

  function showVersion() {
    $("#ver-top").textContent = `v${VERSION}`;
    $("#ver-people").textContent = `Date Me v${VERSION}`;
    $("#ver-share").textContent = `Date Me v${VERSION}`;
    let from = null;
    try { from = localStorage.getItem("dateme:updatedFrom"); localStorage.removeItem("dateme:updatedFrom"); } catch (e) { /* fine */ }
    if (from && from !== VERSION) setTimeout(() => toast(`✨ Updated to v${VERSION}`), 600);
  }

  document.addEventListener("visibilitychange", () => checkUpdate(false));
  setInterval(() => checkUpdate(false), 5 * 60 * 1000);
  setTimeout(() => checkUpdate(false), 4000);

  // ======================================================================
  //  RAILS — first-open intro slides + one-time hints that walk you through
  // ======================================================================
  function showIntro(replay) {
    S.introReplay = !!replay;
    show("welcome");
    const el = $("#slides");
    el.scrollLeft = 0;
    introAt(0);
  }

  function introIndex() { const el = $("#slides"); return Math.round(el.scrollLeft / Math.max(1, el.clientWidth)); }

  function introAt(i) {
    const n = $$("#slides .slide").length;
    $$("#dots i").forEach((d, k) => d.classList.toggle("on", k === i));
    const last = i >= n - 1;
    $("#intro-next").textContent = last ? (S.introReplay ? "Got it" : "Let's go") : "Next";
    $(".intro-skip").style.visibility = last ? "hidden" : "visible";
  }

  function introNext() {
    const el = $("#slides");
    const i = introIndex(), n = $$("#slides .slide").length;
    if (i < n - 1) el.scrollTo({ left: (i + 1) * el.clientWidth, behavior: "smooth" });
    else finishIntro();
  }

  function finishIntro() {
    if (S.introReplay && Store.active()) showMain("discover");
    else if (Store.me()) showWho();
    else startQuiz({ mode: "me" });
  }

  $("#slides").addEventListener("scroll", () => introAt(introIndex()), { passive: true });

  // One-time hints. Each shows once, then never again (until "How it works" resets them).
  const HINTS = ["swipe", "saved", "send", "spin", "ai"];
  const seen = (id) => { try { return localStorage.getItem("dateme:hint:" + id) === "1"; } catch (e) { return true; } };
  const markSeen = (id) => { try { localStorage.setItem("dateme:hint:" + id, "1"); } catch (e) { /* fine */ } };
  let coachId = null, coachTimer = null;

  // A speech bubble pointing at an element. place: "above" | "below"
  function coach(id, target, text, place = "above") {
    if (seen(id) || !target || coachId) return;
    const app = $("#app").getBoundingClientRect(), r = target.getBoundingClientRect();
    if (!r.width) return;
    const box = $("#coach");
    $("#coach-text").textContent = text;
    box.className = `coach ${place}`;
    box.hidden = false;
    const w = box.offsetWidth, h = box.offsetHeight;
    const cx = r.left + r.width / 2 - app.left;
    const left = Math.max(10, Math.min(app.width - w - 10, cx - w / 2));
    box.style.left = left + "px";
    box.style.top = (place === "above" ? r.top - app.top - h - 12 : r.bottom - app.top + 12) + "px";
    box.style.setProperty("--arrow", Math.max(18, Math.min(w - 18, cx - left)) + "px");
    target.classList.add("coach-pulse");
    coachId = id;
    clearTimeout(coachTimer);
    coachTimer = setTimeout(() => endCoach(id), 7000);
  }

  function endCoach(id) {
    if (id && coachId !== id) { if (id) markSeen(id); return; }
    if (coachId) markSeen(coachId);
    coachId = null;
    clearTimeout(coachTimer);
    $("#coach").hidden = true;
    $$(".coach-pulse").forEach((x) => x.classList.remove("coach-pulse"));
  }

  // The swipe hint: an animated hand over the first card.
  function swipeHint() {
    const deck = $("#deck");
    const has = deck.querySelector(".swipe-hint");
    if (seen("swipe") || !S.deck.length || $("#screen-main").hidden || S.tab !== "discover") { if (has) has.remove(); return; }
    if (!has) deck.insertAdjacentHTML("beforeend", `<div class="swipe-hint" aria-hidden="true"><div class="hand">👆</div><div class="swipe-label"><span>✕ skip</span><span>save ♥</span></div></div>`);
  }

  function hintsAfterSwipe(dir) {
    if (!seen("swipe")) { markSeen("swipe"); const h = $("#deck .swipe-hint"); if (h) h.remove(); }
    const p = Store.active();
    S.swipes = (S.swipes || 0) + 1;
    setTimeout(() => {
      if (dir > 0 && p.saved.length >= 1 && !seen("saved")) coach("saved", $('.tabbar [data-tab="saved"]'), "Saved! Your picks live here ♥", "above");
      else if (p.saved.length >= 3 && !seen("spin")) coach("spin", $('#deck-actions [data-act="open-spin"]'), "Can't decide? Spin 🎲", "above");
      else if (S.swipes >= 8 && !seen("ai")) coach("ai", $("#status-row .pill.ai"), "✨ Want ideas made just for you two?", "below");
    }, 450);
  }

  function hintsOnSaved() {
    const p = Store.active();
    if (p && p.saved.length && !seen("send")) setTimeout(() => coach("send", $("#saved-list .s-item"), "Tap one to send it to them 💌", "below"), 250);
  }

  function howItWorks() {
    HINTS.forEach((id) => { try { localStorage.removeItem("dateme:hint:" + id); } catch (e) { /* fine */ } });
    S.swipes = 0;
    showIntro(true);
  }

  // ======================================================================
  //  SHELL
  // ======================================================================
  function show(name) {
    ["welcome", "quiz", "location", "main", "who", "invite", "sent", "import", "meintro"].forEach((s) => { $("#screen-" + s).hidden = s !== name; });
    if (name !== "main" && typeof endCoach === "function" && coachId) { $("#coach").hidden = true; coachId = null; $$(".coach-pulse").forEach((x) => x.classList.remove("coach-pulse")); }
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
    if (tab === "saved") { renderSaved(); hintsOnSaved(); }
    if (tab === "people") renderPeople();
    if (tab === "discover") setTimeout(swipeHint, 50);
    if (coachId && !(coachId === "saved" && tab === "saved")) endCoach();
    else if (coachId === "saved" && tab === "saved") endCoach("saved");
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
      case "start-quiz": startQuiz({ mode: "me" }); break;
      case "intro-next": introNext(); break;
      case "intro-skip": finishIntro(); break;
      case "how-it-works": howItWorks(); break;
      case "coach-ok": endCoach(); break;
      case "edit-me": startQuiz({ mode: "me", after: "main" }); break;
      case "meintro-go": startQuiz({ mode: "me", after: "main" }); break;
      case "meintro-later": showMain("discover"); break;
      case "who-answer": startQuiz({ mode: "them" }); break;
      case "who-send-open": $("#who-choices").hidden = true; $("#who-send").hidden = false; setTimeout(() => $("#who-name-input").focus(), 50); break;
      case "who-send": whoSend(); break;
      case "who-back": if (Store.active()) showMain(); break;
      case "invite-start": startQuiz({ mode: "self", from: S.invite.from, to: S.invite.to, pid: S.invite.pid }); break;
      case "invite-own": S.invite = null; if (Store.active()) showMain(); else if (Store.me()) showWho(); else show("welcome"); break;
      case "sent-send": sentSend(); break;
      case "sent-copy": sentCopy(); break;
      case "sent-own": sentOwn(); break;
      case "import-go": importGo(); break;
      case "import-cancel": S.importing = null; if (Store.active()) showMain(); else show("welcome"); break;
      case "paste-answers": pasteAnswers(); break;
      case "resend": { const rp = Store.get(id); if (rp) sendQuiz(rp.id, rp.name).then(() => renderPeople()); break; }
      case "answer-for": startQuiz({ mode: "them", pendingId: id }); break;
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
      case "open-spin": if (coachId === "spin") endCoach(); openSpin(); break;
      case "close-spin": $("#modal-spin").hidden = true; break;
      case "spin": doSpin(); break;
      case "share-winner": shareIdea(el.dataset.id); break;
      case "open-idea": if (coachId === "send") endCoach(); markSeen("send"); openIdea(id); break;
      case "close-idea": $("#modal-idea").hidden = true; break;
      case "unsave":
        e.stopPropagation();
        if (el.dataset.close) $("#modal-idea").hidden = true;
        unsave(id);
        break;
      case "share-idea": shareIdea(id); break;
      case "share-app": shareApp(); break;
      case "open-share": openShare(); break;
      case "close-share": $("#modal-share").hidden = true; break;
      case "copy-link": copyLink(el); break;
      case "install": installApp(); break;
      case "check-update": checkUpdate(true); break;
      case "do-update": doUpdate(el); break;
      case "dismiss-update": ribbonDismissed = true; $("#update-ribbon").hidden = true; break;
      case "new-person": showWho(); break;
      case "switch": Store.setActive(id); resetDeck(); showMain("discover"); break;
      case "edit": startQuiz({ mode: "them", editId: id }); break;
      case "change-loc": startLocation(id || Store.active().id); break;
      case "unskip": Store.clearSkipped(id); if (Store.active().id === id) { S.history = []; rebuildDeck(); } renderPeople(); toast("Skipped ideas are back in the deck"); break;
      case "unskip-all": Store.clearSkipped(Store.active().id); S.history = []; rebuildDeck(); break;
      case "delete": armDelete(el, id); break;
      case "open-ai": if (coachId === "ai") endCoach(); openAI(); break;
      case "close-ai": $("#sheet-ai").hidden = true; break;
      case "close-sheet": { const ov = el.closest(".overlay"); if (ov && !(ov.id === "sheet-ai" && S.ai)) ov.hidden = true; break; }
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

  $("#who-name-input").addEventListener("keydown", (e) => { if (e.key === "Enter") whoSend(); });

  $("#loc-form").addEventListener("submit", (e) => { e.preventDefault(); $("#loc-input").blur(); locSearch($("#loc-input").value); });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const open = $$(".overlay").find((o) => !o.hidden && !(o.id === "sheet-ai" && S.ai) && !(o.id === "modal-spin" && S.spin && S.spin.spinning));
      if (open) { open.hidden = true; return; }
    }
    if ($("#screen-main").hidden || S.tab !== "discover" || !$$(".overlay").every((o) => o.hidden)) return;
    if (e.key === "ArrowRight") swipe(1);
    else if (e.key === "ArrowLeft") swipe(-1);
    else if (e.key === "Backspace" || (e.key === "z" && (e.ctrlKey || e.metaKey))) undo();
  });

  // ---------- boot ----------
  Store.load();
  showVersion();
  window.addEventListener("hashchange", handleHash);
  if (!handleHash()) {
    if (Store.active() && !Store.me()) show("meintro");      // older profiles: ask about "you" once
    else if (Store.active()) showMain("discover");
    else if (Store.me()) showWho();
    else showIntro(false);
  }
  checkMailbox();
})();
