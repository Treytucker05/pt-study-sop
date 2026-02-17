# Tutor E2E QA Report
Date: 2026-02-16

**Tester:** Playwright E2E (observation only — no source files modified)
**Server:** http://localhost:5000/tutor
**Sessions tested:** 3 full sessions across AUTO and PRE-BUILT chain modes

---

## Summary

| Flow | Status | Notes |
|------|--------|-------|
| Flow 1: Wizard initial load | ✅ PASS | Wizard loads, courses listed, NEXT button present |
| Flow 2: Wizard step navigation | ✅ PASS | Steps advance correctly, BACK/NEXT work |
| Flow 3: Start session | ✅ PASS | Chat view appears immediately, no loading errors |
| Flow 4: Send a message + response | ✅ PASS | Response received fast, correct chain context |
| Flow 5: Chain progress sidebar | ⚠️ PARTIAL | AUTO=no chain (correct); PRE-BUILT=chain blocks visible BUT block guidance shows raw system prompt with MISSING placeholders |
| Flow 6: Session end | ⚠️ PARTIAL | END SESSION dialog shows, SHIP TO BRAIN works (Obsidian written), but no toast confirmation; "0 turns" bug throughout |
| Flow 7: Session restore | ✅ PASS | Chat view correctly restored after page reload |

---

## Flow 1: Wizard Initial Load
**Status: ✅ PASS**

- Wizard loads in ~3s with all content ✅
- Course dropdown populated with 5 active courses ✅
  - PHYT 6220 — Evidence Based Practice (30 docs)
  - PHYT 6216 — Exercise Physiology (40 docs)
  - PHYT 6443 — Hybrid Therapeutic Interventions (28 docs)
  - PHYT 6314 — Movement Science 1 (59 docs)
  - PHYT 6313 — Neuroscience (24 docs)
- Step 1 (COURSE) active ✅
- Steps 2 (CHAIN) and 3 (START) correctly disabled ✅
- NEXT button present ✅
- TOPIC textbox present ✅
- STUDY MATERIALS file picker present with 30 docs listed + "Other materials (159)" group ✅
- RECENT sessions listed in sidebar (5 shown) ✅
- **Screenshot:** `flow1-wizard-initial.png`

---

## Flow 2: Wizard Step Navigation
**Status: ✅ PASS**

**Step 1 → Step 2 (Chain Selection):**
- NEXT click advances to chain selection screen ✅
- Step 2 (CHAIN) becomes active ✅
- Three chain modes shown: PRE-BUILT, CUSTOM, AUTO ✅
- AUTO mode selected by default showing "No structured chain" description ✅
- BACK button appears ✅
- NEXT button active (no blocking validation for chain step) ✅
- **Screenshot:** `flow2-wizard-step1-chain.png`

**Step 2 → Step 3 (Start Confirmation):**
- NEXT click advances to session summary screen ✅
- Step 3 (START) becomes active ✅
- SESSION SUMMARY shows: Course, Topic (not set), Materials (None selected), Chain (Auto) ✅
- STUDY MODE options: LEARN, REVIEW, QUICK, LIGHT, FIX ✅
- ENGINE dropdown: Codex (default), Trinity Large, Qwen3 Coder Next, Gemini 2.5 Flash Lite ✅
- Enable web search checkbox ✅
- START SESSION button prominent ✅
- **Screenshot:** `flow2-wizard-step2-start.png`

---

## Flow 3: Start a Session
**Status: ✅ PASS**

- START SESSION click transitions to chat view immediately (no loading spinner observed) ✅
- Chat input box appears with placeholder "Ask a question..." ✅
- Chat input focused/active on load ✅
- Send button present (disabled until text typed) ✅
- FOCUS and TOOLS buttons in toolbar ✅
- Right sidebar loads with: Core/No topic label, message counter (0), session time, SETTINGS, ARTIFACTS, END SESSION buttons ✅
- COMMANDS section visible: /note, /card, /map ✅
- Zero console errors throughout ✅
- API: `POST /api/tutor/session => 201` ✅
- **Screenshot:** `flow3-chat-view.png`

