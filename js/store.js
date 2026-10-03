/* Date Me — everything saved on this phone (localStorage).
 *
 * Shape:
 *   { version: 1, me: { answers, at }, activeId, profiles: { [id]: Profile } }
 *   me      = the person using the app (their own quiz, including their date budget)
 *   Profile = someone they're dating:
 *             { id, name, answers (null while we wait for them), answeredBy: "me" | "them",
 *               invitedAt, place, saved: [{ id, at, idea }], skipped: [ideaId], filters, aiIdeas, createdAt }
 *
 * Saved ideas keep a full copy of the idea, so an idea from a future places/AI
 * source (or one later removed from the library) still shows up in the list.
 */
(function () {
  const DM = (window.DateMe = window.DateMe || {});
  const KEY = "dateme:v1";

  let state = { version: 1, activeId: null, profiles: {} };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.profiles) state = parsed;
      }
    } catch (e) { /* private mode or corrupt data: start fresh */ }
    if (state.activeId && !state.profiles[state.activeId]) state.activeId = null;
    if (!state.activeId) state.activeId = Object.keys(state.profiles)[0] || null;
    return state;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* full or blocked */ }
  }

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // The budget is the planner's own, so it comes from "me" (older profiles carried it themselves).
  function defaultFilters(answers) {
    const mine = state.me && state.me.answers && state.me.answers.budget;
    const budget = mine != null ? mine : answers && answers.budget != null ? answers.budget : 3;
    return { budget, io: "any", time: "any", dist: 3 };
  }

  const Store = {
    load,
    save,
    all: () => Object.values(state.profiles).sort((a, b) => a.createdAt - b.createdAt),
    get: (id) => state.profiles[id] || null,
    active: () => state.profiles[state.activeId] || null,
    setActive(id) { if (state.profiles[id]) { state.activeId = id; save(); } },

    me: () => (state.me ? state.me.answers : null),
    setMe(answers) {
      const old = state.me && state.me.answers;
      state.me = { answers, at: Date.now() };
      if (!old || old.budget !== answers.budget) {
        Object.values(state.profiles).forEach((p) => { if (answers.budget != null) p.filters.budget = answers.budget; });
      }
      save();
    },

    // answers may be null: someone we sent the quiz to and are waiting on.
    create(answers, opts = {}) {
      const p = {
        id: opts.id || uid(), name: (answers && answers.name) || opts.name || "Them", answers,
        answeredBy: answers ? opts.by || "me" : null, invitedAt: opts.invited ? Date.now() : null, place: null,
        saved: [], skipped: [], filters: defaultFilters(answers), createdAt: Date.now(),
      };
      state.profiles[p.id] = p;
      state.activeId = p.id;
      save();
      return p;
    },

    updateAnswers(id, answers, by = "me") {
      const p = state.profiles[id];
      if (!p) return;
      p.answers = answers;
      p.name = answers.name || p.name;
      p.answeredBy = by;
      save();
    },
    markInvited(id) { const p = state.profiles[id]; if (p) { p.invitedAt = Date.now(); save(); } },

    setPlace(id, place) { const p = state.profiles[id]; if (p) { p.place = place; save(); } },
    setFilters(id, filters) { const p = state.profiles[id]; if (p) { p.filters = filters; save(); } },
    defaultFilters,

    remove(id) {
      delete state.profiles[id];
      if (state.activeId === id) state.activeId = Object.keys(state.profiles)[0] || null;
      save();
    },

    saveIdea(id, idea) {
      const p = state.profiles[id];
      if (!p || p.saved.some((s) => s.id === idea.id)) return;
      p.saved.unshift({ id: idea.id, at: Date.now(), idea: Store.snapshot(idea) });
      p.skipped = p.skipped.filter((x) => x !== idea.id);
      save();
    },
    unsaveIdea(id, ideaId) {
      const p = state.profiles[id];
      if (!p) return;
      p.saved = p.saved.filter((s) => s.id !== ideaId);
      save();
    },
    skipIdea(id, ideaId) {
      const p = state.profiles[id];
      if (!p || p.skipped.includes(ideaId)) return;
      p.skipped.push(ideaId);
      save();
    },
    unskipIdea(id, ideaId) {
      const p = state.profiles[id];
      if (!p) return;
      p.skipped = p.skipped.filter((x) => x !== ideaId);
      save();
    },
    clearSkipped(id) { const p = state.profiles[id]; if (p) { p.skipped = []; save(); } },

    // Ideas the AI planner wrote for this person (newest first, last 40 kept).
    addAiIdeas(id, ideas) {
      const p = state.profiles[id];
      if (!p) return;
      p.aiIdeas = [...ideas, ...(p.aiIdeas || [])].slice(0, 40);
      save();
    },

    // Only what the saved list needs to draw a card.
    snapshot(idea) {
      const { id, t, e, cat, d, c, m, io, place, spot, kit, tr, source } = idea;
      return { id, t, e, cat, d, c, m, io, tr: tr != null ? tr : 1, source: source || null, place: place || null, spot: spot || null, kit: kit || null };
    },
  };

  DM.Store = Store;
})();
