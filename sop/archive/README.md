# SOP Archive

> Canonical PT Study system: CP-MSS v1.0 (`PRIME -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN`).
> This directory is archival reference only. Active SOP source of truth is `sop/library/`.

## What this folder is
Historical SOP material retained for traceability and migration context.

## Current canonical paths
- SOP library: `sop/library/`
- Control plane constitution: `sop/library/17-control-plane.md`
- Runtime artifacts (generated): `sop/runtime/`
- Runtime build tool: `python sop/tools/build_runtime_bundle.py`

## Usage rule
Do not build new behavior from archive files. If archive text conflicts with active docs, follow `sop/library/`.
