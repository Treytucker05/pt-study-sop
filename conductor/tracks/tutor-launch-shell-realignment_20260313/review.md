# Review Notes: Tutor Launch / Shell Realignment Cleanup

## Independent review summary

1. Transcript review confirmed:
  - Brain launch is locked
  - `/tutor` shell modes are locked
  - the old wizard framing was transitional
  - the transcript does not justify claiming Profile alone should own all setup

2. Docs/track review confirmed:
  - active references still describe wizard-led Tutor
  - several older audits/architecture docs must be marked historical
  - stale open-question artifacts still read as unresolved

3. Frontend review confirmed:
  - launch precedence is still inconsistent
  - wizard-era localStorage and `showSetup` are the main drift source
  - tests should replace wizard assumptions rather than merely append new coverage

4. Validation review confirmed:
  - the cleanup can reuse the existing backend shell/session gates
  - frontend coverage needs a new `TutorStartPanel` surface plus explicit precedence tests
