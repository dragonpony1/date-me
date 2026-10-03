/* Date Me — "Send them the quiz" links. No server, no accounts: the data rides in the link.
 *
 *   Invite  : ...date-me/#invite=<code>   { pid, from, to }
 *             You send this. They open it, answer about themselves.
 *   Answers : ...date-me/#answers=<code>  { pid, name, age, sliders, foodie, dislikes, interests, love }
 *             They send this back. You open it (or paste it) and their answers load.
 *
 * The part after # never reaches any server (GitHub Pages doesn't see it).
 * Answers carry their age, never their birthday.
 */
(function () {
  const DM = (window.DateMe = window.DateMe || {});

  const toB64 = (obj) => {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    let bin = "";
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  const fromB64 = (code) => {
    const bin = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
  };

  const base = () => location.origin + location.pathname;

  // Short keys keep the link small.
  function compact(a, pid) {
    return {
      v: 1, p: pid, n: a.name, g: DM.Engine.ageOf(a), o: a.outdoorsy, h: a.outAbout, d: a.adventure,
      c: a.active, q: a.crowds, f: a.foodie, x: a.dislikes || [], i: a.interests || [], l: a.love, t: Date.now(),
    };
  }

  const num = (v, d) => (Number.isFinite(+v) ? Math.max(1, Math.min(10, Math.round(+v))) : d);
  const list = (v, allowed) => (Array.isArray(v) ? v.filter((x) => allowed.includes(x)) : []);
  const FOODS = ["seafood", "sushi", "spicy", "meat", "dairy", "gluten", "sweets", "coffee"];
  const INTERESTS = ["artsy", "sporty", "nerdy", "musical", "outdoorsy", "gamer", "animals", "cars", "books", "fashion", "cooking", "theater"];
  const LOVES = ["time", "words", "gifts", "acts", "touch"];

  // Never trust a link: everything is checked and clamped.
  function expand(c) {
    const age = Number.isFinite(+c.g) ? Math.max(13, Math.min(100, Math.round(+c.g))) : null;
    return {
      pid: String(c.p || "").slice(0, 40),
      answers: {
        name: String(c.n || "").trim().slice(0, 24) || "Them",
        age, ageAt: Number.isFinite(+c.t) ? Math.min(+c.t, Date.now()) : Date.now(),
        outdoorsy: num(c.o, 5), outAbout: num(c.h, 5), adventure: num(c.d, 5), active: num(c.c, 5), crowds: num(c.q, 5),
        foodie: [2, 5, 9].includes(+c.f) ? +c.f : 5,
        dislikes: list(c.x, FOODS), interests: list(c.i, INTERESTS), love: LOVES.includes(c.l) ? c.l : null,
      },
    };
  }

  const inviteUrl = (pid, from, to) =>
    `${base()}#invite=${toB64({ v: 1, p: pid, f: String(from || "").slice(0, 24), o: String(to || "").slice(0, 24) })}`;
  const answersUrl = (answers, pid) => `${base()}#answers=${toB64(compact(answers, pid))}`;

  // Find an invite or answers code in a URL hash or in any pasted text.
  function parse(text) {
    const m = String(text || "").match(/#(invite|answers)=([A-Za-z0-9_-]+)/);
    if (!m) return null;
    try {
      const data = fromB64(m[2]);
      if (m[1] === "invite") return { type: "invite", pid: String(data.p || "").slice(0, 40), from: String(data.f || "").slice(0, 24) || "Someone", to: String(data.o || "").slice(0, 24) };
      return { type: "answers", ...expand(data) };
    } catch (e) {
      return null;
    }
  }

  DM.Invite = { inviteUrl, answersUrl, parse, compact, expand };
})();
