# GlassChat Design Checklist

Legend: `[ ]` To Do `[x]` Done `[-]` Not Planned

---

## 1. Visual Design & Theming

- [ ] Density presets: add "Cozy / Compact" spacing toggle (like Slack & Gmail)
- [ ] Performance theme: solid-surface fallback when blur is expensive
- [ ] Clear typography ladder for panel headers vs. chat text

## 2. Information Architecture

- [ ] Merge Collaboration & Memory drawers into a single **Insights** drawer with tabs
- [ ] Quick-Share: 1-click share link for current chat (temporary, read-only)
- [ ] Prompt Templates: allow starring any message & reuse via pills under the input

## 3. Micro-Interactions

- [x] Model picker tooltip with model description & cost (already live)
- [ ] "Jump to latest ↓" pill when user scrolls away during AI response
- [x] Toast on LLM call failure with "Retry" (implemented via ChatInput error handling)

## 4. Feature Opportunities

- [ ] Memory → bulk-edit (multi-select & delete)
- [ ] Presence avatar stack in header showing viewers (collaboration)
- [ ] Comment thread on specific assistant message (keeps main chat linear)

## 5. Onboarding & Discoverability

- [ ] First-time overlay tour (3-4 steps)
- [ ] "What's New" modal / changelog after deploys

## 6. Performance & Accessibility

- [ ] Respect `prefers-reduced-motion` (fade only)
- [ ] Keyboard navigation audit / visible focus ring everywhere

---

### How to Use

1. Check an item once shipped to **main**.
2. Add notes or PR links beside the item if helpful.
3. Feel free to reorder or prune items as the project evolves.