---

## Flow 4: Send a Message
**Status: ✅ PASS (with bug noted)**

- Typed "What is the knee joint?" in chat input
- Send button activated on text input ✅
- Pressed Enter/clicked send — response received in <2s ✅
- Response was relevant, structured, included:
  - Anatomy overview (bones: femur, tibia, patella)
  - Function description
  - Key stabilizers (menisci, ACL, PCL, MCL, LCL)
  - Clinical application example (ACL tear)
  - Self-check question for encoding ✅
- Model attribution shown: `gpt-5.1-2025-11-13` ✅
- Post-response action buttons: "Save Note", "Create Card", "Create Map" ✅
- Chat input cleared and ready for next message ✅
- API: `POST /api/tutor/session/{id}/turn => 200` ✅

**⚠️ Bug: Double /turn POST per message**
- Every single message sent 2 identical POST requests to `/turn` endpoint
- Confirmed in sessions 1 and 3 (both AUTO and PRE-BUILT modes)
- Both return 200 OK
- Risk: duplicate turn records in DB, potential duplicate AI response context

- **Screenshot:** `flow4-message-response.png`

---

## Flow 5: Chain Progress Sidebar
**Status: ⚠️ PARTIAL**

### AUTO Mode (expected — no chain blocks):
- Sidebar shows "Core / No topic" label ✅
- No chain block list (correct — AUTO has no block-by-block guidance) ✅
- COMMANDS section with /note, /card, /map shortcuts ✅
- No "NEXT MODULE" button (correct for AUTO) ✅
- **Screenshot:** `flow5-sidebar.png`

### PRE-BUILT Mode (Exam Prep, 5 blocks):
- Chain block list shows in sidebar: MODULES 1/5 ✅
- All 5 blocks listed with numbers ✅:
  1. Prediction Questions
  2. Mixed Practice
  3. Side-by-Side Comparison
  4. Error Autopsy
  5. Anki Card Draft
- "NEXT MODULE" button present and functional ✅
- NEXT MODULE advances to 2/5, adds checkmark to block 1 ✅
- Timer appears after NEXT MODULE: countdown from ~10:00 with +5M and CLEAR buttons ✅
- Block guidance updates to new block on advance ✅
- Chain context injected into AI response (response referenced "Mixed Practice" block correctly) ✅
- **Screenshots:** `flow5-chain-sidebar-prebuilt.png`, `flow5b-next-module-advance.png`

**❌ Bug: BLOCK GUIDANCE renders raw system prompt with MISSING placeholders**
- BLOCK GUIDANCE panel shows the full raw markdown of the chain block's system prompt
- Includes numbered list (1-40) of all system prompt steps
- Contains unfilled template variables:
  - Item 18 shows literally: `MISSING` (Gating Rules section)
  - Item 32/40 shows literally: `artifact_type: MISSING`
- This appears to be intentional raw system prompt display, but the `MISSING` placeholders indicate incomplete chain block definitions
- The raw numbered list format makes it hard to read as user-facing guidance

---

## Flow 6: Session End
**Status: ⚠️ PARTIAL**

**End session dialog:**
- END SESSION button triggers confirmation overlay ✅
- "SESSION COMPLETE" header shown ✅
- "SHIP TO BRAIN" button present ✅
- "END WITHOUT SAVING" button present ✅
- "CANCEL" button present ✅
- **Screenshot:** `flow6-end-session-dialog.png`

**SHIP TO BRAIN:**
- Click triggers `POST /api/obsidian/append => 200` ✅ (Obsidian is actually written!)
- Page returns to wizard after SHIP TO BRAIN ✅
- **⚠️ Bug: No visual toast/confirmation after SHIP TO BRAIN** — page silently returns to wizard with no notification that data was saved. AGENTS.md explicitly requires visual feedback for persist actions.

