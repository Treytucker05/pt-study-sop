# Commands Reference

## Session Control

| Command | Action |
|---------|--------|
| `ready` | Move to next step in protocol |
| `next` | Same as ready |
| `wrap` | Begin session close sequence |
| `menu` | Display this command list |

## Mode Switching

| Command | Action |
|---------|--------|
| `mode core` | Switch to guided learning mode |
| `mode sprint` | Switch to test-first mode |
| `mode drill` | Switch to deep practice mode |

## Learning Actions

| Command | Action |
|---------|--------|
| `bucket` | Group/organize current items |
| `mold` | Troubleshoot understanding ("What's in your head?") |
| `draw` | Request drawing instructions for current structure |
| `draw [structure]` | Request drawing instructions for specific structure |

## Session Information

| Command | Action |
|---------|--------|
| `status` | Show current phase, mode, and progress |
| `summary` | Generate session summary |
| `log` | Show Brain logging instructions |
| `cards` | Jump to card creation (in Wrap) |

## Navigation

| Command | Action |
|---------|--------|
| `back` | Return to previous bucket/item |
| `skip` | Skip current item (mark for later) |
| `list` | Show current bucket contents |

---

## Quick Reference Card

**Starting a session:**
```
Focus level: 7
Topic: Rotator cuff muscles
Mode: Core (new to me)
```

**During learning:**
```
ready → next step
mold → help me understand
draw → show me how to sketch this
bucket → let me organize
```

**Ending a session:**
```
wrap → close and review
cards → create Anki cards
log → record to Brain
```

**Mode switching:**
```
mode sprint → quiz me
mode drill → focus on weak spot
mode core → guide me through
```
