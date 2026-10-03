// Headless check of the idea engine: node tests/engine-test.js
const fs = require("fs"), vm = require("vm"), path = require("path");
const ctx = { window: {}, console, setTimeout, Promise, URL };
ctx.window = ctx; vm.createContext(ctx);
for (const f of ["engine.js", "spots.js", "ideas.js", "shop.js"]) vm.runInContext(fs.readFileSync(path.join(__dirname, "../js", f), "utf8"), ctx);
const { Engine, IDEAS } = ctx.DateMe;
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? "  ok  " : "  FAIL") + "  " + msg); if (!cond) fails++; };

const base = { name: "Sam", outdoorsy: 5, outAbout: 5, adventure: 5, active: 5, crowds: 5, budget: 3, foodie: 5, dislikes: [], interests: [], love: "time" };
const prof = (a, place = null, filters = { budget: 3, io: "any", time: "any", dist: 3 }) =>
  ({ id: "p1", answers: { ...base, ...a }, place, saved: [], skipped: [], filters });
const bday = (age) => { const d = new Date(); d.setFullYear(d.getFullYear() - age); d.setDate(d.getDate() - 2); return d.toISOString().slice(0, 10); };

(async () => {
  const all = await Engine.gather({});
  ok(IDEAS.length >= 150, `library has ${IDEAS.length} ideas (need 150+)`);
  ok(new Set(all.map((i) => i.id)).size === IDEAS.length, "every idea has a unique id");
  const bad = all.filter((i) => !i.t || !i.e || !i.d || !(i.c >= 0 && i.c <= 3) || !["in", "out", "mix"].includes(i.io) || !/^[maen]+$/.test(i.w));
  ok(bad.length === 0, "every idea has title/emoji/desc/cost/io/times" + (bad.length ? ": " + bad.map((b) => b.t).join(", ") : ""));
  const knownInt = new Set(["artsy","sporty","nerdy","musical","outdoorsy","gamer","animals","cars","books","fashion","cooking","theater"]);
  ok(all.every((i) => i.int.every((t) => knownInt.has(t))), "every interest tag is one the quiz offers");
  const knownNeeds = new Set(["lake", "coast", "beach", "mountains", "trails", "river", "hotspring", "ski", "snow", "city"]);
  ok(all.every((i) => i.need.every((n) => knownNeeds.has(n))), "every 'need' is a known place feature");

  const { Spots } = ctx.DateMe;
  const ids = new Set(all.map((i) => i.id));
  const badLinks = Object.keys(Spots.IDEA_KIND).filter((id) => !ids.has(id));
  ok(badLinks.length === 0, "every real-place link points at a real idea" + (badLinks.length ? ": " + badLinks.join(", ") : ""));
  ok(Object.values(Spots.IDEA_KIND).every((k) => Spots.KINDS[k]), "every real-place link uses a known kind of place");
  console.log(`  (${Object.keys(Spots.IDEA_KIND).length} ideas can show a real nearby spot)`);
  const fakePlace = { lat: 40.76, lon: -111.89, cc: "US", spots: { bowling: [{ n: "Fat Cats", lat: 40.75, lon: -111.9, d: 3400 }], escape: [] }, spotsAt: { bowling: Date.now(), escape: Date.now() } };
  const fs1 = Spots.forIdea({ id: "glow-bowling" }, fakePlace);
  ok(fs1 && fs1[0].name === "Fat Cats" && fs1[0].dist === "2.1 mi", "bowling card shows 'Fat Cats · 2.1 mi'");
  ok(Spots.noneNearby({ id: "escape-room" }, fakePlace), "an empty lookup counts as 'none nearby'");

  const { Shop } = ctx.DateMe;
  const shopIds = [...Object.keys(Shop.KIT), ...Object.keys(Shop.BOOK), ...Object.keys(Shop.TICKETS)];
  const badShop = shopIds.filter((id) => !ids.has(id));
  ok(badShop.length === 0, "every shop link points at a real idea" + (badShop.length ? ": " + badShop.join(", ") : ""));
  console.log(`  (${new Set(shopIds).size} ideas have a kit, booking or ticket button)`);
  const goat = all.find((i) => i.id === "goat-yoga");
  const near = Shop.nearby(goat, { label: "Salt Lake City, UT" });
  ok(near && near.url === "https://www.google.com/maps/search/goat%20yoga%20near%20Salt%20Lake%20City%2C%20UT", "goat yoga card says where: Google Maps near Salt Lake");
  const outings = all.filter((i) => i.tr >= 1 && i.source === "library");
  const noWhere = outings.filter((i) => !Shop.nearby(i, null));
  ok(noWhere.length <= 12, `almost every outing card says where to go (${outings.length - noWhere.length}/${outings.length})`);
  ok(!Shop.nearby(all.find((i) => i.id === "blanket-fort-movie-marathon"), null), "at-home ideas don't get a map link");
  const kitLink = Shop.linksFor({ id: "tie-dye-shirts" }, null)[0];
  ok(kitLink && kitLink.url.startsWith("https://www.amazon.com/s?k=tie+dye+kit"), "tie-dye card links to an Amazon search for a tie dye kit");

  // Quiz links: what goes out comes back intact, and junk is rejected.
  ctx.location = { origin: "https://dragonpony1.github.io", pathname: "/date-me/" };
  Object.assign(ctx, { btoa, atob, TextEncoder, TextDecoder });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../js/invite.js"), "utf8"), ctx);
  const { Invite } = ctx.DateMe;
  const inv = Invite.parse(Invite.inviteUrl("pid123", "Matt", "Riley"));
  ok(inv && inv.type === "invite" && inv.from === "Matt" && inv.to === "Riley" && inv.pid === "pid123", "invite link carries who sent it and who it's for");
  const theirs = { name: "Riley", birthdate: bday(19), outdoorsy: 3, outAbout: 8, adventure: 6, active: 4, crowds: 7, foodie: 9, dislikes: ["meat"], interests: ["musical", "animals"], love: "touch" };
  const ansUrl = Invite.answersUrl(theirs, "pid123");
  const back = Invite.parse("Riley's answers: " + ansUrl);
  ok(back && back.type === "answers" && back.answers.age === 19 && back.answers.interests.join() === "musical,animals" && back.answers.love === "touch", "answers link round-trips (found inside pasted text too)");
  ok(!ansUrl.includes(theirs.birthdate.slice(0, 4)) && back.answers.birthdate === undefined, "answers link carries age, never the birthday");
  ok(Invite.parse("https://x/#answers=not-real-data") === null, "a broken link is rejected, not half-loaded");
  const both = Engine.score(all.find((i) => i.id === "zoo-day"), Engine.buildContext({ id: "x", answers: { ...base, interests: ["animals"], birthdate: bday(20) }, place: null, saved: [], skipped: [], filters: null }, { me: { ...base, interests: ["animals"], birthdate: bday(25) } }));
  ok(both.why.includes("you both love animals"), "a shared interest shows as 'you both love animals'");
  const ageCtx = Engine.buildContext({ id: "x", answers: { ...base, birthdate: bday(22) }, place: null, saved: [], skipped: [] }, { me: { ...base, birthdate: bday(19) } });
  ok(ageCtx.age === 19, "age rules use the younger of the two");

  const rank = (p, extra) => Engine.rank(all, Engine.buildContext(p, extra));
  const teen = rank(prof({ birthdate: bday(17) }));
  ok(!teen.some((r) => r.idea.age > 17), "17-year-old sees nothing 18+ or 21+");
  const twenty = rank(prof({ birthdate: bday(20) }));
  ok(!twenty.some((r) => r.idea.age >= 21), "20-year-old sees no alcohol ideas");
  const adult = rank(prof({ birthdate: bday(25) }));
  ok(adult.some((r) => r.idea.age === 21) || adult.length > 0, "25-year-old ranks fine");

  const noSushi = rank(prof({ birthdate: bday(22), dislikes: ["sushi", "seafood"] }));
  ok(!noSushi.some((r) => r.idea.fd.includes("sushi")), "sushi haters see no sushi");

  const free = rank(prof({ birthdate: bday(22) }, null, { budget: 0, io: "any", time: "any", dist: 3 }));
  ok(free.length > 20 && free.every((r) => r.idea.c === 0), `free budget gives ${free.length} free ideas`);
  const home = rank(prof({ birthdate: bday(22) }, null, { budget: 3, io: "any", time: "any", dist: 0 }));
  ok(home.length > 15 && home.every((r) => r.idea.tr === 0), `stay-home gives ${home.length} at-home ideas`);

  const noPlace = rank(prof({ birthdate: bday(22) }));
  ok(!noPlace.some((r) => r.idea.need.includes("coast")), "no location: no ocean ideas");
  const beachTown = { lat: 33, lon: -117, features: { coast: true, beach: true, lake: false, mountains: false, city: true, snow: false } };
  const bt = rank(prof({ birthdate: bday(22) }, beachTown));
  ok(bt.some((r) => r.idea.need.includes("coast")), "coastal town: ocean ideas show up");
  ok(!bt.some((r) => r.idea.need.includes("lake")), "town with no lake: no lake ideas");

  const art = rank(prof({ birthdate: bday(22), interests: ["artsy"], adventure: 2, outAbout: 2 }));
  const top10 = art.slice(0, 10).map((r) => r.idea);
  ok(top10.filter((i) => i.int.includes("artsy")).length >= 5, "artsy homebody: most of top 10 are artsy");
  const adv = rank(prof({ birthdate: bday(22), adventure: 10, active: 10, outdoorsy: 10, interests: ["sporty", "outdoorsy"] }, { lat: 40.7, lon: -111.9, features: { mountains: true, trails: true, lake: true, city: true } }));
  ok(adv.slice(0, 10).reduce((s, r) => s + r.idea.adv, 0) / 10 >= 6, "adventurous athlete: top 10 average adventure >= 6");

  console.log("\nTop 8 for an artsy homebody who loves quality time:");
  art.slice(0, 8).forEach((r) => console.log(`  ${r.pct}%  ${r.idea.e} ${r.idea.t}  — ${r.why.join(" · ")}`));
  console.log("\nTop 8 for an adventurous outdoorsy athlete in Salt Lake:");
  adv.slice(0, 8).forEach((r) => console.log(`  ${r.pct}%  ${r.idea.e} ${r.idea.t}  — ${r.why.join(" · ")}`));
  console.log(fails ? `\n${fails} FAILED` : "\nAll checks passed");
  process.exit(fails ? 1 : 0);
})();
