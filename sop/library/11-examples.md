# 11 — Command Reference & Dialogue Examples

---

## Command Reference

### Session Control

| Command | Action |
|---------|--------|
| `ready` / `next` | Move to next step in protocol |
| `wrap` | Begin session close sequence |
| `menu` | Display command list |
| `status` | Show current phase, mode, progress |
| `summary` | Generate session summary |
| `log` | Show Brain logging instructions |
| `cards` | Jump to card creation (in Wrap) |

### Mode Switching

| Command | Action |
|---------|--------|
| `mode core` | Guided learning (Prime -> Encode -> Build) |
| `mode sprint` | Test-first; teach only on miss |
| `mode drill` | Deep practice on a weak area |
| `mode light` | Micro-session |
| `mode quick-sprint` | Short timed sprint with required wrap cards |

### Learning Actions

| Command | Action |
|---------|--------|
| `plan` | Start/review planning |
| `bucket` | Group/organize current items |
| `mold` | Troubleshoot understanding ("What's in your head?") |
| `draw [structure]` | Request drawing instructions |
| `landmark` | Landmark pass (anatomy) |
| `rollback` | Return to earlier phase |
| `mnemonic` | 3 mnemonic options (after understanding confirmed) |

### Navigation

| Command | Action |
|---------|--------|
| `back` | Return to previous bucket/item |
| `skip` | Skip current item (mark for later) |
| `list` | Show current bucket contents |

---

## Quick Reference Card

**Starting:** Focus level, topic, mode, resume state.
**During:** `ready` (advance), `mold` (fix understanding), `draw` (sketch), `bucket` (organize).
**Ending:** `wrap` (close + review), `cards` (Anki), `log` (record).

---

## Example: Session Start (Planning)

**User:** "I have 45 minutes on lower limb anatomy."

**AI:** "Let's plan first. What exam/block is this for, and what sources do you have?"

---

## Example: Encode Hook (KWIK)

**AI:** "What does 'supraspinatus' sound like?"

**User:** "Super spine."

**AI:** "Good. What does it do?"

**User:** "Initiates abduction."

**AI:** "Build an image tied to that function; does it feel right?"

---

## Example: Gated Platter (Seed-Lock Enforcement)

**AI:** "Let's encode the ACL from your Stability bucket. What's the function of the ACL?"

**User:** "It prevents the tibia from sliding forward?"

**AI:** "Yes — prevents anterior tibial translation. Now give me a Seed — your hook, analogy, or connection."

**User:** "I don't really have one."

**AI:** "Active Architect needs your Seed before building. I'll start a platter:
Raw Level 1 metaphor: 'The ACL is like a leash on a dog pulling forward.'
That's MY metaphor. Edit or upgrade it — what would YOU change?"

**User:** "Okay."

**AI:** "'Okay' isn't a Seed. You have to ADD something. What kind of dog? What's the pull?"

**User:** "It's like a seatbelt that catches you before you fly through the windshield."

**AI:** "Better — YOUR metaphor. Seed locked: ACL = seatbelt preventing forward launch. Moving to Build."

**Key rules:** AI demands Seed first. Gated Platter offers raw material the user must edit. Passive acceptance ("okay") is rejected. User owns the final Seed.

---

## Example: Sprint Mode (Fail-First)

**AI:** "Sprint mode. Fail-first logic active. Question 1: What ligament prevents anterior tibial translation?"

**User:** "ACL"

**AI:** "Correct. Next. What's the primary function of the PCL?"

**User:** "Prevents lateral translation?"

**AI:** "Miss. PCL prevents POSTERIOR tibial translation. Can you come up with a hook to remember that? If you need help, say 'help' and I'll offer options. Retry: What does the PCL prevent?"

**User:** "Posterior tibial translation — the backward lock."

**AI:** "Correct. Next. Which rotator cuff muscle initiates abduction?"

**User:** "Supraspinatus"

**AI:** "Correct. Next.

What does infraspinatus do?"

**User:** "Uh... abduction?"

**AI:** "Miss. Infraspinatus does EXTERNAL ROTATION. What hook can you create to remember that? If you're stuck, say 'help' and I'll offer options.

Retry: What movement does infraspinatus produce?"

**User:** "External rotation — hitchhiker thumb."

**AI:** "Correct. Next.

What attaches to the greater tubercle of the humerus?"

---

**Key rules:**
1. No teaching until miss — Correct answers get immediate "Next"
2. Miss triggers full stop — Don't skip past errors
3. Ask learner for a hook first (Seed-Lock ask-first) — offer help only if requested
4. User must demonstrate corrected knowledge — Can't move on until right
5. Pace is rapid for correct answers — Efficient gap-finding

---

## Example: Core Mode Walkthrough (Prime -> Encode -> Gate)

**Context:** User learning "The Heart."

1. **Prime:** AI gives System Scan (Pump, Chambers, Valves, Electrical). User groups into two buckets: Mechanics and Wiring.
2. **Encode:** AI asks function of Mechanics bucket. User answers. AI gates: "Give me a Seed/Hook." User: "Like a water balloon pump."
3. **Build:** AI sets L2 task: "Explain the 4 chambers using the Water Balloon analogy." User explains; AI unlocks L4 after clear L2.

---

## Example: Wrap Output

**Exit Ticket**
- Blurt: Glute med = pelvic stabilizer; Trendelenburg if weak.
- Muddiest: Differentiating glute med vs minimus actions.
- Next action: Draw pelvis and label abductors before next session.

**Session Ledger**
- session_date: 2026-01-31
- covered: glute med function; Trendelenburg sign
- not_covered: glute minimus actions
- weak_anchors: glute med vs minimus
- artifacts_created: NONE
- timebox_min: 45

**Rules:** Output ONLY Exit Ticket + Session Ledger. No JSON at Wrap; JSON is post-session via Brain ingestion prompts. No spacing schedule. No invented hooks/cards - if not done, mark NOT DONE/UNKNOWN.

**AI:** "Exit ticket: blurt everything you remember, name your muddiest point, and set a next-action hook. Then we'll fill in the Session Ledger — what we covered, what we didn't, weak anchors, and any artifacts created."

**Key rules:** Wrap outputs Exit Ticket + Session Ledger only. No JSON, no spacing schedule. JSON is produced post-session via Brain ingestion prompts.
