# Start Project

Single entrypoint for any agent or human starting a new session.

1. Read conductor state:
   - `conductor/tracks.md` — active tracks and status
   - `conductor/tracks/<active-trackId>/plan.md` — current task queue

2. Check recent changes:
   - `conductor/tracks/GENERAL/log.md` (last 5-10 lines)

3. Pick the next unchecked item in the active track plan.

4. Before editing, plan in the active track's plan.md or index.md.

5. After work, update:
   - Active track plan.md (task status + commit SHA)
   - conductor/tracks.md (if track status changed)
   - conductor/tracks/GENERAL/log.md (if change is outside a track)
