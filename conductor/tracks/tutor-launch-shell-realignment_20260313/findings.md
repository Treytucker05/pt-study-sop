# Findings: Tutor Launch / Shell Realignment Cleanup

Date: 2026-03-13

## Recovered product findings

1. Brain is the launch/home surface.
2. `/tutor` is the single project/session shell.
3. Tutor shell modes are `Studio | Tutor | Schedule | Publish`.
4. The old `WIZARD / CHAT / WORKSPACE / ARTIFACTS` framing was transitional and should not remain the active product model.
5. The recovered transcript supports a thin Tutor-local start/resume surface, not a claim that Profile alone owns all setup.

## Current repo drift

1. Active reference docs still describe Tutor as wizard-led.
2. Multiple historical docs still appear current in repo search.
3. `dashboard_rebuild/client/src/pages/tutor.tsx` still uses wizard-era state and `showSetup` toggles.
4. Tests still normalize `TutorWizard` as the active Tutor startup contract.

## Cleanup rule

When a file still describes the old wizard as the current product surface, it must either:

1. be updated to the Brain-launch + `/tutor` shell + start-panel model, or
2. be explicitly marked historical.
