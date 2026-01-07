# PT Study SOP - Runtime Canon Index

## What this is
This folder is the Runtime Canon for PT Study SOP: the authoritative, in-use set of prompts, modules, and engines. Use this index to find the right file to load into GPT and to understand the sequence for building a session. If conflicting instructions appear elsewhere in the repo, defer to the files listed here.

## File index
| File | Purpose |
|------|---------|
| ARCHIVE_MASTER_FULL.md | Archived pre-index MASTER.md for historical reference |
| BUILD_ORDER.md | Recommended upload/paste order for the Runtime Canon set |
| MASTER.md | Lightweight index of Runtime Canon materials |
| gpt-instructions.md | CustomGPT system instructions for PT Study SOP (Runtime Canon) |
| runtime-prompt.md | Session start prompt to paste at the beginning of each run |
| PEIRRO.md | Core learning backbone (Prepare -> Encode -> Interrogate -> Retrieve -> Refine -> Overlearn) |
| KWIK.md | Encoding flow for hooks/terms and memory cues |
| H-series.md | Hierarchy frameworks for priming and mapping topics |
| M-series.md | Mechanism frameworks for encoding and causal logic |
| Y-series.md | Generalist question scaffolds for breadth and comparison |
| levels.md | Difficulty tiers and progression cues |
| M0-planning.md | Execution Module M0: planning and source-locking |
| M1-entry.md | Execution Module M1: entry checks and mode selection |
| M2-prime.md | Execution Module M2: priming and mapping |
| M3-encode.md | Execution Module M3: encoding within selected buckets |
| M4-build.md | Execution Module M4: construct builds and syntheses |
| M5-modes.md | Execution Module M5: operating modes and modifiers |
| M6-wrap.md | Execution Module M6: wrapping, reflection, and next steps |
| anatomy-engine.md | Anatomy-specific engine integrated with Execution Modules |
| concept-engine.md | Concept engine for non-anatomy topics |
| notebooklm-bridge.md | NotebookLM source packet rules and prompt template |
| brain-session-log-template.md | Canonical Brain session log template (ingestor compatible) |

## How to use
- Paste `gpt-instructions.md` into your CustomGPT system instructions.
- Paste `runtime-prompt.md` at the start of each session.
- When factual teaching is needed, paste a NotebookLM Source Packet (see `notebooklm-bridge.md`) to satisfy Source-Lock.
- Follow Execution Modules M0-M6 in order, adding `anatomy-engine.md` when studying anatomy.
- Use PEIRRO as the backbone for the learning cycle and KWIK as the encoding flow for hooks/terms.

## Source of truth
- Runtime Canon = `sop/gpt-knowledge/`.
- Release snapshots are frozen copies.
- If conflict: Runtime Canon wins.
