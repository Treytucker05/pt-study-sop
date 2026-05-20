# Machine-Local Paths And Data

Top-level repo truth: `README.md`.

This is the checklist for moving PT Study OS to a new computer. GitHub syncs code and docs. It does not sync local paths, secrets, databases, source material folders, or generated caches.

## Required On Each Computer

| Item | Purpose | Windows example | macOS example |
|---|---|---|---|
| Repo checkout | App code | `C:\pt-study-sop` | `/Users/fst/pt-study-sop` |
| `brain/.env` | Local secrets and paths | `C:\pt-study-sop\brain\.env` | `/Users/fst/pt-study-sop/brain/.env` |
| `OBSIDIAN_VAULT_FS_PATH` | Filesystem vault root for direct reads/writes | `C:\Users\treyt\Desktop\Treys School` | `/Users/fst/Desktop/Treys School/Treys School` |
| `PT_OBSIDIAN_VAULT_PATH` | Alias for the same vault root | same as above | same as above |
| `OBSIDIAN_VAULT_NAME` | Vault name for `obsidian://` links | `Treys School` | `Treys School` or the actual Mac vault name |
| `PT_STUDY_RAG_DIR` | Source material folder scanned from Library | `C:\Users\treyt\OneDrive\Desktop\PT School` | `/Users/fst/Library/CloudStorage/OneDrive-Personal/Desktop/PT School` |
| `TUTOR_MATERIALS_DIR` / `PT_SCHOOL_MATERIALS_DIR` | Optional aliases for material sync flows | same PT School folder | same PT School folder |
| `PT_BRAIN_PORT` | Local dashboard port | `5000` | `5127` |
| Google OAuth redirect | Calendar callback URI must match the local port | `http://localhost:5000/api/gcal/oauth/callback` | `http://localhost:5127/api/gcal/oauth/callback` |

Set these in `brain/.env`. For Google Calendar, either set `GOOGLE_REDIRECT_URI` or `PT_GCAL_REDIRECT_URI`.

## Local Runtime Files

| Path | GitHub syncs it? | Transfer to a new machine? | Notes |
|---|---:|---:|---|
| `brain/.env` | No | Yes | Required for local paths and API keys. Edit paths after transfer. |
| `brain/data/pt_study.db` | No | Optional | Transfer if you want old courses, sessions, cards, and material records. For a clean semester, you can start fresh. |
| `brain/data/api_config.json` | No | Optional | Contains local provider/calendar settings. Check copied paths and redirect URI. |
| `brain/data/gcal_token.json` | No | Optional | Transfer only if keeping Google Calendar auth. Re-auth if it fails. |
| `brain/data/vault_courses.yaml` | Yes if tracked, but local copies may differ | Optional | Transfer if you customized course-to-vault folder mappings. |
| `brain/data/uploads/` | No | Optional | Needed only for old uploaded materials referenced by `rag_docs.file_path`. |
| `brain/data/chroma_tutor/` | No | No for new semester | Vector cache. Rebuild instead of transferring unless you need speed. |
| `brain/data/extracted_images/` | No | Optional | Needed only if old extracted source images matter. |
| `brain/data/video_ingest/` | No | Optional | Needed only for old video processing artifacts. |
| `brain/static/dist/` | No | No | Build output. Rebuilt by launchers. |
| `.venv/` | No | No | Recreated by the launcher. |
| `dashboard_rebuild/node_modules/` | No | No | Recreated by `npm install`. |

## Do You Need To Change All File Paths?

No. The codebase mostly uses repo-relative paths or environment variables.

You do need to set the machine-local roots in `brain/.env` and deal with any old database rows that point at Windows files. A copied Windows database can contain rows like:

- `rag_docs.source_path = C:\Users\treyt\OneDrive\Desktop\PT School\...`
- `rag_docs.file_path = C:\pt-study-sop\brain\data\uploads\...`

On macOS, those paths do not exist unless the source files were copied and the material records are re-imported or remapped. For a new semester, the clean path is to import current materials fresh from `/library`.

For testing old materials on macOS:

1. Use the OneDrive-backed `PT School` source folder at `/Users/fst/Library/CloudStorage/OneDrive-Personal/Desktop/PT School`.
2. Set `PT_STUDY_RAG_DIR=/Users/fst/Library/CloudStorage/OneDrive-Personal/Desktop/PT School`.
3. Set `TUTOR_MATERIALS_DIR=/Users/fst/Library/CloudStorage/OneDrive-Personal/Desktop/PT School`.
4. Set `PT_SCHOOL_MATERIALS_DIR=/Users/fst/Library/CloudStorage/OneDrive-Personal/Desktop/PT School`.
5. Copy `brain/data/uploads/` only if old uploaded-file previews matter.
6. Start the dashboard and re-scan or re-import selected current materials from `/library`.

## Config Precedence To Watch

`brain/config.py` can read the study material root from `brain/data/api_config.json` before `PT_STUDY_RAG_DIR`. After moving machines, set:

```dotenv
PT_BRAIN_PREFER_ENV_PATHS=true
```

This makes the machine-local `.env` path win over any copied `api_config.json` path.

## Current Trey MacBook Setup

Verified Mac repo path:

```text
/Users/fst/pt-study-sop
```

Verified Mac Obsidian vault path:

```text
/Users/fst/Desktop/Treys School/Treys School
```

Required Mac material root for old/current PT School source files:

```text
/Users/fst/Library/CloudStorage/OneDrive-Personal/Desktop/PT School
```

The Mac dashboard default is:

```text
http://127.0.0.1:5127/brain
```

## Related Docs

- New computer install: `docs/root/INSTALL.md`
- Developer guide: `docs/root/GUIDE_DEV.md`
- Runtime architecture: `docs/root/PROJECT_ARCHITECTURE.md`
