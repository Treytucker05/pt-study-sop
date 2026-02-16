$prompt = @'
[TASK CONTEXT]
You are doing a read-only exploration of C:\pt-study-sop to map course-linking APIs, shared types, and existing UI for selecting a real course before implementing a Library button.

[OBJECTIVES]
1. Analyze `dashboard_rebuild/client/src/lib/api.ts` to list every endpoint or client helper used for course data or linking, including HTTP method, path, query/body params, and response shape.
2. Catalog course configuration sources (configs, constants, types) that define course IDs/names, especially under `dashboard_rebuild/client/src/config`, and note how types alias the course metadata.
3. Identify UI components/pages that render a course picker/selector, describe how they handle selection, and note any Library button or similar action existing today.
4. Produce an implementation recommendation for the Library button that references the precise endpoint(s)/types to call when a user selects a course.

[CONSTRAINTS]
- Focus on the React frontend files in `dashboard_rebuild/client/src/` and relevant API adapters in `brain/` as supporting context.
- Do not invent endpoints; only report names found in the repo.
- Keep the exploration read-only; no code changes.

[OUTPUT FORMAT]
Return structured notes with these sections:
1. `courseEndpoints`: bullet each endpoint with `name`, `method`, `path`, `params`, `responseType`.
2. `courseTypes`: bullet each type/constant describing courses with `typeName`, `location`, `purpose`.
3. `uiPatterns`: bullet each UI pattern/component showing how users pick/confirm a course, library button analogs, and data flow (include relevant props/state).
4. `libraryButtonProposal`: describe how to wire a Library button to the identified endpoint(s) and UI flow (include exact request payload and where to add it).

[SUCCESS CRITERIA]
Complete when you have documented at least one API endpoint, one course config/type, a UI picker pattern, and a Library button integration path in the requested format.
'@

codex exec --dangerously-bypass-approvals-and-sandbox --skip-git-repo-check -m gpt-5.3-codex -c "model_reasoning_effort=\"xhigh\"" -o subagent_course.txt "$prompt"