**END WITHOUT SAVING:**
- Works correctly, returns to wizard ✅
- Wizard returns at step 3 (SESSION SUMMARY screen) with all steps unlocked (not reset to step 1) ✅ — appears intentional for quick restart
- **Screenshot:** `flow6-after-end-wizard-restored.png`

**❌ Bug: Turn counter always shows "0"**
- Sidebar message counter: shows "0" throughout every session, never increments
- End session dialog shows "0 turns" even after verified message exchanges
- Confirmed in all 3 sessions tested
- Network logs confirm turns ARE being saved (`POST /turn => 200`) so backend is fine
- Frontend is not reflecting the turn count from the response or local state

---

## Flow 7: Session Restore
**Status: ✅ PASS**

- Started new session (session 2)
- Performed hard page reload (`window.location.reload()`)
- After reload (3s wait):
  - Chat view restored immediately (NOT the wizard) ✅
  - Session state persisted correctly ✅
  - API: `GET /api/tutor/session/{id} => 200` triggered on reload ✅
- **Screenshot:** `flow7-session-restored.png`

---

## Additional Findings (Network Analysis)

### ⚠️ 3 unexpected POST /api/notes at page load
- On every page load, 3 `POST /api/notes => 201` requests fire immediately
- No user interaction required — these are automatic
- Each is followed by `GET /api/notes`
- Could be initialization behavior or stale React effect running on mount
- Low risk but worth investigating for unnecessary writes

### All API endpoints healthy
Every API call returned 200/201 throughout the entire test. Backend is solid.

---

## Bug Summary (Priority Order)

| # | Severity | Bug | Evidence |
|---|----------|-----|----------|
| 1 | 🔴 HIGH | **Double /turn POST per message** — every message fires 2 API calls | Network log: 2× `POST /turn` for each exchange |
| 2 | 🔴 HIGH | **Turn counter never increments** — always shows "0" in sidebar and end-session dialog | All sessions showed 0; turns confirmed saved in backend |
| 3 | 🟡 MED | **No SHIP TO BRAIN toast notification** — action succeeds silently | `POST /api/obsidian/append 200` fires but no UI feedback |
| 4 | 🟡 MED | **BLOCK GUIDANCE shows raw system prompt with "MISSING" placeholders** — `artifact_type: MISSING` and `Gating Rules: MISSING` in chain block definitions | Visible in sidebar for all PRE-BUILT blocks tested |
| 5 | 🟢 LOW | **3 POST /api/notes on page load** — auto-fires without user interaction | Network log |

---

## What's Working Well

- Full wizard flow (3-step) ✅
- Course + study material loading ✅
- AI response quality and speed ✅
- PRE-BUILT chain template selection (14 templates) ✅
- Chain block advancement (NEXT MODULE) + timer ✅
- Session persistence across page reload ✅
- SHIP TO BRAIN writes to Obsidian (backend) ✅
- All 5 study modes selectable ✅
- 4 AI engine options ✅
- Zero JS console errors ✅
- Zero 4xx/5xx API errors ✅

---

## Screenshots Index

| File | Description |
|------|-------------|
| `flow1-wizard-initial.png` | Step 1 — course selection wizard |
| `flow2-wizard-step1-chain.png` | Step 2 — chain type selection |
| `flow2-wizard-step2-start.png` | Step 3 — session summary + start |
| `flow3-chat-view.png` | Chat view after session start |
| `flow4-message-response.png` | AI response to "What is the knee joint?" |
| `flow5-sidebar.png` | Sidebar in AUTO mode (no chain blocks) |
| `flow5-chain-sidebar-prebuilt.png` | Sidebar in PRE-BUILT mode with 5 chain blocks |
| `flow5b-next-module-advance.png` | After NEXT MODULE — block 1 checked, timer running |
| `flow6-end-session-dialog.png` | End session confirmation dialog |
| `flow6-after-end-wizard-restored.png` | Wizard after END WITHOUT SAVING |
| `flow7-session-restored.png` | Session restored after page reload |
