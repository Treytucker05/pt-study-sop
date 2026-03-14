# Track: Top-Down Tutor Hardening

**ID:** topdown-tutor-hardening_20260307
**Status:** Complete

## Documents

- [Specification](./spec.md)
- [Implementation Plan](./plan.md)

## Scope

- Make top-down tutoring the first-class runtime standard.
- Keep the Tutor chain-agnostic overall.
- Harden confidence/provenance behavior without freezing natural teaching.

## Current Progress

- Core tutor rules now stay additive even when custom instructions are configured.
- Chain runtime profiles, gates, recovery routes, and tier exits are injected into the runtime prompt.
- Top-down weak method cards were hardened, including explanation-first/provenance rules for concept mapping.
- Tutor replies now show qualitative provenance plus qualitative confidence labels, while keeping the existing citation/debug footer.
- Targeted backend/frontend validation and production build are green.
- Week 7 live comparison rerun completed on `2026-03-13` against `C-TRY-001` and `C-TRY-002`; the chains now show intentionally different post-PRIME progression under the same Week 7 scope.

## Quick Links

- [Back to Tracks](../../tracks.md)
- [Product Context](../../product.md)
