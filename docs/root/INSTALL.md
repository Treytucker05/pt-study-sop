# Install PT Study OS On A New Computer

This guide is the product-style setup path for installing the PT Study OS on a new machine.

Use it when setting up a fresh Windows laptop, MacBook, or another development machine. The app is local-first: GitHub syncs the operating system code, while secrets, the SQLite database, uploaded materials, vector caches, and Obsidian notes are handled separately.

## Supported Machines

| OS | Status | Launcher | Default URL |
|---|---|---|---|
| Windows 11 | Primary supported operator setup | `Start_Dashboard.bat` | `http://127.0.0.1:5000/brain` |
| macOS Apple Silicon | Supported local install | `Start_Dashboard.command` | `http://127.0.0.1:5127/brain` |
| Linux | Not productized yet | manual commands only | configure `PT_BRAIN_PORT` |

macOS uses port `5127` by default because modern macOS often has Control Center bound to port `5000`.

## What GitHub Syncs

GitHub syncs the PT Study OS itself:

- backend source in `brain/`
- frontend source in `dashboard_rebuild/`
- SOP/method files in `sop/`
- scripts and launchers
- docs and tests

GitHub does not sync local runtime data:

- `brain/.env`
- `brain/data/pt_study.db`
- `brain/data/api_config.json`
- `brain/data/gcal_token.json`
- `brain/data/uploads/`
- `brain/data/chroma_tutor/`
- `brain/data/extracted_images/`
- `brain/static/dist/`
- `.venv/`
- `node_modules/`

For a new semester, you usually do not need old upload/cache folders. Keep or transfer `brain/data/pt_study.db` only if you want existing courses, methods, sessions, cards, or settings.

## Machine-Local Path Checklist

Before testing on a new computer, confirm these local roots are real on that machine:

| Setting | Required for | macOS example |
|---|---|---|
| `OBSIDIAN_VAULT_FS_PATH` | Obsidian reads/writes | `/Users/fst/Desktop/Treys School/Treys School` |
| `PT_OBSIDIAN_VAULT_PATH` | Obsidian helper alias | `/Users/fst/Desktop/Treys School/Treys School` |
| `OBSIDIAN_VAULT_NAME` | `obsidian://` links | `Treys School` |
| `PT_STUDY_RAG_DIR` | Library folder scan and material sync | `/Users/fst/Library/CloudStorage/OneDrive-Personal/Desktop/PT School` |
| `TUTOR_MATERIALS_DIR` / `PT_SCHOOL_MATERIALS_DIR` | Optional material sync aliases | `/Users/fst/Library/CloudStorage/OneDrive-Personal/Desktop/PT School` |
| `PT_BRAIN_PORT` | Dashboard URL and OAuth callbacks | `5127` |
| `GOOGLE_REDIRECT_URI` or `PT_GCAL_REDIRECT_URI` | Google Calendar OAuth | `http://localhost:5127/api/gcal/oauth/callback` |

Full path inventory: `docs/root/MACHINE_PATHS.md`.

You do not need to rewrite every path in the repo. Most app paths are repo-relative or env-driven. You do need to update copied local config and any old database rows or material records that point at Windows-only files.

## Prerequisites

Install these before setup:

- Git
- Python 3.12 or newer
- Node.js with npm
- Obsidian, if you want vault write/read integration

Optional integrations:

- Gemini or OpenAI API key for embeddings/model features
- Google Calendar OAuth credentials
- Anki with AnkiConnect
- Tailscale/SSH for machine-to-machine transfer
- Codex/Gemini CLI if using those provider paths

## Fresh Install From GitHub

### Windows

```powershell
cd C:\
git clone https://github.com/Treytucker05/pt-study-sop.git
cd C:\pt-study-sop
copy brain\.env.example brain\.env
```

Install Python with the Python launcher or with `python` on `PATH`, and install Node/npm before first launch. The Windows launcher builds the UI, so Node/npm is required even if you are not editing frontend code.

Edit `brain\.env`, then run:

```powershell
.\Start_Dashboard.bat
```

Open:

```text
http://127.0.0.1:5000/brain
```

### macOS

```bash
cd ~
git clone https://github.com/Treytucker05/pt-study-sop.git
cd ~/pt-study-sop
cp brain/.env.example brain/.env
chmod +x Start_Dashboard.command scripts/start_dashboard_macos.sh
```

Edit `brain/.env`, then run:

```bash
./Start_Dashboard.command
```

Open:

```text
http://127.0.0.1:5127/brain
```

If Python 3.12 is missing on macOS:

```bash
brew install python@3.12
```

If Node/npm is missing on macOS:

```bash
brew install node
```

The first macOS launch creates `.venv`, installs Python dependencies, installs npm dependencies, builds the UI, and initializes the database. It needs network access and can take a few minutes.

## First-Run Configuration

Create `brain/.env` from `brain/.env.example` and fill only what you need.

Core values:

```dotenv
GEMINI_API_KEY=
GOOGLE_API_KEY=
OPENAI_API_KEY=
TUTOR_RAG_EMBEDDING_PROVIDER=gemini
TUTOR_RAG_GEMINI_EMBEDDING_MODEL=gemini-embedding-2-preview
```

Obsidian integration:

```dotenv
OBSIDIAN_API_KEY=
OBSIDIAN_API_URL=http://127.0.0.1:27123
OBSIDIAN_VAULT_FS_PATH=/Users/you/Desktop/Treys School/Treys School
PT_OBSIDIAN_VAULT_PATH=/Users/you/Desktop/Treys School/Treys School
OBSIDIAN_VAULT_NAME=Treys School
```

Study material import root:

```dotenv
PT_STUDY_RAG_DIR=/Users/you/Desktop/PT School
TUTOR_MATERIALS_DIR=/Users/you/Desktop/PT School
PT_SCHOOL_MATERIALS_DIR=/Users/you/Desktop/PT School
PT_BRAIN_PREFER_ENV_PATHS=true
```

Runtime overrides:

```dotenv
PT_BRAIN_HOST=127.0.0.1
PT_BRAIN_PORT=5127
PT_GCAL_REDIRECT_URI=http://localhost:5127/api/gcal/oauth/callback
```

On Windows, vault/material examples usually look like:

```dotenv
OBSIDIAN_VAULT_FS_PATH=C:\Users\treyt\Desktop\Treys School
PT_STUDY_RAG_DIR=C:\Users\treyt\OneDrive\Desktop\PT School
PT_BRAIN_PORT=5000
PT_GCAL_REDIRECT_URI=http://localhost:5000/api/gcal/oauth/callback
```

On macOS, vault/material examples usually look like:

```dotenv
OBSIDIAN_VAULT_FS_PATH=/Users/fst/Desktop/Treys School/Treys School
PT_STUDY_RAG_DIR=/Users/fst/Library/CloudStorage/OneDrive-Personal/Desktop/PT School
PT_BRAIN_PORT=5127
PT_GCAL_REDIRECT_URI=http://localhost:5127/api/gcal/oauth/callback
```

The launcher guesses Trey-style Mac folders only as a convenience. If the vault or material folder lives somewhere else, set the paths explicitly in `brain/.env`.

## Transfer From An Existing Computer

Use GitHub for the code first:

```bash
git clone https://github.com/Treytucker05/pt-study-sop.git
```

Then transfer only the local runtime files you actually need.

Minimum useful transfer:

- `brain/.env`
- `brain/data/pt_study.db`
- `brain/data/api_config.json`
- `brain/data/gcal_token.json` if using Google Calendar
- `brain/data/vault_courses.yaml` if customized
- `brain/data/uploads/` only if old uploaded-file previews must work

Do not transfer:

- `.venv/`
- `node_modules/`
- `brain/static/dist/`
- `brain/data/chroma_tutor/` unless you specifically want to avoid rebuilding vectors
- `brain/data/extracted_images/` unless old source-image extraction matters

Windows has a helper for bundling small local runtime files:

```powershell
cd C:\pt-study-sop
powershell -ExecutionPolicy Bypass -File .\scripts\bundle_local_data.ps1
```

Send the bundle over SSH:

```powershell
scp .\local_data_bundle.zip user@mac-host:/Users/user/Downloads/
```

On macOS:

```bash
cd ~/pt-study-sop
unzip -o ~/Downloads/local_data_bundle.zip -d /tmp/pt-study-local-data
cp -R /tmp/pt-study-local-data/local_data_bundle/* .
```

After transfer, edit `brain/.env` and replace Windows paths with macOS paths.

Also check copied local config:

- If `brain/data/api_config.json` contains a Windows `study_rag_path`, set `PT_BRAIN_PREFER_ENV_PATHS=true` or remove that saved path.
- If Google Calendar was configured on Windows, change the redirect URI to the Mac port or set `PT_GCAL_REDIRECT_URI=http://localhost:5127/api/gcal/oauth/callback`.
- If copied DB rows contain Windows `rag_docs.source_path` or `rag_docs.file_path` values, copy the matching source/upload files or re-import the materials on the Mac.

## New Semester Setup

For a new semester, do not copy old caches unless you need them.

Recommended flow:

1. Install the app from GitHub.
2. Configure `brain/.env`.
3. Confirm Obsidian Sync has pulled the current vault on the new machine.
4. Confirm the current semester material folder is available at `/Users/fst/Library/CloudStorage/OneDrive-Personal/Desktop/PT School`.
5. Start the dashboard.
6. Open `/library`.
7. Add or import current semester materials.
8. Open `/tutor`.
9. Choose the current course/material scope and start a Tutor session.
10. Let the app rebuild retrieval/index data as needed.

Old `session_logs`, vector caches, extracted images, and uploaded files are optional for this flow.

## Daily Two-Machine Workflow

GitHub does not live-sync the repo. Pull before working and push after code/doc changes.

Before working on either computer:

```bash
git pull
```

After intentional repo changes:

```bash
git status
git add <changed-files>
git commit -m "short message"
git push
```

Then on the other computer:

```bash
git pull
```

Obsidian notes sync through Obsidian Sync. Runtime DB/cache files do not sync unless you explicitly copy them.

## Verification

Windows:

```powershell
.\Start_Dashboard.bat
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5000/api/brain/status
```

macOS:

```bash
./Start_Dashboard.command
curl http://127.0.0.1:5127/api/brain/status
```

Expected response:

```json
{"ok":true}
```

The exact stats payload can vary by machine and database.

## Troubleshooting

- If macOS fails with Python syntax/type errors, you are probably using Apple Python 3.9. Install Python 3.12 and rerun `./Start_Dashboard.command`.
- If macOS says port `5000` is busy, use the default Mac launcher on `5127` or set `PT_BRAIN_PORT=5128`.
- If the page loads but routes 404, rebuild the UI: `cd dashboard_rebuild && npm run build`.
- If Obsidian writes fail, verify `OBSIDIAN_VAULT_FS_PATH`, `PT_OBSIDIAN_VAULT_PATH`, `OBSIDIAN_API_URL`, and the Obsidian Local REST API plugin.
- If Library has no materials on a new semester install, that is expected. Import the current semester files fresh.
- If Library folder scan fails on macOS, verify `/Users/fst/Library/CloudStorage/OneDrive-Personal/Desktop/PT School` exists or paste the actual local material folder path.
- If Google Calendar auth redirects to port `5000` on macOS, update `PT_GCAL_REDIRECT_URI` or `brain/data/api_config.json` to use port `5127`.
