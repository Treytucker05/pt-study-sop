# Findings

## Repo reality on 2026-03-13

- The on-disk Tutor page is still wizard-first.
- `dashboard_rebuild/client/src/pages/tutor.tsx` mounts `TutorWizard` and toggles between setup and chat.
- `dashboard_rebuild/client/src/pages/library.tsx` was opening bare `/tutor` without authoritative course launch context.
- The repo did not contain the expected durable Tutor shell realignment track from the earlier handoff.
- The repo also does not yet contain the later shell-mode files that existed in prior planning context.

## Main problems to fix

- Startup authority was leaking through global localStorage.
- Library launch was ambiguous when Tutor-selected materials spanned courses.
- `tutor.wizard.progress.v1` and `tutor.wizard.state.v1` were still shaping startup behavior.
- Vault folder persistence could override current launch context.
- The durable plan for this cleanup was missing from the repo.
