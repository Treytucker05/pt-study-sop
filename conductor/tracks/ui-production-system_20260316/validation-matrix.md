# Validation Matrix: UI Production System

| Surface | Validation | Evidence |
|---|---|---|
| Track docs | `python scripts/check_docs_sync.py` | Docs stay aligned with the active board and track registry |
| Track docs | `git diff --check` | No whitespace / patch hygiene regressions |
| Shared shell wave | `cd dashboard_rebuild && npm run test -- client/src/components/__tests__/layout.test.tsx` | Shell behavior remains stable while rails/dock/header evolve |
| Shared shell wave | `cd dashboard_rebuild && npm run build` | Frontend compiles into `brain/static/dist/` |
| Flagship route wave | targeted Brain / Scholar / Tutor tests plus live browser smoke | Shared flagship workspace language holds without route regressions |
| Support route wave | build + live browser smoke on Library / Calendar / Mastery / Methods / Vault | Support-page operating model stays consistent across routes |
| Responsive wave | manual checks at mobile, tablet, desktop widths | No horizontal overflow, readable controls, 44x44 targets |
