/* Date Me — everything saved on this phone (localStorage).
 *
 * Shape:
 *   { version: 1, activeId, profiles: { [id]: Profile } }
 *   Profile = { id, name, answers, place, saved: [{ id, at, idea }], skipped: [ideaId], filters, createdAt }
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

  function defaultFilters(answers) {
    return { budget: answers && answers.budget != null ? answers.budget : 3, io: "any", time: "any", dist: 3 };
  }

  const Store = {
    load,
    save,
    all: () => Object.values(state.profiles).sort((a, b) => a.createdAt - b.createdAt),
    get: (id) => state.profiles[id] || null,
    active: () => state.profiles[state.activeId] || null,
    setActive(id) { if (state.profiles[id]) { state.activeId = id; save(); } },

    create(answers) {
      const p = {
        id: uid(), name: answers.name, answers, place: null,
        saved: [], skipped: [], filters: defaultFilters(answers), createdAt: Date.now(),
      };
      state.profiles[p.id] = p;
      state.activeId = p.id;
      save();
      return p;
    },

    updateAnswers(id, answers) {
      const p = state.profiles[id];
      if (!p) return;
      const budgetChanged = p.answers.budget !== answers.budget;
      p.answers = answers;
      p.name = answers.name;
      if (budgetChanged) p.filters.budget = answers.budget;
      save();
    },

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

    // Only what the saved list needs to draw a card.
    snapshot(idea) {
      const { id, t, e, cat, d, c, m, io, place, spot } = idea;
      return { id, t, e, cat, d, c, m, io, place: place || null, spot: spot || null };
    },
  };

  DM.Store = Store;
})();
